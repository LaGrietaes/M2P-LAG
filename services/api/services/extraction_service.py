"""ExtractionService — FFmpeg segment extraction (§07, §09, §10).

Pipeline (§09):
  URL → Metadata → Download source → FFmpeg extract → Deliver → Cleanup

Guest enforcement (§10):
  Backend rejects extraction > GUEST_MAX_CLIP_SECONDS for guest users.
  Never trust the frontend.
"""

import os
import time
import uuid
import shutil
import logging
import subprocess
from pathlib import Path
import yt_dlp

from config import settings
from security.url_guard import validate_url
from services.storage_service import StorageService
from models import InspectResponse

log = logging.getLogger("m2p.extraction")


class ExtractionError(Exception):
    """Raised when extraction fails (§28 — human-readable)."""


class ExtractionService:
    """Handles media download and FFmpeg segment extraction.

    For guest users (§10):
    - Maximum clip duration is GUEST_MAX_CLIP_SECONDS (default 20s)
    - Source is deleted immediately after extraction
    - Output is deleted after TTL
    """

    def __init__(self):
        self.storage = StorageService()
        self.ytdlp_path = settings.YTDLP_PATH
        self.ffmpeg_path = settings.FFMPEG_PATH

    def extract_clip(
        self,
        url: str,
        start: float,
        end: float,
        role: str = "guest",
    ) -> str:
        """Extract a media segment and return the output file ID.

        Args:
            url: Media URL to extract from.
            start: Start time in seconds.
            end: End time in seconds.
            role: User role ("guest" or "user").

        Returns:
            File ID (UUID) for downloading the extracted clip.

        Raises:
            ExtractionError: if validation fails or extraction errors.
        """
        # ── 1. SSRF validation (§19) ──────────────────────────────────────
        error = validate_url(url, allow_private=settings.ALLOW_PRIVATE_ADDRESSES)
        if error:
            raise ExtractionError(error)

        # ── 2. Guest 20-second enforcement (§10) ──────────────────────────
        duration = end - start
        if duration <= 0:
            raise ExtractionError(
                "Invalid segment: end time must be after start time."
            )

        if role == "guest":
            max_seconds = settings.GUEST_MAX_CLIP_SECONDS
            if duration > max_seconds:
                raise ExtractionError(
                    f"Guest extraction limit is {max_seconds} seconds. "
                    f"Your selection is {duration:.1f} seconds."
                )

        # ── 3. Generate file ID ───────────────────────────────────────────
        file_id = uuid.uuid4().hex

        # ── 4. Download source media (yt-dlp) ─────────────────────────────
        source_path = self._download_source(url, file_id)

        try:
            # ── 5. FFmpeg extraction (§09) ────────────────────────────────
            output_path = self.storage.get_clip_path(file_id, ext="mp4")
            self._ffmpeg_extract(source_path, output_path, start, end)

            # ── 6. Enforce file size limit (§17) ──────────────────────────
            file_size = self.storage.get_file_size(output_path)
            if role == "guest" and file_size > settings.GUEST_MAX_FILE_SIZE:
                self.storage.delete_file(output_path)
                raise ExtractionError(
                    f"Extracted file exceeds the {settings.GUEST_MAX_FILE_SIZE} byte "
                    f"guest limit."
                )

            log.info(
                "Extraction complete: file_id=%s, duration=%.1fs, size=%d bytes",
                file_id,
                duration,
                file_size,
            )
            return file_id

        finally:
            # ── 7. Delete source immediately (§09, §10) ───────────────────
            self.storage.delete_file(source_path)

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
