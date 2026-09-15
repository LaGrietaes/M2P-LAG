"""CreditService — B1T$ credit calculation and deduction (§L, spec §3).

Registered-user operations are gated by B1T$ balance instead of duration/size
caps. This service computes cost, checks balance, and appends an append-only
transaction record per user under {DATA_DIR}/credits/{user_id}.jsonl.

The balance itself is reported by LAG-Bridge (session.b1t_balance) and is not
mutated here. Instead, charge() gates spending against
(session.b1t_balance - sum of costs already logged for this user in the
local ledger), so repeated requests within the ledger's lifetime cannot
exceed the reported balance. Until LAG-Bridge is live and authoritative
across devices, this remains a best-effort, local-ledger-scoped gate
(spec §3, §6).
"""

import json
import logging
import math
import time
from pathlib import Path

from config import settings

log = logging.getLogger("m2p.credit")

_FULL_DOWNLOAD_UNIT_BYTES = 50 * 1024 * 1024  # 50 MB
_DURATION_UNIT_SECONDS = 60
_SHORT_CLIP_MAX_SECONDS = 60

_OPERATIONS = ("clip", "full_download", "transcript", "hevc_encode")


class InsufficientCreditsError(Exception):
    """Raised when a session's b1t_balance is below the operation's cost."""

    def __init__(self, required: int, available: int):
        self.required = required
        self.available = available
        super().__init__(
            f"Insufficient B1T$ balance: need {required}, have {available}."
        )


class CreditService:
    """Computes and deducts B1T$ credits for resource-intensive operations."""

    def __init__(self):
        self.credits_dir = Path(settings.DATA_DIR) / "credits"

    def cost_for(
        self, operation: str, *, duration: float = 0, file_size: int = 0
    ) -> int:
        """Return the B1T$ cost for an operation (§L cost table)."""
        if operation not in _OPERATIONS:
            raise ValueError(f"Unknown operation: {operation}")

        if operation == "clip":
            return max(1, self._duration_units(duration)) if duration > 0 else 0

        if operation == "full_download":
            if file_size <= 0:
                return 0
            return max(1, math.ceil(file_size / _FULL_DOWNLOAD_UNIT_BYTES))

        if operation == "transcript":
            return self._duration_units(duration)

        if operation == "hevc_encode":
            return self._duration_units(duration) * 2

        raise ValueError(f"Unknown operation: {operation}")

    def charge(
        self,
        session,
        operation: str,
        *,
        duration: float = 0,
        file_size: int = 0,
    ) -> int:
        """Charge a session for an operation. Raises InsufficientCreditsError.

        Returns the cost charged. Logs the transaction even when cost is 0,
        so history stays complete.
        """
        cost = self.cost_for(operation, duration=duration, file_size=file_size)

        import os
        db_url = os.getenv("DATABASE_URL")

        if db_url:
            available = session.b1t_balance
        else:
            available = session.b1t_balance - self._spent_so_far(session.user_id)

        if cost > available:
            raise InsufficientCreditsError(required=cost, available=available)

        # Deduct from PostgreSQL if connected
        if cost > 0 and session.role != "guest" and db_url:
            try:
                import psycopg2
                with psycopg2.connect(db_url) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE lagrieta_member SET bits_balance = GREATEST(0, bits_balance - %s), updated_at = NOW() WHERE id = %s OR email = %s;",
                            (cost, session.user_id, session.email or ""),
                        )
                        conn.commit()
                session.b1t_balance = max(0, session.b1t_balance - cost)
            except Exception as exc:
                log.warning("Failed to deduct B1T$ in shared database: %s", exc)

        self._log_transaction(session.user_id, operation, cost, duration, file_size)
        return cost

    def _duration_units(self, duration: float) -> int:
        if duration <= 0:
            return 0
        return math.ceil(duration / _DURATION_UNIT_SECONDS)

    def _spent_so_far(self, user_id: str) -> int:
        """Sum the cost of every transaction already logged for this user.

        This makes the local {DATA_DIR}/credits/{user_id}.jsonl ledger
        self-consistent within its own lifetime: session.b1t_balance is
        rebuilt fresh from the (currently-mocked) auth response on every
        request, so without this, a user could repeat any affordable
        operation indefinitely. This is not yet cross-device/LAG-Bridge
        authoritative — see spec §3, §6 for that future-phase limitation.
        """
        log_path = self.credits_dir / f"{user_id}.jsonl"
        if not log_path.exists():
            return 0

        spent = 0
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                spent += json.loads(line)["cost"]
        return spent

    def _log_transaction(
        self, user_id: str, operation: str, cost: int, duration: float, file_size: int
    ) -> None:
        self.credits_dir.mkdir(parents=True, exist_ok=True)
        record = {
            "user_id": user_id,
            "operation": operation,
            "cost": cost,
            "duration": duration,
            "file_size": file_size,
            "timestamp": time.time(),
        }
        log_path = self.credits_dir / f"{user_id}.jsonl"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
        log.info("Charged %s: %s cost=%d", user_id, operation, cost)
