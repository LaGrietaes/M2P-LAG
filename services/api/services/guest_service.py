"""GuestService — one-time free unlimited download per guest token (spec §3).

Guests always get the free 20-second clip extraction (unaffected by this
service). Additionally, each guest_token (a random UUID the frontend
generates and persists in localStorage, spec §3) is entitled to exactly one
free full-source download with no duration/size cap.

This is a soft, resettable perk — not a security boundary — acceptable
because clearing localStorage or using a new browser resets it (spec §3).
"""

import json
import logging
import time
from pathlib import Path
from threading import Lock

from config import settings

log = logging.getLogger("m2p.guest")

_lock = Lock()


class GuestService:
    """Tracks free-download usage per guest token in a single JSON file."""

    def __init__(self):
        self.guests_dir = Path(settings.DATA_DIR) / "guests"
        self.tokens_path = self.guests_dir / "tokens.json"

    def has_used_free_download(self, guest_token: str) -> bool:
        data = self._read()
        entry = data.get(guest_token)
        return bool(entry and entry.get("free_download_used"))

    def mark_free_download_used(self, guest_token: str) -> None:
        with _lock:
            data = self._read()
            entry = data.get(guest_token, {"first_seen": time.time()})
            entry["free_download_used"] = True
            data[guest_token] = entry
            self._write(data)
        log.info("Guest free download marked used: token=%s", guest_token[:8])

    def _read(self) -> dict:
        if not self.tokens_path.exists():
            return {}
        try:
            return json.loads(self.tokens_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            log.warning("Guest tokens file unreadable, treating as empty")
            return {}

    def _write(self, data: dict) -> None:
        self.guests_dir.mkdir(parents=True, exist_ok=True)
        self.tokens_path.write_text(json.dumps(data), encoding="utf-8")
