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
import json
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
        self.ffprobe_path = getattr(settings, "FFPROBE_PATH", "ffprobe")

    def _determine_target_ext(self, format: str | None, preset: str | None) -> str:
        fmt = (format or "mp4").strip().lower()
        pst = (preset or "compatible").strip().lower()
        if fmt in ("mp3", "wav"):
            return fmt
        if pst == "prores" or fmt == "mov":
            return "mov"
        if fmt == "webm":
            return "webm"
        return "mp4"

    def _probe_codecs(self, path: str) -> tuple[str | None, str | None]:
        """Inspect video and audio codec names using ffprobe."""
        try:
            cmd = [
                self.ffprobe_path,
                "-v", "error",
                "-show_entries", "stream=codec_type,codec_name",
                "-of", "json",
                str(path),
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if res.returncode == 0 and res.stdout:
                data = json.loads(res.stdout)
                vcodec = None
                acodec = None
                for s in data.get("streams", []):
                    c_type = s.get("codec_type")
                    c_name = s.get("codec_name")
                    if c_type == "video" and not vcodec:
                        vcodec = c_name
                    elif c_type == "audio" and not acodec:
                        acodec = c_name
                return vcodec, acodec
        except Exception as exc:
            log.warning("ffprobe codec check failed for %s: %s", path, exc)
        return None, None

    def extract_clip(
        self,
        url: str,
        start: float,
        end: float,
        session,
        operation: str = "clip",
        format_id: str | None = None,
        format: str = "mp4",
        preset: str = "compatible",
    ) -> str:
        """Extract a media segment and return the output file ID.

        Args:
            url: Media URL to extract from.
            start: Start time in seconds.
            end: End time in seconds.
            session: auth_service.Session for the requester.
            operation: credit operation type ("clip", "transcript", "hevc_encode").
            format_id: yt-dlp format_id chosen from a prior /media/inspect
                response. None keeps the default best-quality source.
            format: target output format ("mp4", "mov", "webm", "mp3", "wav").
            preset: transcode preset ("compatible", "prores", "high_quality", "original").

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
        target_ext = self._determine_target_ext(format, preset)

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
                start=0,
                end=duration,
                target_format=target_ext,
                preset=preset,
            )

            file_size = self.storage.get_file_size(output_path)
            if session.role == "guest" and file_size > settings.GUEST_MAX_FILE_SIZE:
                self.storage.delete_file(output_path)
                raise ExtractionError(
                    f"Extracted file exceeds the {settings.GUEST_MAX_FILE_SIZE} byte "
                    f"guest limit."
                )

            log.info(
                "Extraction complete: file_id=%s, duration=%.1fs, size=%d bytes, role=%s, format=%s, preset=%s",
                file_id,
                duration,
                file_size,
                session.role,
                target_ext,
                preset,
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
        preset: str = "compatible",
        file_id: str | None = None,
    ) -> str:
        """Download the full source for registered users, or for a guest using
        their one-time free unlimited download (spec §3).
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

        if not file_id:
            file_id = self._new_file_id()
        target_ext = self._determine_target_ext(format, preset)

        source_path = self._download_source(
            url,
            file_id,
            format_id=format_id,
            target_format=target_ext,
        )

        try:
            output_path = self.storage.get_clip_path(file_id, ext=target_ext)

            if target_ext == "mp3":
                if Path(source_path).suffix.lower() == ".mp3":
                    Path(source_path).rename(output_path)
                else:
                    self._transcode_to_mp3(source_path, output_path)
            elif preset in ("original", "copy") and Path(source_path).suffix.lower() == f".{target_ext}":
                Path(source_path).rename(output_path)
            else:
                self._ffmpeg_extract(
                    source_path,
                    output_path,
                    start=None,
                    end=None,
                    target_format=target_ext,
                    preset=preset,
                )

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
                "Source download complete: file_id=%s, size=%d bytes, role=%s, format=%s, preset=%s",
                file_id,
                file_size,
                session.role,
                target_ext,
                preset,
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
        target_format: str = "mp4",
        start: float | None = None,
        end: float | None = None,
    ) -> str:
        """Download source media using yt-dlp to temporary storage."""
        temp_dir = self.storage.temp_dir
        outtmpl = str(temp_dir / f"{file_id}.%(ext)s")

        if target_format in ("mp3", "wav"):
            if format_id and ("audio" in format_id.lower() or "ba" in format_id.lower()):
                format_selector = f"{format_id}/bestaudio/best"
            else:
                format_selector = "bestaudio/best"
        else:
            format_selector = (
                f"{format_id}+bestaudio/{format_id}/bestvideo+bestaudio/best"
                if format_id
                else "bestvideo+bestaudio/best"
            )

        ydl_opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 60,
            "format": format_selector,
            "outtmpl": outtmpl,
            "noplaylist": True,
            "ffmpeg_location": self.ffmpeg_path,
            "concurrent_fragment_downloads": 5,
            "buffersize": 1024 * 1024,
            "http_chunk_size": 10485760,
            "retries": 3,
            "remote_components": ["ejs:github"],
            "js_runtimes": {"node": {}},
            # Browser-like user agent to reduce bot detection
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except yt_dlp.utils.DownloadError as exc:
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
        start: float | None = None,
        end: float | None = None,
        duration: float | None = None,
        target_format: str = "mp4",
        preset: str = "compatible",
        **kwargs,
    ):
        """Use FFmpeg to extract, transcode or stream-copy media.

        Presets:
        - compatible (default): Universal H.264 + AAC MP4, 100% compatible with
          Premiere Pro, DaVinci Resolve, Final Cut Pro, CapCut, etc.
        - prores: Apple ProRes 422 Standard in QuickTime (.mov) with PCM audio.
        - hevc / high_quality: Modern H.265 in MP4 with AAC audio.
        - original / copy: Direct stream copy (-c copy) without re-encoding.
        - mp3: 320kbps MP3 audio.
        - wav: Uncompressed 16-bit 48kHz PCM WAV audio.
        """
        clip_duration = duration
        if clip_duration is None and end is not None and start is not None:
            calc = end - start
            if calc > 0:
                clip_duration = calc

        fmt = (target_format or "mp4").strip().lower()
        pst = (preset or "compatible").strip().lower()

        # Build base time-seek flags
        time_flags = []
        if start is not None and start > 0:
            time_flags += ["-ss", str(start)]
        time_flags += ["-i", str(input_path)]
        if clip_duration is not None and clip_duration > 0:
            time_flags += ["-t", str(clip_duration)]

        if fmt == "mp3":
            cmd = [
                self.ffmpeg_path,
                "-y",
                *time_flags,
                "-vn",
                "-c:a", "libmp3lame",
                "-b:a", "320k",
                "-avoid_negative_ts", "make_zero",
                str(output_path),
            ]
        elif fmt == "wav":
            cmd = [
                self.ffmpeg_path,
                "-y",
                *time_flags,
                "-vn",
                "-c:a", "pcm_s16le",
                "-ar", "48000",
                str(output_path),
            ]
        elif pst == "prores" or fmt == "mov":
            cmd = [
                self.ffmpeg_path,
                "-y",
                *time_flags,
                "-c:v", "prores_ks",
                "-profile:v", "2",
                "-pix_fmt", "yuv422p10le",
                "-c:a", "pcm_s16le",
                str(output_path),
            ]
        elif pst in ("hevc", "high_quality"):
            cmd = [
                self.ffmpeg_path,
                "-y",
                *time_flags,
                "-c:v", "libx265",
                "-preset", "fast",
                "-crf", "22",
                "-pix_fmt", "yuv420p",
                "-tag:v", "hvc1",
                "-c:a", "aac",
                "-b:a", "320k",
                "-movflags", "+faststart",
                str(output_path),
            ]
        elif pst in ("original", "copy"):
            cmd = [
                self.ffmpeg_path,
                "-y",
                *time_flags,
                "-c", "copy",
                "-avoid_negative_ts", "make_zero",
                str(output_path),
            ]
        else:
            # "compatible" / "editor" (Default)
            vcodec, acodec = self._probe_codecs(str(input_path))
            is_h264 = vcodec and vcodec.lower() in ("h264", "avc", "avc1")
            is_aac = acodec and acodec.lower() in ("aac", "mp4a")

            if is_h264 and is_aac and fmt == "mp4":
                # Both streams already optimal
                cmd = [
                    self.ffmpeg_path,
                    "-y",
                    *time_flags,
                    "-c", "copy",
                    "-avoid_negative_ts", "make_zero",
                    "-movflags", "+faststart",
                    str(output_path),
                ]
            elif is_h264 and fmt == "mp4":
                # Video is H.264, audio is Opus or non-AAC -> transcode only audio
                cmd = [
                    self.ffmpeg_path,
                    "-y",
                    *time_flags,
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-b:a", "320k",
                    "-avoid_negative_ts", "make_zero",
                    "-movflags", "+faststart",
                    str(output_path),
                ]
            else:
                # Video is VP9, AV1, etc. -> transcode to universal H.264 + AAC
                cmd = [
                    self.ffmpeg_path,
                    "-y",
                    *time_flags,
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "18",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "320k",
                    "-movflags", "+faststart",
                    str(output_path),
                ]

        log.info("FFmpeg execute: %s", " ".join(str(c) for c in cmd))
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=1200,
        )

        if result.returncode != 0:
            log.warning(
                "Initial FFmpeg process failed, retrying with fallback encode: %s",
                result.stderr,
            )
            # Universal fallback: re-encode to baseline compatible format
            if fmt in ("mp3", "wav"):
                fallback_cmd = [
                    self.ffmpeg_path,
                    "-y",
                    *time_flags,
                    "-vn",
                    "-c:a", "libmp3lame" if fmt == "mp3" else "pcm_s16le",
                    str(output_path),
                ]
            else:
                fallback_cmd = [
                    self.ffmpeg_path,
                    "-y",
                    *time_flags,
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "20",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-movflags", "+faststart",
                    str(output_path),
                ]

            fallback_res = subprocess.run(
                fallback_cmd,
                capture_output=True,
                text=True,
                timeout=1200,
            )
            if fallback_res.returncode != 0:
                log.error("FFmpeg fallback failed: %s", fallback_res.stderr)
                raise ExtractionError(
                    "We couldn't process the selected media. "
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
            "-threads",
            "0",
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
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=1200)
        if res.returncode != 0 or not Path(output_path).exists():
            log.error("FFmpeg audio transcode failed: %s", res.stderr)
            raise ExtractionError("Failed to convert audio to MP3 format.")
