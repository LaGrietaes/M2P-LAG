"""ExtractionService — FFmpeg segment extraction (§07, §09, §10).

Pipeline (§09):
  URL → Metadata → Download source → FFmpeg extract → Deliver → Cleanup

Quota model (spec §3):
  - Guests: free 20-second clip extraction (GUEST_MAX_CLIP_SECONDS), unchanged.
    Additionally, one free unlimited full-source download per guest_token via
    GuestService, standard quality only.
  - Registered users: no duration/size cap. Gated by B1T$ balance via
    CreditService — InsufficientCreditsError propagates as ExtractionError.
"""

import logging
import subprocess
from pathlib import Path
import yt_dlp

from config import settings
from security.url_guard import validate_url
from services.storage_service import StorageService
from services.credit_service import CreditService, InsufficientCreditsError
from services.guest_service import GuestService

log = logging.getLogger("m2p.extraction")


class ExtractionError(Exception):
    """Raised when extraction fails (§28 — human-readable)."""


class ExtractionService:
    """Handles media download and FFmpeg segment extraction."""

    def __init__(self):
        self.storage = StorageService()
        self.credits = CreditService()
        self.guests = GuestService()
        self.ytdlp_path = settings.YTDLP_PATH
        self.ffmpeg_path = settings.FFMPEG_PATH

    def extract_clip(
        self,
        url: str,
        start: float,
        end: float,
        session,
        operation: str = "clip",
    ) -> str:
        """Extract a media segment and return the output file ID.

        Args:
            url: Media URL to extract from.
            start: Start time in seconds.
            end: End time in seconds.
            session: auth_service.Session for the requester.
            operation: credit operation type ("clip", "transcript", "hevc_encode").

        Raises:
            ExtractionError: if validation, quota, or extraction fails.
        """
        error = validate_url(url, allow_private=settings.ALLOW_PRIVATE_ADDRESSES)
        if error:
            raise ExtractionError(error)

        duration = end - start
        if duration <= 0:
            raise ExtractionError(
                "Invalid segment: end time must be after start time."
            )

        if session.role == "guest":
            max_seconds = settings.GUEST_MAX_CLIP_SECONDS
            if duration > max_seconds:
                raise ExtractionError(
                    f"Guest extraction limit is {max_seconds} seconds. "
                    f"Your selection is {duration:.1f} seconds."
                )
        else:
            try:
                self.credits.charge(session, operation, duration=duration)
            except InsufficientCreditsError as exc:
                raise ExtractionError(str(exc)) from exc

        file_id = self._new_file_id()
        source_path = self._download_source(url, file_id)

        try:
            output_path = self.storage.get_clip_path(file_id, ext="mp4")
            self._ffmpeg_extract(source_path, output_path, start, end)

            file_size = self.storage.get_file_size(output_path)
            if session.role == "guest" and file_size > settings.GUEST_MAX_FILE_SIZE:
                self.storage.delete_file(output_path)
                raise ExtractionError(
                    f"Extracted file exceeds the {settings.GUEST_MAX_FILE_SIZE} byte "
                    f"guest limit."
                )

            log.info(
                "Extraction complete: file_id=%s, duration=%.1fs, size=%d bytes, role=%s",
                file_id,
                duration,
                file_size,
                session.role,
            )
            return file_id

        finally:
            self.storage.delete_file(source_path)

    def extract_source(self, url: str, session, guest_token: str | None = None) -> str:
        """Download the full source (no clip trimming) for registered users, or
        for a guest using their one-time free unlimited download (spec §3).

        Raises:
            ExtractionError: if validation, quota, or download fails.
        """
        error = validate_url(url, allow_private=settings.ALLOW_PRIVATE_ADDRESSES)
        if error:
            raise ExtractionError(error)

        is_guest_free_download = False
        if session.role == "guest":
            if not guest_token:
                raise ExtractionError(
                    "Source downloads require a guest token or registration."
                )
            if self.guests.has_used_free_download(guest_token):
                raise ExtractionError(
                    "Free download already used. Register or buy B1T$ for more "
                    "downloads."
                )
            is_guest_free_download = True

        file_id = self._new_file_id()
        source_path = self._download_source(url, file_id)

        try:
            file_size = self.storage.get_file_size(Path(source_path))

            if session.role != "guest":
                try:
                    self.credits.charge(session, "full_download", file_size=file_size)
                except InsufficientCreditsError as exc:
                    self.storage.delete_file(Path(source_path))
                    raise ExtractionError(str(exc)) from exc

            output_path = self.storage.get_clip_path(file_id, ext="mp4")
            Path(source_path).rename(output_path)

            if is_guest_free_download:
                self.guests.mark_free_download_used(guest_token)

            log.info(
                "Source download complete: file_id=%s, size=%d bytes, role=%s",
                file_id,
                file_size,
                session.role,
            )
            return file_id
        except ExtractionError:
            raise
        finally:
            self.storage.delete_file(Path(source_path))

    def _new_file_id(self) -> str:
        import uuid

        return uuid.uuid4().hex

    def _download_source(self, url: str, file_id: str) -> str:
        """Download source media using yt-dlp to temporary storage."""
        source_path = self.storage.get_temp_path(file_id, ext="mp4")

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "format": "bestvideo+bestaudio/best",
            "outtmpl": str(source_path),
            "noplaylist": True,
            "merge_output_format": "mp4",
            "ffmpeg_location": self.ffmpeg_path,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except yt_dlp.utils.DownloadError as exc:
            self.storage.delete_file(source_path)
            raise ExtractionError(
                "We couldn't retrieve this source. "
                "The source may be unavailable, require authentication, "
                "or the URL may not be supported."
            ) from exc
        except Exception as exc:
            self.storage.delete_file(source_path)
            log.error("Download failed for %s: %s", url, exc)
            raise ExtractionError(
                "An unexpected error occurred while downloading this source."
            ) from exc

        if not Path(source_path).exists():
            raise ExtractionError(
                "Download completed but no file was produced."
            )

        return source_path

    def _ffmpeg_extract(
        self,
        input_path: str,
        output_path: str,
        start: float,
        end: float,
    ):
        """Use FFmpeg to extract a segment from the source media.

        Uses -c copy for speed (no re-encoding). Falls back to re-encoding
        if stream copy fails (e.g. format incompatibility).
        """
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-ss",
            str(start),
            "-i",
            input_path,
            "-t",
            str(end - start),
            "-c",
            "copy",
            "-avoid_negative_ts",
            "make_zero",
            str(output_path),
        ]

        log.info("FFmpeg extract: %s", " ".join(str(c) for c in cmd))
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            log.warning(
                "Stream copy failed, retrying with re-encode: %s", result.stderr
            )
            # Fallback: re-encode for compatibility
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-ss",
                str(start),
                "-i",
                input_path,
                "-t",
                str(end - start),
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-preset",
                "fast",
                "-avoid_negative_ts",
                "make_zero",
                str(output_path),
            ]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,
            )

            if result.returncode != 0:
                log.error("FFmpeg extraction failed: %s", result.stderr)
                raise ExtractionError(
                    "We couldn't extract the selected segment. "
                    "The media format may not be supported."
                )

        if not Path(output_path).exists():
            raise ExtractionError(
                "Extraction completed but no output file was produced."
            )
