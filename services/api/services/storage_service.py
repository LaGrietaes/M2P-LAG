"""StorageService — temporary file storage with TTL (§16, §30).

Manages temporary directories for source media and extracted clips.
All paths are server-controlled; user input never reaches the filesystem path.
"""

import os
import time
import uuid
import logging
import shutil
from pathlib import Path

from config import settings

log = logging.getLogger("m2p.storage")


class StorageService:
    """Manages temporary storage for media processing (§16).

    Directory layout:
      /data/temporary/  — source media (deleted immediately after extraction)
      /data/clips/      — extracted clips (deleted after TTL)
      /data/metadata/   — retained metadata
      /data/thumbnails/ — retained thumbnails
    """

    def __init__(self):
        self.data_dir = Path(settings.DATA_DIR)
        self.temp_dir = self.data_dir / "temporary"
        self.clips_dir = self.data_dir / "clips"
        self.metadata_dir = self.data_dir / "metadata"
        self.thumbnails_dir = self.data_dir / "thumbnails"
        self._ensure_dirs()

    def _ensure_dirs(self):
        for d in [self.temp_dir, self.clips_dir, self.metadata_dir, self.thumbnails_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def get_temp_path(self, media_id: str, ext: str = "mp4") -> Path:
        """Generate a safe temporary file path for source media."""
        safe_id = self._sanitize(media_id)
        filename = f"{safe_id}_{uuid.uuid4().hex[:8]}.{ext}"
        return self.temp_dir / filename

    def get_clip_path(self, media_id: str, ext: str = "mp4") -> Path:
        """Generate a safe file path for an extracted clip."""
        safe_id = self._sanitize(media_id)
        filename = f"{safe_id}_{uuid.uuid4().hex[:8]}.{ext}"
        return self.clips_dir / filename

    def _sanitize(self, name: str) -> str:
        """Sanitize a name for use in a filename (§19 — no path traversal)."""
        safe = "".join(c for c in name if c.isalnum() or c in "-_")
        return safe[:32] if safe else "media"

    def delete_file(self, path: Path) -> bool:
        """Safely delete a file. Returns True if deleted."""
        try:
            if path.exists() and path.is_file():
                path.unlink()
                log.info("Deleted file: %s", path)
                return True
        except OSError as exc:
            log.warning("Failed to delete %s: %s", path, exc)
        return False

    def cleanup_expired(self, ttl_seconds: int = 3600):
        """Delete files older than ttl_seconds in clips and temp dirs (§30)."""
        now = time.time()
        for directory in [self.temp_dir, self.clips_dir]:
            for entry in directory.iterdir():
                if entry.is_file():
                    age = now - entry.stat().st_mtime
                    if age > ttl_seconds:
                        self.delete_file(entry)
                        log.info("Cleaned up expired file: %s (age: %.0fs)", entry, age)

    def get_file_size(self, path: Path) -> int:
        """Return file size in bytes, or 0 if not found."""
        try:
            return path.stat().st_size
        except OSError:
            return 0
