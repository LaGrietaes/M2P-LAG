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
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as exc:
            raise MetadataError(
                "We couldn't retrieve this source. "
                "The source may be unavailable, require authentication, "
                "or the URL may not be supported."
            ) from exc
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
