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
        format_id: str | None = None,
        format: str = "mp4",
    ) -> str:
        """Extract a media segment and return the output file ID.

        Args:
            url: Media URL to extract from.
            start: Start time in seconds.
            end: End time in seconds.
            session: auth_service.Session for the requester.
            operation: credit operation type ("clip", "transcript", "hevc_encode").
            format_id: yt-dlp format_id chosen from a prior /media/inspect
                response (spec §2 — real source-derived formats, not a
                simplified quality toggle). None keeps the existing
                bestvideo+bestaudio/best default.
            format: target output format ("mp4", "mp3", etc.).

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
        is_mp3 = (format or "").strip().lower() == "mp3"
        target_ext = "mp3" if is_mp3 else "mp4"

        source_path = self._download_source(
            url,
            file_id,
            format_id=format_id,
            start=start,
            end=end,
            target_format=target_ext,
        )

        try:
            output_path = self.storage.get_clip_path(file_id, ext=target_ext)
            self._ffmpeg_extract(
                source_path,
                output_path,
                0,
                duration,
                target_format=target_ext,
            )

            file_size = self.storage.get_file_size(output_path)
            if session.role == "guest" and file_size > settings.GUEST_MAX_FILE_SIZE:
                self.storage.delete_file(output_path)
                raise ExtractionError(
                    f"Extracted file exceeds the {settings.GUEST_MAX_FILE_SIZE} byte "
                    f"guest limit."
                )

            log.info(
                "Extraction complete: file_id=%s, duration=%.1fs, size=%d bytes, role=%s, format=%s",
                file_id,
                duration,
                file_size,
                session.role,
                target_ext,
            )
            return file_id

        finally:
            self.storage.delete_file(source_path)

    def extract_source(
        self,
        url: str,
        session,
        guest_token: str | None = None,
        format_id: str | None = None,
        format: str = "mp4",
    ) -> str:
        """Download the full source (no clip trimming) for registered users, or
        for a guest using their one-time free unlimited download (spec §3).

        Args:
            format_id: yt-dlp format_id chosen from a prior /media/inspect
                response. None keeps the existing bestvideo+bestaudio/best
                default.
            format: target output format ("mp4", "mp3", etc.).

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
        is_mp3 = (format or "").strip().lower() == "mp3"
        target_ext = "mp3" if is_mp3 else "mp4"

        source_path = self._download_source(
            url,
            file_id,
            format_id=format_id,
            target_format=target_ext,
        )

        try:
            output_path = self.storage.get_clip_path(file_id, ext=target_ext)

            if is_mp3:
                # Transcode to high quality MP3 (320k)
                if Path(source_path).suffix.lower() == ".mp3":
                    Path(source_path).rename(output_path)
                else:
                    self._transcode_to_mp3(source_path, output_path)
            else:
                source_ext = Path(source_path).suffix.lstrip(".") or "mp4"
                output_path = self.storage.get_clip_path(file_id, ext=source_ext)
                Path(source_path).rename(output_path)

            file_size = self.storage.get_file_size(output_path)

            if session.role != "guest":
                try:
                    self.credits.charge(session, "full_download", file_size=file_size)
                except InsufficientCreditsError as exc:
                    self.storage.delete_file(output_path)
                    raise ExtractionError(str(exc)) from exc

            if is_guest_free_download:
                self.guests.mark_free_download_used(guest_token)

            log.info(
                "Source download complete: file_id=%s, size=%d bytes, role=%s, format=%s",
                file_id,
                file_size,
                session.role,
                target_ext,
            )
            return file_id
        except ExtractionError:
            raise
        finally:
            self.storage.delete_file(Path(source_path))

    def _new_file_id(self) -> str:
        import uuid

        return uuid.uuid4().hex

    def _download_source(
        self,
        url: str,
        file_id: str,
        format_id: str | None = None,
        start: float | None = None,
        end: float | None = None,
        target_format: str = "mp4",
    ) -> str:
        """Download source media using yt-dlp to temporary storage.

        format_id selects a specific format from a prior /media/inspect
        response. A video-only format_id is paired with the best available
        audio (yt-dlp merges them via ffmpeg), matching how format_id
        already behaves when the source itself has separate video/audio
        streams. Falls back to the existing best-quality default when no
        format_id is given, or if yt-dlp can't resolve it (e.g. the
        source's available formats changed between inspect and extract).
        """
        temp_dir = self.storage.temp_dir
        outtmpl = str(temp_dir / f"{file_id}.%(ext)s")

        if target_format == "mp3":
            format_selector = format_id if format_id else "bestaudio/best"
        else:
            format_selector = (
                f"{format_id}+bestaudio/{format_id}/bestvideo+bestaudio/best"
                if format_id
                else "bestvideo+bestaudio/best"
            )

        ydl_opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 30,
            "format": format_selector,
            "outtmpl": outtmpl,
            "noplaylist": True,
            "ffmpeg_location": self.ffmpeg_path,
            # Browser-like user agent to reduce bot detection
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
        }

        if start is not None and end is not None:
            ydl_opts["download_ranges"] = yt_dlp.utils.download_range_func(
                None, [(start, end)]
            )
            ydl_opts["force_keyframes_at_cuts"] = True

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except yt_dlp.utils.DownloadError as exc:
            # Clean up any partial files with this file_id
            for p in temp_dir.iterdir():
                if p.stem == file_id:
                    self.storage.delete_file(str(p))
            raise ExtractionError(
                "We couldn't retrieve this source. "
                "The source may be unavailable, require authentication, "
                "or the URL may not be supported."
            ) from exc
        except Exception as exc:
            for p in temp_dir.iterdir():
                if p.stem == file_id:
                    self.storage.delete_file(str(p))
            log.error("Download failed for %s: %s", url, exc)
            raise ExtractionError(
                "An unexpected error occurred while downloading this source."
            ) from exc

        # Find the actual downloaded file
        downloaded_file = next(
            (p for p in temp_dir.iterdir() if p.stem == file_id), None
        )
        if not downloaded_file or not downloaded_file.exists():
            raise ExtractionError(
                "Download completed but no file was produced."
            )

        return str(downloaded_file)

    def _ffmpeg_extract(
        self,
        input_path: str,
        output_path: str,
        start: float,
        end: float,
        target_format: str = "mp4",
    ):
        """Use FFmpeg to extract a segment from the source media.

        Uses -c copy for video speed (no re-encoding) or libmp3lame for MP3 audio.
        Falls back to re-encoding if stream copy fails (e.g. format incompatibility).
        """
        if target_format == "mp3":
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-ss",
                str(start),
                "-i",
                input_path,
                "-t",
                str(end - start),
                "-vn",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "320k",
                "-avoid_negative_ts",
                "make_zero",
                str(output_path),
            ]
        else:
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
                "Stream copy/extract failed, retrying with re-encode: %s", result.stderr
            )
            # Fallback: re-encode for compatibility
            if target_format == "mp3":
                cmd = [
                    self.ffmpeg_path,
                    "-y",
                    "-ss",
                    str(start),
                    "-i",
                    input_path,
                    "-t",
                    str(end - start),
                    "-vn",
                    "-c:a",
                    "libmp3lame",
                    "-q:a",
                    "2",
                    "-avoid_negative_ts",
                    "make_zero",
                    str(output_path),
                ]
            else:
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

    def _transcode_to_mp3(self, input_path: str | Path, output_path: str | Path):
        """Transcode an audio or video file to 320k MP3."""
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "320k",
            str(output_path),
        ]
        log.info("FFmpeg full audio transcode: %s", " ".join(cmd))
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if res.returncode != 0 or not Path(output_path).exists():
            log.error("FFmpeg audio transcode failed: %s", res.stderr)
            raise ExtractionError("Failed to convert audio to MP3 format.")
