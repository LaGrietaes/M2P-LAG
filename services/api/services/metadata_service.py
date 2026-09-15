"""MetadataService — yt-dlp metadata extraction (§07, §08).

Ported from MeTube's ytdl.py metadata extraction patterns (AGPL-3.0).
https://github.com/alexta69/metube

The canonical pipeline (§09):
  URL → Metadata extraction → Validate source → Create media record
"""

import logging
import yt_dlp

from config import settings
from security.url_guard import validate_url
from models import InspectResponse, FormatOption, SubtitleOption

log = logging.getLogger("m2p.metadata")


class MetadataError(Exception):
    """Raised when metadata extraction fails (§28 — human-readable)."""


class MetadataService:
    """Extracts metadata from media URLs using yt-dlp.

    This service is responsible for:
    1. Validating the URL (SSRF guard, §19)
    2. Calling yt-dlp to extract metadata (no download)
    3. Parsing the result into the InspectResponse model (§08)
    """

    def inspect(self, url: str) -> InspectResponse:
        """Inspect a media URL and return metadata.

        Raises:
            MetadataError: if the URL is invalid, the source is unavailable,
                or yt-dlp cannot extract metadata.
        """
        # 1. SSRF validation (§19)
        error = validate_url(url, allow_private=settings.ALLOW_PRIVATE_ADDRESSES)
        if error:
            raise MetadataError(error)

        # 2. yt-dlp metadata extraction
        ydl_opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "socket_timeout": 12,
            "retries": 2,
            "extractor_retries": 2,
            "fragment_retries": 2,
            "dynamic_mpd": False,
            "extractor_args": {
                "youtube": {
                    "player_client": ["web", "android", "ios"],
                },
            },
            # Browser-like user agent to reduce bot detection
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as exc:
            raw_msg = str(exc)
            clean_msg = raw_msg.replace("ERROR: ", "").strip()
            # Clean up common prefixes to make errors concise and friendly
            if "Private video" in clean_msg:
                user_msg = "This video is private and cannot be accessed."
            elif "Sign in to confirm you’re not a bot" in clean_msg or "Sign in to confirm you're not a bot" in clean_msg:
                user_msg = "YouTube bot protection triggered for this source. Please try another video or format."
            elif "Video unavailable" in clean_msg:
                user_msg = "This video is unavailable or has been removed."
            elif "The web client only works when logged-in" in clean_msg:
                user_msg = "This platform requires an authenticated account to view."
            else:
                user_msg = clean_msg if len(clean_msg) < 160 else "We couldn't retrieve this source. It may be unavailable or unsupported."
            
            log.warning("yt-dlp DownloadError for %s: %s", url, clean_msg)
            raise MetadataError(user_msg) from exc
        except Exception as exc:
            log.error("Metadata extraction failed for %s: %s", url, exc)
            raise MetadataError(
                "An unexpected error occurred while inspecting this source."
            ) from exc

        # 3. Parse metadata
        return self._parse_info(info)

    def _parse_info(self, info: dict) -> InspectResponse:
        """Parse yt-dlp info_dict into InspectResponse (§08)."""
        # Extract formats
        formats = []
        for fmt in info.get("formats", []):
            height = fmt.get("height")
            resolution = f"{height}p" if height else None
            raw_fs = fmt.get("filesize") or fmt.get("filesize_approx")
            formats.append(
                FormatOption(
                    format_id=fmt.get("format_id", ""),
                    ext=fmt.get("ext", ""),
                    resolution=resolution,
                    filesize=int(raw_fs) if raw_fs else None,
                    tbr=fmt.get("tbr"),
                    codec=fmt.get("vcodec") or fmt.get("acodec"),
                    vcodec=fmt.get("vcodec"),
                    acodec=fmt.get("acodec"),
                    height=height,
                )
            )

        # Extract subtitles (§11 — VTT, SRT)
        subtitles = []
        for lang, subs in (info.get("subtitles") or {}).items():
            for sub in subs:
                subtitles.append(
                    SubtitleOption(
                        language=lang,
                        ext=sub.get("ext", ""),
                        url=sub.get("url"),
                    )
                )
        for lang, subs in (info.get("automatic_captions") or {}).items():
            for sub in subs:
                subtitles.append(
                    SubtitleOption(
                        language=f"{lang} (auto)",
                        ext=sub.get("ext", ""),
                        url=sub.get("url"),
                    )
                )

        # Extract creator (§13)
        creator = (
            info.get("uploader")
            or info.get("creator")
            or info.get("artist")
        )

        # Extract platform (§13)
        platform = info.get("extractor_key") or info.get("extractor")

        return InspectResponse(
            id=info.get("id", ""),
            title=info.get("title", ""),
            creator=creator,
            duration=info.get("duration"),
            thumbnail=info.get("thumbnail"),
            platform=platform,
            webpage_url=info.get("webpage_url"),
            upload_date=info.get("upload_date"),
            formats=formats,
            subtitles=subtitles,
        )
