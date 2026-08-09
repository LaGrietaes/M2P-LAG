# Bug Audit, Unlimited Registered Users, Guest Free Download, B1T$ Purchase, HUD Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix audited GUI/logic bugs, remove duration/size limits for registered users
(gated only by B1T$ balance), give guests one free unlimited download, add register/buy
B1T$ entry points, and re-skin the GUI in a HUD/mission-console direction using the full
M2P logo.

**Architecture:** Backend gets a new `CreditService` (B1T$ ledger, JSON-file backed) and
a guest-token free-download tracker, both following the existing `StorageService`
JSON-file pattern. Quota enforcement in `ExtractionService` changes from
duration/size-based to credit-based for registered users. Frontend gets bug fixes
(quota-driven clip cap, ownership-safe file fetch, dropped broken video scrub), two new
components (`BuyB1tModal`, guest free-download badge), a real register redirect, and a
full Tailwind re-skin of existing views — no new routes or information architecture.

**Tech Stack:** Python 3.13 / FastAPI / pytest (backend), React 19 / TS / Vite / Tailwind
/ vitest + @testing-library/react (frontend).

## Global Constraints

- Backend is authoritative for all quota/credit decisions — the frontend never enforces
  a limit the backend doesn't also enforce (per `ARCHITECTURE.md` §10, §17, restated in
  spec §3).
- No database — all new persistence is JSON files under `settings.DATA_DIR`, matching
  `StorageService`'s existing layout convention (spec §3).
- Registered users (`role in ("user", "admin")`): no `max_clip_seconds` / `max_source_size`
  / daily-job hard caps — gated by B1T$ balance only (spec §3).
- Guests: existing always-free 20-second clip extraction is unchanged; additionally, each
  guest token gets exactly one free unlimited full-source download at standard
  (H.264) quality (spec §3).
- B1T$ cost table (spec §3, from `ARCHITECTURE.md` §L):
  - Registered short clip (≤60s): 0
  - Full source download: `ceil(file_size / 50MB)`
  - Transcript extraction: `ceil(duration / 60s)`
  - HEVC/H.265 encode: `ceil(duration / 60s) * 2`
- Real payment integration and real LAG-Bridge server-side implementation are out of
  scope (spec §6) — B1T$ purchase is a stubbed endpoint; register is a redirect to a
  configurable URL.
- All redesign changes must keep WCAG AA contrast for body/readout text (spec §5).
- Existing brand palette must be preserved and extended, not replaced: `#a00000` red,
  `#121212` charcoal (already in `tailwind.config.js`).

---

## File Structure

**Backend (`services/api/`):**
- `services/credit_service.py` — new. B1T$ balance checks/deductions, cost calculation,
  append-only transaction log.
- `services/guest_service.py` — new. Guest-token free-download tracking.
- `services/extraction_service.py` — modify. Remove guest-only enforcement branch,
  delegate to `CreditService`/`GuestService`.
- `main.py` — modify. Wire new services into `/api/v1/jobs/extract`,
  `/api/v1/jobs/download`, new `/api/v1/b1t/purchase`, `/api/v1/files/{file_id}` ownership
  check, `/api/v1/me/quota` response shape.
- `middleware.py` — modify. `AuthMiddleware` extracts `X-M2P-Guest-Token` header onto
  `request.state.guest_token`.
- `models.py` — modify. Add `PurchaseRequest`/`PurchaseResponse`, extend quota response
  fields.
- `config.py` — modify. Add `M2P_DEV_CREDIT_GRANTS`, `B1T_PACKAGE_TIERS`.
- `tests/test_credit_service.py`, `tests/test_guest_service.py`,
  `tests/test_files_ownership.py` — new.
- `requirements-dev.txt` — new. `pytest`, `httpx` (already a runtime dep via `auth_service.py`).

**Frontend (`apps/web/src/`):**
- `lib/guestToken.ts` — new. Generate/read/persist guest token in `localStorage`.
- `lib/api.ts` — modify. Attach `Authorization` and `X-M2P-Guest-Token` headers; add
  `purchaseB1t`.
- `components/ClipEditor.tsx` — modify (in `features/extractor/`). Quota-driven cap,
  drop broken video element, numeric IN/OUT inputs.
- `features/source/SourceCard.tsx` — modify. Add guest free-download badge slot.
- `components/AuthStatus.tsx` — modify. Real register redirect, sign-out clears token.
- `components/BuyB1tModal.tsx` — new.
- `components/DevModeToggle.tsx` — modify. Gate behind `import.meta.env.DEV`.
- `components/ProgressRail.tsx` — new. 4-step HUD indicator.
- `components/Logo.tsx` — modify. Add size variants for hero vs. header use.
- `routes/Landing.tsx` — modify. Wire in `ProgressRail`, `BuyB1tModal`, redesigned layout.
- `index.css`, `tailwind.config.js` — modify. HUD palette additions, clip-path utility
  classes, scanline background, mono readout classes.
- `types/index.ts` — modify. Add `PurchaseRequest`/`PurchaseResponse`,
  `free_download_used` on quota type.
- `vitest.config.ts` — new.
- `src/lib/guestToken.test.ts`, `src/components/AuthStatus.test.tsx`,
  `src/features/extractor/ClipEditor.test.tsx` — new.

---

## Task 1: Backend test harness (pytest)

**Files:**
- Create: `services/api/requirements-dev.txt`
- Create: `services/api/tests/__init__.py`
- Create: `services/api/tests/conftest.py`
- Create: `services/api/pytest.ini`

**Interfaces:**
- Produces: a `tmp_data_dir` pytest fixture that later tasks use to point
  `settings.DATA_DIR` at an isolated temp directory per test.

- [ ] **Step 1: Create the dev requirements file**

```text
pytest>=8.3.0
pytest-asyncio>=0.24.0
```

Write this to `services/api/requirements-dev.txt`.

- [ ] **Step 2: Install dev dependencies**

Run: `cd services/api && pip install -r requirements-dev.txt`
Expected: pytest and pytest-asyncio install successfully.

- [ ] **Step 3: Create pytest config**

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

Write this to `services/api/pytest.ini`.

- [ ] **Step 4: Create the tests package and shared fixture**

```python
# services/api/tests/__init__.py
```//empty file

```python
# services/api/tests/conftest.py
import shutil
import tempfile
from pathlib import Path

import pytest

from config import settings


@pytest.fixture
def tmp_data_dir(monkeypatch):
    """Point settings.DATA_DIR at an isolated temp directory for the test."""
    tmp = Path(tempfile.mkdtemp(prefix="m2p_test_"))
    monkeypatch.setattr(settings, "DATA_DIR", str(tmp))
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)
```

- [ ] **Step 5: Write a smoke test to confirm the harness works**

```python
# services/api/tests/test_harness_smoke.py
from services.storage_service import StorageService


def test_storage_service_uses_tmp_data_dir(tmp_data_dir):
    storage = StorageService()
    assert storage.data_dir == tmp_data_dir
    assert storage.clips_dir.exists()
```

- [ ] **Step 6: Run the smoke test**

Run: `cd services/api && pytest tests/test_harness_smoke.py -v`
Expected: `1 passed`

- [ ] **Step 7: Commit**

```bash
git add services/api/requirements-dev.txt services/api/pytest.ini services/api/tests/
git commit -m "test: add pytest harness with isolated data-dir fixture"
```

---

## Task 2: `CreditService` — B1T$ balance, cost calculation, deduction

**Files:**
- Create: `services/api/services/credit_service.py`
- Test: `services/api/tests/test_credit_service.py`

**Interfaces:**
- Consumes: `Session` dataclass from `services/auth_service.py`
  (`user_id: str, role: str, b1t_balance: int`).
- Produces:
  - `class InsufficientCreditsError(Exception)` — carries `.required: int` and
    `.available: int`.
  - `class CreditService:`
    - `def cost_for(self, operation: str, *, duration: float = 0, file_size: int = 0) -> int`
      — `operation` is one of `"clip"`, `"full_download"`, `"transcript"`, `"hevc_encode"`.
    - `def charge(self, session, operation: str, *, duration: float = 0, file_size: int = 0) -> int`
      — computes cost via `cost_for`, raises `InsufficientCreditsError` if
      `session.b1t_balance < cost`, otherwise appends a transaction record to
      `{DATA_DIR}/credits/{user_id}.jsonl` and returns the cost charged. Does **not**
      mutate `session.b1t_balance` in place (that balance is LAG-Bridge-reported and
      read-only from M2P's side until LAG-Bridge is live) — callers use the returned
      cost to show the user what was charged this session.

- [ ] **Step 1: Write the failing tests**

```python
# services/api/tests/test_credit_service.py
import json

import pytest

from services.auth_service import Session
from services.credit_service import CreditService, InsufficientCreditsError


def make_session(balance: int) -> Session:
    return Session(user_id="user_42", role="user", provider="ghost", b1t_balance=balance)


class TestCostFor:
    def test_registered_short_clip_is_free(self):
        svc = CreditService()
        assert svc.cost_for("clip", duration=45) == 0

    def test_full_download_cost_rounds_up_per_50mb(self):
        svc = CreditService()
        # 120 MB -> ceil(120/50) = 3
        assert svc.cost_for("full_download", file_size=120 * 1024 * 1024) == 3

    def test_full_download_exact_multiple_of_50mb(self):
        svc = CreditService()
        assert svc.cost_for("full_download", file_size=100 * 1024 * 1024) == 2

    def test_transcript_cost_rounds_up_per_60s(self):
        svc = CreditService()
        # 90s -> ceil(90/60) = 2
        assert svc.cost_for("transcript", duration=90) == 2

    def test_hevc_cost_is_double_transcript_rate(self):
        svc = CreditService()
        # 90s -> ceil(90/60)*2 = 4
        assert svc.cost_for("hevc_encode", duration=90) == 4

    def test_unknown_operation_raises_value_error(self):
        svc = CreditService()
        with pytest.raises(ValueError):
            svc.cost_for("teleport", duration=1)


class TestCharge:
    def test_charge_succeeds_and_logs_transaction(self, tmp_data_dir):
        svc = CreditService()
        session = make_session(balance=10)
        cost = svc.charge(session, "transcript", duration=60)
        assert cost == 1

        log_path = tmp_data_dir / "credits" / "user_42.jsonl"
        assert log_path.exists()
        lines = log_path.read_text().strip().splitlines()
        assert len(lines) == 1
        record = json.loads(lines[0])
        assert record["operation"] == "transcript"
        assert record["cost"] == 1
        assert record["user_id"] == "user_42"

    def test_charge_raises_when_balance_insufficient(self, tmp_data_dir):
        svc = CreditService()
        session = make_session(balance=0)
        with pytest.raises(InsufficientCreditsError) as exc_info:
            svc.charge(session, "transcript", duration=60)
        assert exc_info.value.required == 1
        assert exc_info.value.available == 0

    def test_charge_appends_multiple_transactions(self, tmp_data_dir):
        svc = CreditService()
        session = make_session(balance=10)
        svc.charge(session, "transcript", duration=60)
        svc.charge(session, "hevc_encode", duration=30)

        log_path = tmp_data_dir / "credits" / "user_42.jsonl"
        lines = log_path.read_text().strip().splitlines()
        assert len(lines) == 2

    def test_registered_short_clip_charge_is_zero_and_still_logged(self, tmp_data_dir):
        svc = CreditService()
        session = make_session(balance=0)
        cost = svc.charge(session, "clip", duration=45)
        assert cost == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services/api && pytest tests/test_credit_service.py -v`
Expected: `ModuleNotFoundError: No module named 'services.credit_service'`

- [ ] **Step 3: Implement `CreditService`**

```python
# services/api/services/credit_service.py
"""CreditService — B1T$ credit calculation and deduction (§L, spec §3).

Registered-user operations are gated by B1T$ balance instead of duration/size
caps. This service computes cost, checks balance, and appends an append-only
transaction record per user under {DATA_DIR}/credits/{user_id}.jsonl.

The balance itself is reported by LAG-Bridge (session.b1t_balance) and is not
mutated here — until LAG-Bridge is live, this is a best-effort session-scoped
ledger (spec §3, §6).
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
            return 0 if duration <= _SHORT_CLIP_MAX_SECONDS else self._duration_units(duration)

        if operation == "full_download":
            if file_size <= 0:
                return 0
            return math.ceil(file_size / _FULL_DOWNLOAD_UNIT_BYTES)

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

        if cost > session.b1t_balance:
            raise InsufficientCreditsError(required=cost, available=session.b1t_balance)

        self._log_transaction(session.user_id, operation, cost, duration, file_size)
        return cost

    def _duration_units(self, duration: float) -> int:
        if duration <= 0:
            return 0
        return math.ceil(duration / _DURATION_UNIT_SECONDS)

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/api && pytest tests/test_credit_service.py -v`
Expected: `10 passed`

- [ ] **Step 5: Commit**

```bash
git add services/api/services/credit_service.py services/api/tests/test_credit_service.py
git commit -m "feat: add CreditService for B1T\$ cost calculation and deduction"
```

---

## Task 3: `GuestService` — one-time free unlimited download per guest token

**Files:**
- Create: `services/api/services/guest_service.py`
- Test: `services/api/tests/test_guest_service.py`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `class GuestService:`
    - `def has_used_free_download(self, guest_token: str) -> bool`
    - `def mark_free_download_used(self, guest_token: str) -> None`
    - Backed by `{DATA_DIR}/guests/tokens.json` — a single JSON object mapping
      `guest_token -> {"free_download_used": bool, "first_seen": float}`.

- [ ] **Step 1: Write the failing tests**

```python
# services/api/tests/test_guest_service.py
import json

from services.guest_service import GuestService


def test_new_token_has_not_used_free_download(tmp_data_dir):
    svc = GuestService()
    assert svc.has_used_free_download("tok-abc") is False


def test_mark_used_persists_across_instances(tmp_data_dir):
    svc = GuestService()
    svc.mark_free_download_used("tok-abc")

    svc2 = GuestService()
    assert svc2.has_used_free_download("tok-abc") is True


def test_marking_one_token_does_not_affect_another(tmp_data_dir):
    svc = GuestService()
    svc.mark_free_download_used("tok-abc")
    assert svc.has_used_free_download("tok-xyz") is False


def test_tokens_file_is_valid_json_object(tmp_data_dir):
    svc = GuestService()
    svc.mark_free_download_used("tok-abc")

    tokens_path = tmp_data_dir / "guests" / "tokens.json"
    data = json.loads(tokens_path.read_text())
    assert data["tok-abc"]["free_download_used"] is True
    assert "first_seen" in data["tok-abc"]


def test_marking_used_twice_is_idempotent(tmp_data_dir):
    svc = GuestService()
    svc.mark_free_download_used("tok-abc")
    svc.mark_free_download_used("tok-abc")
    assert svc.has_used_free_download("tok-abc") is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services/api && pytest tests/test_guest_service.py -v`
Expected: `ModuleNotFoundError: No module named 'services.guest_service'`

- [ ] **Step 3: Implement `GuestService`**

```python
# services/api/services/guest_service.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/api && pytest tests/test_guest_service.py -v`
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add services/api/services/guest_service.py services/api/tests/test_guest_service.py
git commit -m "feat: add GuestService for one-time free unlimited download tracking"
```

---

## Task 4: Wire guest token through middleware and extraction/download flow

**Files:**
- Modify: `services/api/middleware.py`
- Modify: `services/api/services/extraction_service.py`
- Modify: `services/api/main.py`
- Modify: `services/api/models.py`
- Test: `services/api/tests/test_extraction_limits.py` (new)

**Interfaces:**
- Consumes: `CreditService.charge` (Task 2), `GuestService.has_used_free_download` /
  `mark_free_download_used` (Task 3).
- Produces:
  - `ExtractionService.extract_clip(url, start, end, role, session=None, guest_token=None)`
    — new keyword params, `role` kept for backward-compat logging only, all quota
    decisions now flow through `session`/`guest_token`.
  - `ExtractionService.extract_source(url, session, guest_token=None) -> str` — new
    method used by `/api/v1/jobs/download`, replacing the inline `extract_clip(start=0,
    end=0)` hack in `main.py`.
  - `request.state.guest_token: str | None` set by `AuthMiddleware`.

- [ ] **Step 1: Write the failing tests**

```python
# services/api/tests/test_extraction_limits.py
import pytest

from services.auth_service import Session
from services.extraction_service import ExtractionError, ExtractionService
from services.guest_service import GuestService


class FakeExtractionService(ExtractionService):
    """Skips real yt-dlp/ffmpeg calls so we can test quota/credit logic only."""

    def _download_source(self, url, file_id):
        return "/fake/source.mp4"

    def _ffmpeg_extract(self, input_path, output_path, start, end):
        pass

    def storage_get_file_size_override(self, size):
        self._fake_size = size


def make_session(role="user", balance=10):
    return Session(user_id="user_1", role=role, provider="ghost", b1t_balance=balance)


class TestGuestClipLimitUnchanged:
    def test_guest_clip_over_20s_still_rejected(self, tmp_data_dir, monkeypatch):
        svc = FakeExtractionService()
        monkeypatch.setattr(svc.storage, "get_file_size", lambda p: 1024)
        session = Session(user_id="guest", role="guest", provider="none", b1t_balance=0)
        with pytest.raises(ExtractionError, match="20 seconds"):
            svc.extract_clip(
                url="https://example.com/v", start=0, end=25, session=session
            )

    def test_guest_clip_20s_or_under_allowed(self, tmp_data_dir, monkeypatch):
        svc = FakeExtractionService()
        monkeypatch.setattr(svc.storage, "get_file_size", lambda p: 1024)
        monkeypatch.setattr(svc.storage, "delete_file", lambda p: True)
        session = Session(user_id="guest", role="guest", provider="none", b1t_balance=0)
        file_id = svc.extract_clip(
            url="https://example.com/v", start=0, end=15, session=session
        )
        assert file_id


class TestRegisteredUserUnlimitedDuration:
    def test_registered_user_can_extract_long_clip_with_sufficient_balance(
        self, tmp_data_dir, monkeypatch
    ):
        svc = FakeExtractionService()
        monkeypatch.setattr(svc.storage, "get_file_size", lambda p: 1024)
        monkeypatch.setattr(svc.storage, "delete_file", lambda p: True)
        session = make_session(balance=10)
        # 600s clip — would have failed the old 20s guest cap; users have no cap.
        file_id = svc.extract_clip(
            url="https://example.com/v", start=0, end=600, session=session
        )
        assert file_id

    def test_registered_user_rejected_with_insufficient_balance_for_transcript(
        self, tmp_data_dir, monkeypatch
    ):
        svc = FakeExtractionService()
        monkeypatch.setattr(svc.storage, "get_file_size", lambda p: 1024)
        session = make_session(balance=0)
        with pytest.raises(ExtractionError, match="Insufficient"):
            svc.extract_clip(
                url="https://example.com/v",
                start=0,
                end=600,
                session=session,
                operation="transcript",
            )


class TestGuestFreeDownload:
    def test_first_free_download_succeeds_with_no_size_cap(
        self, tmp_data_dir, monkeypatch
    ):
        svc = FakeExtractionService()
        monkeypatch.setattr(svc.storage, "get_file_size", lambda p: 200 * 1024 * 1024)
        monkeypatch.setattr(svc.storage, "delete_file", lambda p: True)
        session = Session(user_id="guest", role="guest", provider="none", b1t_balance=0)
        file_id = svc.extract_source(
            url="https://example.com/v", session=session, guest_token="tok-1"
        )
        assert file_id
        assert GuestService().has_used_free_download("tok-1") is True

    def test_second_free_download_rejected(self, tmp_data_dir, monkeypatch):
        svc = FakeExtractionService()
        monkeypatch.setattr(svc.storage, "get_file_size", lambda p: 1024)
        monkeypatch.setattr(svc.storage, "delete_file", lambda p: True)
        session = Session(user_id="guest", role="guest", provider="none", b1t_balance=0)
        GuestService().mark_free_download_used("tok-1")
        with pytest.raises(ExtractionError, match="already used"):
            svc.extract_source(
                url="https://example.com/v", session=session, guest_token="tok-1"
            )
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services/api && pytest tests/test_extraction_limits.py -v`
Expected: fails — `extract_clip()` doesn't accept `session=`/`operation=` kwargs, and
`extract_source` doesn't exist yet.

- [ ] **Step 3: Rewrite `ExtractionService` quota logic**

Replace the body of `services/api/services/extraction_service.py` from the top through
the end of `extract_clip` (lines 1–117 in the current file) with:

```python
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
```

Note: `extract_source`'s `finally: self.storage.delete_file(Path(source_path))` is safe
after the rename because `delete_file` checks `path.exists()` first (see
`storage_service.py:61`) — after a successful rename the source path no longer exists, so
this is a no-op cleanup for the success path and a real cleanup on any exception raised
before the rename.

- [ ] **Step 4: Keep `_download_source` and `_ffmpeg_extract` unchanged**

The rest of the original file (`_download_source` and `_ffmpeg_extract` methods,
currently lines 119–235) is unchanged — leave them exactly as-is below the code from
Step 3.

- [ ] **Step 5: Update `AuthMiddleware` to extract the guest token header**

In `services/api/middleware.py`, modify the `dispatch` method of `AuthMiddleware`:

```python
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        public_paths = [
            "/health",
            "/version",
            "/api/v1/media/inspect",
            "/docs",
            "/openapi.json",
        ]
        if request.url.path in public_paths:
            return await call_next(request)

        # Extract bearer token
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        # Extract guest token (spec §3 — one-time free unlimited download)
        request.state.guest_token = request.headers.get("X-M2P-Guest-Token")

        # Validate token
        try:
            session = await auth_service.validate_token(token)
        except AuthError as exc:
            raise HTTPException(status_code=403, detail=str(exc))

        request.state.session = session
        return await call_next(request)
```

- [ ] **Step 6: Update `main.py` call sites**

In `services/api/main.py`, replace the `extract_clip` endpoint body's try block:

```python
    session = getattr(req.state, "session", None)
    if session is None:
        from services.auth_service import AuthService as _AuthService
        session = _AuthService()._guest_session()

    log.info(
        "Extract requested: url=%s, start=%.1f, end=%.1f, role=%s",
        request.url,
        request.start,
        request.end,
        session.role,
    )

    try:
        file_id = extraction_service.extract_clip(
            url=request.url,
            start=request.start,
            end=request.end,
            session=session,
        )
```

And replace the `download_source` endpoint (`/api/v1/jobs/download`) entirely:

```python
@app.post("/api/v1/jobs/download")
async def download_source(request: InspectRequest, req: Request):
    """Download full source media (§02, §08, spec §3).

    Registered users: unlimited, B1T\$-gated. Guests: one free unlimited
    download per guest_token, then rejected.
    """
    session = getattr(req.state, "session", None)
    if session is None:
        from services.auth_service import AuthService as _AuthService
        session = _AuthService()._guest_session()

    guest_token = getattr(req.state, "guest_token", None)

    log.info(
        "Source download requested: url=%s, user=%s, role=%s",
        request.url,
        session.user_id,
        session.role,
    )

    try:
        file_id = extraction_service.extract_source(
            url=request.url,
            session=session,
            guest_token=guest_token,
        )
    except ExtractionError as exc:
        log.warning("Source download failed: %s", exc)
        status = 403 if "already used" in str(exc) or "registration" in str(exc) else 422
        if "Insufficient" in str(exc):
            status = 402
        raise HTTPException(status_code=status, detail=str(exc))
    except Exception as exc:
        log.error("Unexpected download error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during download.",
        )

    return {"file_id": file_id, "status": "ready"}
```

Also update the `extract_clip` endpoint's exception handling to map `InsufficientCreditsError`-originated messages to 402:

```python
    except ExtractionError as exc:
        log.warning("Extraction failed: %s", exc)
        status = 402 if "Insufficient" in str(exc) else 422
        raise HTTPException(status_code=status, detail=str(exc))
```

- [ ] **Step 7: Run the new tests**

Run: `cd services/api && pytest tests/test_extraction_limits.py -v`
Expected: `6 passed`

- [ ] **Step 8: Run the full backend test suite to check for regressions**

Run: `cd services/api && pytest -v`
Expected: all tests pass (harness smoke test, credit service, guest service, extraction
limits).

- [ ] **Step 9: Commit**

```bash
git add services/api/middleware.py services/api/services/extraction_service.py services/api/main.py services/api/tests/test_extraction_limits.py
git commit -m "feat: gate registered-user extraction/download by B1T\$ credits, add guest free-download flow"
```

---

## Task 5: File ownership check on `/api/v1/files/{file_id}`

**Files:**
- Modify: `services/api/main.py`
- Modify: `services/api/services/extraction_service.py` (file_id → owner tracking)
- Test: `services/api/tests/test_files_ownership.py`

**Interfaces:**
- Consumes: `_jobs` dict already defined in `main.py`.
- Produces: `_jobs[file_id]` gains an `"owner"` key (`session.user_id` for registered
  users, `f"guest:{guest_token}"` for guests). `GET`/`DELETE /api/v1/files/{file_id}`
  return `403` if the requester's identity doesn't match the stored owner, `404` if
  unknown — never falls back to prefix-matching the filename.

- [ ] **Step 1: Write the failing test**

```python
# services/api/tests/test_files_ownership.py
from fastapi.testclient import TestClient

import main as main_module
from main import app

client = TestClient(app)


def _reset_jobs():
    main_module._jobs.clear()


def test_owner_can_download_their_file(tmp_data_dir, monkeypatch):
    _reset_jobs()
    clips_dir = main_module.storage_service.clips_dir
    clips_dir.mkdir(parents=True, exist_ok=True)
    file_path = clips_dir / "abc123_deadbeef.mp4"
    file_path.write_bytes(b"fake video bytes")

    main_module._jobs["abc123"] = {
        "id": "abc123",
        "status": "ready",
        "media_id": None,
        "start": 0,
        "end": 10,
        "file_id": "abc123",
        "error": None,
        "created_at": 0,
        "expires_at": None,
        "owner": "guest:tok-1",
        "path": str(file_path),
    }

    resp = client.get(
        "/api/v1/files/abc123", headers={"X-M2P-Guest-Token": "tok-1"}
    )
    assert resp.status_code == 200


def test_non_owner_guest_is_forbidden(tmp_data_dir):
    _reset_jobs()
    clips_dir = main_module.storage_service.clips_dir
    clips_dir.mkdir(parents=True, exist_ok=True)
    file_path = clips_dir / "abc123_deadbeef.mp4"
    file_path.write_bytes(b"fake video bytes")

    main_module._jobs["abc123"] = {
        "id": "abc123",
        "status": "ready",
        "media_id": None,
        "start": 0,
        "end": 10,
        "file_id": "abc123",
        "error": None,
        "created_at": 0,
        "expires_at": None,
        "owner": "guest:tok-1",
        "path": str(file_path),
    }

    resp = client.get(
        "/api/v1/files/abc123", headers={"X-M2P-Guest-Token": "tok-OTHER"}
    )
    assert resp.status_code == 403


def test_unknown_file_id_is_404(tmp_data_dir):
    _reset_jobs()
    resp = client.get("/api/v1/files/does-not-exist")
    assert resp.status_code == 404


def test_prefix_collision_is_not_exploitable(tmp_data_dir):
    """Two files sharing an 8-char prefix must not be confusable — the old
    startswith(file_id[:8]) matching is gone in favor of the exact stored path."""
    _reset_jobs()
    clips_dir = main_module.storage_service.clips_dir
    clips_dir.mkdir(parents=True, exist_ok=True)
    victim_path = clips_dir / "abc12345_victim.mp4"
    victim_path.write_bytes(b"victim bytes")

    main_module._jobs["abc12345victimid"] = {
        "id": "abc12345victimid",
        "status": "ready",
        "media_id": None,
        "start": 0,
        "end": 10,
        "file_id": "abc12345victimid",
        "error": None,
        "created_at": 0,
        "expires_at": None,
        "owner": "guest:victim-token",
        "path": str(victim_path),
    }

    resp = client.get(
        "/api/v1/files/abc12345attacker",
        headers={"X-M2P-Guest-Token": "attacker-token"},
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services/api && pytest tests/test_files_ownership.py -v`
Expected: fails — current `_jobs` entries have no `"owner"`/`"path"` keys and the
endpoint still does prefix scanning, so `test_non_owner_guest_is_forbidden` and
`test_prefix_collision_is_not_exploitable` fail (200/found instead of 403/404).

- [ ] **Step 3: Track owner and exact path when jobs are created**

In `services/api/main.py`, update the `extract_clip` endpoint's job-record construction
(the `_jobs[file_id] = {...}` block) to add owner/path tracking. First add a helper near
the top of the file, after the `_jobs` declaration:

```python
def _owner_key(session, guest_token: str | None) -> str:
    if session.role == "guest":
        return f"guest:{guest_token}" if guest_token else "guest:anonymous"
    return f"user:{session.user_id}"
```

Then in the `extract_clip` endpoint, change the job dict assignment to:

```python
    now = time.time()
    ttl = int(os.getenv("CLIP_TTL_SECONDS", "3600"))
    clip_path = storage_service.clips_dir
    matched_path = next(
        (p for p in clip_path.iterdir() if p.stem.startswith(file_id)), None
    )
    guest_token = getattr(req.state, "guest_token", None)
    _jobs[file_id] = {
        "id": file_id,
        "status": "ready",
        "media_id": None,
        "start": request.start,
        "end": request.end,
        "file_id": file_id,
        "error": None,
        "created_at": now,
        "expires_at": now + ttl,
        "owner": _owner_key(session, guest_token),
        "path": str(matched_path) if matched_path else None,
    }
```

And in `download_source`, after `file_id = extraction_service.extract_source(...)`
succeeds, add the same tracking before the `return`:

```python
    now = time.time()
    ttl = int(os.getenv("CLIP_TTL_SECONDS", "3600"))
    clip_path = storage_service.clips_dir
    matched_path = next(
        (p for p in clip_path.iterdir() if p.stem.startswith(file_id)), None
    )
    _jobs[file_id] = {
        "id": file_id,
        "status": "ready",
        "media_id": None,
        "start": None,
        "end": None,
        "file_id": file_id,
        "error": None,
        "created_at": now,
        "expires_at": now + ttl,
        "owner": _owner_key(session, guest_token),
        "path": str(matched_path) if matched_path else None,
    }

    return {"file_id": file_id, "status": "ready"}
```

Note: `StorageService.get_clip_path` generates filenames as
`f"{safe_id}_{uuid.uuid4().hex[:8]}.{ext}"` where `safe_id` is the full `file_id` passed
in (not truncated) — so `p.stem.startswith(file_id)` with the **full** `file_id` (not
`file_id[:8]`) uniquely and safely identifies the file, unlike the old
`entry.stem.startswith(file_id[:8])`.

- [ ] **Step 4: Replace the download/delete endpoints with ownership checks**

Replace both `download_file` and `delete_file` endpoints in `main.py`:

```python
@app.get("/api/v1/files/{file_id}")
async def download_file(file_id: str, req: Request):
    """Download an extracted file, restricted to its owner (spec §2)."""
    job = _jobs.get(file_id)
    if not job or not job.get("path"):
        raise HTTPException(status_code=404, detail="File not found")

    session = getattr(req.state, "session", None)
    if session is None:
        from services.auth_service import AuthService as _AuthService
        session = _AuthService()._guest_session()
    guest_token = getattr(req.state, "guest_token", None)

    if job["owner"] != _owner_key(session, guest_token):
        raise HTTPException(status_code=403, detail="You do not have access to this file.")

    path = Path(job["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(path),
        media_type="video/mp4",
        filename=f"m2p_clip_{file_id[:8]}.mp4",
    )


@app.delete("/api/v1/files/{file_id}")
async def delete_file(file_id: str, req: Request):
    """Delete a file, restricted to its owner (spec §2)."""
    job = _jobs.get(file_id)
    if not job or not job.get("path"):
        raise HTTPException(status_code=404, detail="File not found")

    session = getattr(req.state, "session", None)
    if session is None:
        from services.auth_service import AuthService as _AuthService
        session = _AuthService()._guest_session()
    guest_token = getattr(req.state, "guest_token", None)

    if job["owner"] != _owner_key(session, guest_token):
        raise HTTPException(status_code=403, detail="You do not have access to this file.")

    path = Path(job["path"])
    storage_service.delete_file(path)
    del _jobs[file_id]
    return {"status": "deleted"}
```

- [ ] **Step 5: Run the ownership tests**

Run: `cd services/api && pytest tests/test_files_ownership.py -v`
Expected: `4 passed`

- [ ] **Step 6: Run the full backend suite**

Run: `cd services/api && pytest -v`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add services/api/main.py services/api/tests/test_files_ownership.py
git commit -m "fix: enforce exact file_id match and ownership check on file download/delete"
```

---

## Task 6: `/api/v1/me/quota` response shape and `/api/v1/b1t/purchase` stub endpoint

**Files:**
- Modify: `services/api/main.py`
- Modify: `services/api/models.py`
- Modify: `services/api/config.py`
- Test: `services/api/tests/test_quota_and_purchase.py`

**Interfaces:**
- Produces:
  - `models.PurchaseRequest(tier: int)`, `models.PurchaseResponse(status: str,
    b1t_credited: int | None, message: str)`.
  - `POST /api/v1/b1t/purchase` — `501` in default config, credits in dev config.
  - `/api/v1/me/quota` response gains `free_download_used: bool | None`.
  - `config.settings.M2P_DEV_CREDIT_GRANTS: bool`,
    `config.settings.B1T_PACKAGE_TIERS: dict[int, int]` (tier index → B1T$ amount, e.g.
    `{1: 100, 2: 500, 3: 1000}`).

- [ ] **Step 1: Write the failing tests**

```python
# services/api/tests/test_quota_and_purchase.py
from fastapi.testclient import TestClient

from config import settings
from main import app

client = TestClient(app)


def test_quota_includes_free_download_used_for_guest(tmp_data_dir):
    resp = client.get(
        "/api/v1/me/quota", headers={"X-M2P-Guest-Token": "tok-fresh"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["free_download_used"] is False


def test_quota_free_download_used_true_after_marking(tmp_data_dir):
    from services.guest_service import GuestService

    GuestService().mark_free_download_used("tok-used")
    resp = client.get(
        "/api/v1/me/quota", headers={"X-M2P-Guest-Token": "tok-used"}
    )
    body = resp.json()
    assert body["free_download_used"] is True


def test_purchase_returns_501_by_default(tmp_data_dir, monkeypatch):
    monkeypatch.setattr(settings, "M2P_DEV_CREDIT_GRANTS", False)
    resp = client.post("/api/v1/b1t/purchase", json={"tier": 1})
    assert resp.status_code == 501


def test_purchase_credits_balance_in_dev_mode(tmp_data_dir, monkeypatch):
    monkeypatch.setattr(settings, "M2P_DEV_CREDIT_GRANTS", True)
    resp = client.post("/api/v1/b1t/purchase", json={"tier": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert body["b1t_credited"] == 500
    assert body["status"] == "granted"


def test_purchase_rejects_unknown_tier(tmp_data_dir, monkeypatch):
    monkeypatch.setattr(settings, "M2P_DEV_CREDIT_GRANTS", True)
    resp = client.post("/api/v1/b1t/purchase", json={"tier": 99})
    assert resp.status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services/api && pytest tests/test_quota_and_purchase.py -v`
Expected: fails — `/api/v1/b1t/purchase` doesn't exist (404), quota response lacks
`free_download_used`.

- [ ] **Step 3: Add config fields**

In `services/api/config.py`, add after the `ENABLE_B1T_CREDITS` block:

```python
    # ── B1T$ purchase (spec §4) ─────────────────────────────────────────
    M2P_DEV_CREDIT_GRANTS: bool = os.getenv(
        "M2P_DEV_CREDIT_GRANTS", "false"
    ).lower() in ("1", "true", "yes")
    B1T_PACKAGE_TIERS: dict = {1: 100, 2: 500, 3: 1000}
```

- [ ] **Step 4: Add request/response models**

In `services/api/models.py`, add:

```python
class PurchaseRequest(BaseModel):
    """Request body for POST /api/v1/b1t/purchase (spec §4)."""

    tier: int = Field(..., description="Package tier index (1, 2, or 3)")


class PurchaseResponse(BaseModel):
    """Response from POST /api/v1/b1t/purchase (spec §4)."""

    status: str
    b1t_credited: Optional[int] = None
    message: str
```

- [ ] **Step 5: Update `/api/v1/me/quota` and add the purchase endpoint**

In `services/api/main.py`, update the imports:

```python
from models import (
    InspectRequest,
    InspectResponse,
    ExtractRequest,
    ExtractResponse,
    JobResponse,
    HealthResponse,
    VersionResponse,
    PurchaseRequest,
    PurchaseResponse,
)
```

Update the `get_quota` endpoint body to add `free_download_used`:

```python
@app.get("/api/v1/me/quota")
async def get_quota(request: Request):
    """Get user quota (§17, spec §3)."""
    session = getattr(request.state, "session", None)
    if not session:
        session = auth_service._guest_session()

    quota = session.quota or {
        "max_clip_seconds": settings.GUEST_MAX_CLIP_SECONDS,
        "max_file_size": settings.GUEST_MAX_FILE_SIZE,
        "daily_jobs": settings.USER_DAILY_JOBS,
        "storage_quota": settings.USER_STORAGE_QUOTA,
    }

    free_download_used = None
    if session.role == "guest":
        guest_token = getattr(request.state, "guest_token", None)
        free_download_used = (
            guest_service.has_used_free_download(guest_token) if guest_token else False
        )

    return {
        "role": session.role,
        "max_clip_seconds": quota.get("max_clip_seconds") if session.role == "guest" else None,
        "max_file_size": quota.get("max_file_size") if session.role == "guest" else None,
        "daily_jobs_remaining": quota.get("daily_jobs"),
        "b1t_balance": session.b1t_balance,
        "free_download_used": free_download_used,
    }
```

Add `guest_service = GuestService()` to the services block near the top of `main.py`
(alongside the other `*_service = *Service()` lines) and import it:

```python
from services.guest_service import GuestService
```

Add the purchase endpoint at the end of the file:

```python
@app.post("/api/v1/b1t/purchase", response_model=PurchaseResponse)
async def purchase_b1t(request: PurchaseRequest) -> PurchaseResponse:
    """Buy B1T\$ credits (spec §4). Stub — real payment integration is out of scope.

    Default config: always returns 501. When M2P_DEV_CREDIT_GRANTS=true, grants
    the tier's credits so the UI flow is demoable without a payment provider.
    """
    if not settings.M2P_DEV_CREDIT_GRANTS:
        raise HTTPException(
            status_code=501,
            detail="B1T$ purchases are not yet available.",
        )

    amount = settings.B1T_PACKAGE_TIERS.get(request.tier)
    if amount is None:
        raise HTTPException(status_code=422, detail="Unknown package tier.")

    return PurchaseResponse(
        status="granted",
        b1t_credited=amount,
        message=f"{amount} B1T$ credited (dev mode).",
    )
```

- [ ] **Step 6: Run the new tests**

Run: `cd services/api && pytest tests/test_quota_and_purchase.py -v`
Expected: `5 passed`

- [ ] **Step 7: Run the full backend suite**

Run: `cd services/api && pytest -v`
Expected: all tests pass, no regressions.

- [ ] **Step 8: Commit**

```bash
git add services/api/main.py services/api/models.py services/api/config.py services/api/tests/test_quota_and_purchase.py
git commit -m "feat: add free_download_used to quota response and stub B1T\$ purchase endpoint"
```

---

## Task 7: Frontend test harness (vitest)

**Files:**
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/src/test/setup.ts`

**Interfaces:**
- Produces: `npm run test` script; `vitest` + `@testing-library/react` +
  `@testing-library/jest-dom` + `jsdom` available for component tests.

- [ ] **Step 1: Install test dependencies**

Run: `cd apps/web && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
Expected: packages install without errors.

- [ ] **Step 2: Add the test script to `package.json`**

In `apps/web/package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create the vitest config**

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create the test setup file**

```typescript
// apps/web/src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Write a smoke test**

```typescript
// apps/web/src/test/smoke.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from '../components/Logo'

describe('test harness smoke test', () => {
  it('renders the Logo component', () => {
    render(<Logo data-testid="logo" />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the smoke test**

Run: `cd apps/web && npm run test`
Expected: `1 passed`

- [ ] **Step 7: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/package.json apps/web/package-lock.json apps/web/src/test/
git commit -m "test: add vitest harness with jsdom and testing-library"
```

---

## Task 8: Guest token generation and API client auth headers

**Files:**
- Create: `apps/web/src/lib/guestToken.ts`
- Test: `apps/web/src/lib/guestToken.test.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/types/index.ts`

**Interfaces:**
- Produces:
  - `getGuestToken(): string` — reads/creates `localStorage["m2p-guest-token"]`.
  - `getAuthToken(): string | null` — reads `localStorage["m2p-auth-token"]`.
  - `setAuthToken(token: string | null): void`.
  - `apiFetch` internal helper in `api.ts` that attaches `X-M2P-Guest-Token` always and
    `Authorization: Bearer <token>` when `getAuthToken()` is non-null.
  - `purchaseB1t(tier: number): Promise<PurchaseResponse>`.
  - `types/index.ts` gains `PurchaseRequestSchema`/`PurchaseResponseSchema` and
    `QuotaResponseSchema` (with `free_download_used`).

- [ ] **Step 1: Write the failing test for `guestToken.ts`**

```typescript
// apps/web/src/lib/guestToken.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getGuestToken } from './guestToken'

describe('getGuestToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates a token on first call and persists it', () => {
    const token = getGuestToken()
    expect(token).toBeTruthy()
    expect(localStorage.getItem('m2p-guest-token')).toBe(token)
  })

  it('returns the same token on subsequent calls', () => {
    const first = getGuestToken()
    const second = getGuestToken()
    expect(second).toBe(first)
  })

  it('generates a different token after localStorage is cleared', () => {
    const first = getGuestToken()
    localStorage.clear()
    const second = getGuestToken()
    expect(second).not.toBe(first)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npm run test -- guestToken`
Expected: fails — `./guestToken` module doesn't exist.

- [ ] **Step 3: Implement `guestToken.ts`**

```typescript
// apps/web/src/lib/guestToken.ts
const GUEST_TOKEN_KEY = 'm2p-guest-token'
const AUTH_TOKEN_KEY = 'm2p-auth-token'

export function getGuestToken(): string {
  let token = localStorage.getItem(GUEST_TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(GUEST_TOKEN_KEY, token)
  }
  return token
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web && npm run test -- guestToken`
Expected: `3 passed`

- [ ] **Step 5: Add purchase types to `types/index.ts`**

Add to `apps/web/src/types/index.ts`, after the `VersionResponseSchema` block:

```typescript
export const PurchaseRequestSchema = z.object({
  tier: z.number().int(),
})

export const PurchaseResponseSchema = z.object({
  status: z.string(),
  b1t_credited: z.number().optional().nullable(),
  message: z.string(),
})

export type PurchaseRequest = z.infer<typeof PurchaseRequestSchema>
export type PurchaseResponse = z.infer<typeof PurchaseResponseSchema>

export const QuotaResponseSchema = z.object({
  role: z.string(),
  max_clip_seconds: z.number().optional().nullable(),
  max_file_size: z.number().optional().nullable(),
  daily_jobs_remaining: z.number().optional().nullable(),
  b1t_balance: z.number(),
  free_download_used: z.boolean().optional().nullable(),
})

export type QuotaResponse = z.infer<typeof QuotaResponseSchema>
```

- [ ] **Step 6: Update `api.ts` to attach headers and add `purchaseB1t`**

Replace the full contents of `apps/web/src/lib/api.ts`:

```typescript
import type {
  InspectRequest,
  InspectResponse,
  ExtractRequest,
  ExtractResponse,
  JobResponse,
  PurchaseRequest,
  PurchaseResponse,
  QuotaResponse,
} from "../types";
import { getGuestToken, getAuthToken } from "./guestToken";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-M2P-Guest-Token": getGuestToken(),
  };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
}

async function parseErrorOrThrow(response: Response, fallback: string): Promise<never> {
  const error = await response.json().catch(() => ({}));
  throw new Error((error as { detail?: string }).detail || fallback);
}

export async function inspectMedia(
  request: InspectRequest,
): Promise<InspectResponse> {
  const response = await apiFetch("/api/v1/media/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to inspect media");
  return response.json();
}

export async function extractClip(
  request: ExtractRequest,
): Promise<ExtractResponse> {
  const response = await apiFetch("/api/v1/jobs/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to extract clip");
  return response.json();
}

export async function downloadSource(
  request: InspectRequest,
): Promise<ExtractResponse> {
  const response = await apiFetch("/api/v1/jobs/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to download source");
  return response.json();
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const response = await apiFetch(`/api/v1/jobs/${jobId}`);
  if (!response.ok) return parseErrorOrThrow(response, "Failed to get job status");
  return response.json();
}

export function getFileUrl(fileId: string): string {
  return `${API_BASE}/api/v1/files/${fileId}`;
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Health check failed");
  return response.json();
}

export async function getVersion(): Promise<{
  version: string;
  yt_dlp?: string | null;
  ffmpeg?: string | null;
}> {
  const response = await fetch(`${API_BASE}/version`);
  if (!response.ok) throw new Error("Version check failed");
  return response.json();
}

export async function getMe(): Promise<any> {
  const response = await apiFetch("/api/v1/me");
  if (!response.ok) throw new Error("Failed to get session");
  return response.json();
}

export async function getQuota(): Promise<QuotaResponse> {
  const response = await apiFetch("/api/v1/me/quota");
  if (!response.ok) throw new Error("Failed to get quota");
  return response.json();
}

export async function purchaseB1t(tier: number): Promise<PurchaseResponse> {
  const request: PurchaseRequest = { tier };
  const response = await apiFetch("/api/v1/b1t/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseErrorOrThrow(response, "Failed to purchase B1T$");
  return response.json();
}
```

- [ ] **Step 7: Run the full frontend test suite**

Run: `cd apps/web && npm run test`
Expected: all tests pass (smoke test + guestToken tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/guestToken.ts apps/web/src/lib/guestToken.test.ts apps/web/src/lib/api.ts apps/web/src/types/index.ts
git commit -m "feat: add guest token generation and auth header plumbing to API client"
```

---

## Task 9: Fix `ClipEditor` — quota-driven cap, drop broken video preview

**Files:**
- Modify: `apps/web/src/features/extractor/ClipEditor.tsx`
- Test: `apps/web/src/features/extractor/ClipEditor.test.tsx`

**Interfaces:**
- Consumes: `QuotaResponse` type (Task 8).
- Produces: `ClipEditor` gains a required `maxClipSeconds: number | null` prop (`null` =
  unlimited); drops the `videoRef`/`<video>` element and `getVideoSource` function;
  replaces the scrub timeline's playback controls with numeric MM:SS `<input>` fields for
  IN/OUT bound to `inPoint`/`outPoint` state (keyboard shortcuts I/O/arrow-seek are
  removed since there's no longer a playing video to seek).

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/features/extractor/ClipEditor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClipEditor } from './ClipEditor'
import type { InspectResponse } from '../../types'

const media: InspectResponse = {
  id: 'abc',
  title: 'Test Video',
  creator: null,
  duration: 3600,
  thumbnail: 'https://example.com/thumb.jpg',
  platform: 'YouTube',
  webpage_url: 'https://example.com/v',
  upload_date: null,
  formats: [],
  subtitles: [],
}

describe('ClipEditor duration cap', () => {
  it('shows an error when selection exceeds a numeric cap', () => {
    const onExtract = vi.fn()
    render(
      <ClipEditor
        media={media}
        onExtract={onExtract}
        isExtracting={false}
        maxClipSeconds={20}
      />,
    )

    fireEvent.change(screen.getByLabelText(/out point/i), {
      target: { value: '00:30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract clip/i }))

    expect(screen.getByText(/20 seconds/i)).toBeInTheDocument()
    expect(onExtract).not.toHaveBeenCalled()
  })

  it('allows any duration when maxClipSeconds is null', () => {
    const onExtract = vi.fn()
    render(
      <ClipEditor
        media={media}
        onExtract={onExtract}
        isExtracting={false}
        maxClipSeconds={null}
      />,
    )

    fireEvent.change(screen.getByLabelText(/out point/i), {
      target: { value: '10:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract clip/i }))

    expect(screen.queryByText(/exceeds/i)).not.toBeInTheDocument()
    expect(onExtract).toHaveBeenCalledWith(0, 600)
  })

  it('does not render a video element', () => {
    render(
      <ClipEditor
        media={media}
        onExtract={vi.fn()}
        isExtracting={false}
        maxClipSeconds={20}
      />,
    )
    expect(document.querySelector('video')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npm run test -- ClipEditor`
Expected: fails — `maxClipSeconds` prop doesn't exist, no "out point" labeled input
exists yet, and a `<video>` element is currently rendered.

- [ ] **Step 3: Rewrite `ClipEditor.tsx`**

```typescript
/**
 * ClipEditor — IN/OUT selector with quota-driven duration cap (§12, spec §2).
 *
 * Numeric MM:SS inputs for IN/OUT replace scrub-bar video preview, since the
 * previous implementation set <video src={format_id}> to a bare yt-dlp
 * format ID rather than a playable URL (spec §2 bug fix).
 *
 * maxClipSeconds is quota-driven: null means unlimited (registered users,
 * spec §3), a number means the boundary is shown and enforced (guests).
 */

import { useState } from "react";
import type { InspectResponse } from "../../types";

interface ClipEditorProps {
  media: InspectResponse;
  onExtract: (start: number, end: number) => void;
  isExtracting: boolean;
  maxClipSeconds: number | null;
}

// Format seconds as MM:SS
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Parse "MM:SS" into seconds; returns null if invalid
function parseTime(value: string): number | null {
  const match = value.match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
}

export function ClipEditor({
  media,
  onExtract,
  isExtracting,
  maxClipSeconds,
}: ClipEditorProps) {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [inText, setInText] = useState(formatTime(0));
  const [outText, setOutText] = useState(formatTime(0));
  const [showError, setShowError] = useState<string | null>(null);

  const duration = media.duration ?? 0;
  const selectedDuration = outPoint - inPoint;

  const handleInChange = (value: string) => {
    setInText(value);
    const parsed = parseTime(value);
    if (parsed !== null) setInPoint(parsed);
  };

  const handleOutChange = (value: string) => {
    setOutText(value);
    const parsed = parseTime(value);
    if (parsed !== null) setOutPoint(parsed);
  };

  const handleExtract = () => {
    if (selectedDuration <= 0) {
      setShowError("Please select a segment (set IN and OUT points).");
      return;
    }
    if (maxClipSeconds !== null && selectedDuration > maxClipSeconds) {
      setShowError(
        `Guest extraction limit is ${maxClipSeconds} seconds. ` +
          `Your selection is ${selectedDuration.toFixed(1)} seconds.`,
      );
      return;
    }
    setShowError(null);
    onExtract(inPoint, outPoint);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      {/* Thumbnail (video scrubbing removed — spec §2 bug fix) */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        {media.thumbnail ? (
          <img
            src={media.thumbnail}
            alt={media.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <span>Preview not available for this source</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* IN/OUT numeric inputs */}
        <div className="flex justify-center gap-6">
          <label className="flex flex-col items-center gap-1 text-sm text-gray-400">
            IN point
            <input
              aria-label="In point"
              type="text"
              value={inText}
              onChange={(e) => handleInChange(e.target.value)}
              placeholder="00:00"
              className="w-24 px-2 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500"
            />
          </label>
          <label className="flex flex-col items-center gap-1 text-sm text-gray-400">
            OUT point
            <input
              aria-label="Out point"
              type="text"
              value={outText}
              onChange={(e) => handleOutChange(e.target.value)}
              placeholder="00:00"
              className="w-24 px-2 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500"
            />
          </label>
        </div>

        {/* Visual timeline */}
        {duration > 0 && (
          <div className="relative h-12">
            <div className="absolute inset-0 bg-gray-800 rounded-lg h-6 mt-3"></div>
            <div
              className="absolute top-3 h-6 border-2 border-red-500 rounded"
              style={{
                left: `${(inPoint / duration) * 100}%`,
                width: `${Math.max(((outPoint - inPoint) / duration) * 100, 0)}%`,
                minWidth: "2px",
              }}
            />
            {maxClipSeconds !== null && (
              <div
                className="absolute top-3 h-6 border border-yellow-500/50 rounded pointer-events-none"
                style={{
                  left: `${(inPoint / duration) * 100}%`,
                  width: `${(maxClipSeconds / duration) * 100}%`,
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        )}

        {/* Duration display */}
        <div className="text-center">
          <span className="text-lg font-medium text-white">
            Duration: {selectedDuration.toFixed(1)} sec
          </span>
          {maxClipSeconds !== null && selectedDuration > maxClipSeconds && (
            <span className="ml-2 text-sm text-red-400">
              (exceeds {maxClipSeconds}s guest limit)
            </span>
          )}
        </div>

        {showError && (
          <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
            {showError}
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={handleExtract}
            disabled={isExtracting || selectedDuration <= 0}
            className="px-6 py-3 text-lg font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {isExtracting ? "Extracting…" : "EXTRACT CLIP"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npm run test -- ClipEditor`
Expected: `3 passed`

- [ ] **Step 5: Update `Landing.tsx` to pass `maxClipSeconds`**

This is completed in Task 12 (Landing rewrite) where quota is fetched and threaded
through — no standalone edit here to avoid duplicate work.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/extractor/ClipEditor.tsx apps/web/src/features/extractor/ClipEditor.test.tsx
git commit -m "fix: replace broken video scrubbing with numeric IN/OUT inputs, make clip cap quota-driven"
```

---

## Task 10: Gate `DevModeToggle` behind dev builds

**Files:**
- Modify: `apps/web/src/components/DevModeToggle.tsx`
- Modify: `apps/web/src/routes/Landing.tsx` (usage site — completed alongside Task 12,
  noted here for the conditional render)

**Interfaces:**
- Produces: `DevModeToggle` component unchanged internally; a new named export
  `isDevModeAvailable: boolean` (`= import.meta.env.DEV`) that call sites use to decide
  whether to render it at all.

- [ ] **Step 1: Add the dev-only guard export**

In `apps/web/src/components/DevModeToggle.tsx`, add near the top (after the imports):

```typescript
export const isDevModeAvailable = import.meta.env.DEV;
```

- [ ] **Step 2: Verify the flag reflects the build mode**

Run: `cd apps/web && npm run build`
Expected: build succeeds (production build; `isDevModeAvailable` will be `false` in the
built output since Vite replaces `import.meta.env.DEV` at build time).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/DevModeToggle.tsx
git commit -m "fix: expose isDevModeAvailable flag so DevModeToggle can be excluded from prod builds"
```

(The actual conditional `{isDevModeAvailable && <DevModeToggle />}` render happens in
Task 12's `Landing.tsx` rewrite.)

---

## Task 11: `AuthStatus` register redirect and `BuyB1tModal`

**Files:**
- Modify: `apps/web/src/components/AuthStatus.tsx`
- Create: `apps/web/src/components/BuyB1tModal.tsx`
- Test: `apps/web/src/components/AuthStatus.test.tsx`
- Test: `apps/web/src/components/BuyB1tModal.test.tsx`

**Interfaces:**
- Consumes: `purchaseB1t` (Task 8), `getAuthToken`/`setAuthToken` (Task 8).
- Produces:
  - `AuthStatus` renders a real anchor/button pointing at
    `import.meta.env.VITE_LAGRIETA_AUTH_URL`; disabled with "Coming soon" when unset.
  - `BuyB1tModal({ isOpen, onClose, onPurchased }: BuyB1tModalProps)` — new component,
    exported from `apps/web/src/components/BuyB1tModal.tsx`.

- [ ] **Step 1: Write the failing test for `AuthStatus`**

```typescript
// apps/web/src/components/AuthStatus.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthStatus } from './AuthStatus'
import * as api from '../lib/api'

describe('AuthStatus register button', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ role: 'guest' })
    vi.spyOn(api, 'getQuota').mockResolvedValue({
      role: 'guest',
      max_clip_seconds: 20,
      max_file_size: 50000000,
      daily_jobs_remaining: null,
      b1t_balance: 0,
      free_download_used: false,
    })
  })

  it('disables the register link when VITE_LAGRIETA_AUTH_URL is unset', async () => {
    render(<AuthStatus />)
    const link = await screen.findByRole('link', { name: /sign in with lagrieta/i })
    expect(link).toHaveAttribute('aria-disabled', 'true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npm run test -- AuthStatus`
Expected: fails — current `AuthStatus` renders a `<button>` with an `alert()` onClick,
not a `<link>` role element with `aria-disabled`.

- [ ] **Step 3: Rewrite `AuthStatus.tsx`**

```typescript
/**
 * AuthStatus — shows current user state and register/sign-out (spec §4).
 *
 * Register redirects to LaGrieta's auth (VITE_LAGRIETA_AUTH_URL); disabled
 * with a "Coming soon" state until that URL is configured, since LAG-Bridge
 * is not yet live on the LaGrieta side (docs/LAG-BRIDGE.md).
 */

import { useState, useEffect } from "react";
import { getQuota, getMe } from "../lib/api";
import { setAuthToken } from "../lib/guestToken";
import type { Session } from "../types";

const LAGRIETA_AUTH_URL = import.meta.env.VITE_LAGRIETA_AUTH_URL as
  | string
  | undefined;

export function AuthStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const [me, quota] = await Promise.all([getMe(), getQuota()]);
        setSession({
          ...me,
          quota: {
            max_clip_seconds: quota.max_clip_seconds,
            max_file_size: quota.max_file_size,
            daily_jobs: quota.daily_jobs_remaining,
            storage_quota: 0,
          },
          b1t_balance: quota.b1t_balance,
        } as Session);
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  if (!session || session.role === "guest") {
    return (
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>
          <span className="text-red-400 font-medium">Guest:</span> 20s clip limit
        </span>
        <a
          href={LAGRIETA_AUTH_URL || "#"}
          aria-disabled={!LAGRIETA_AUTH_URL}
          title={!LAGRIETA_AUTH_URL ? "Coming soon" : undefined}
          onClick={(e) => {
            if (!LAGRIETA_AUTH_URL) e.preventDefault();
          }}
          className={`px-3 py-1 text-sm text-white bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 ${
            !LAGRIETA_AUTH_URL ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Sign in with LaGrieta
        </a>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-300">
      <span className="text-green-400 font-medium">
        {session.name || session.email || session.user_id}
      </span>
      <span className="ml-2 text-gray-500">({session.role})</span>
      <span className="ml-2 text-gray-500">b1t$: {session.b1t_balance}</span>
      <button
        className="ml-4 px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
        onClick={() => {
          setAuthToken(null);
          setSession(null);
        }}
      >
        Sign out
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the `AuthStatus` test**

Run: `cd apps/web && npm run test -- AuthStatus`
Expected: `1 passed`

- [ ] **Step 5: Write the failing test for `BuyB1tModal`**

```typescript
// apps/web/src/components/BuyB1tModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BuyB1tModal } from './BuyB1tModal'
import * as api from '../lib/api'

describe('BuyB1tModal', () => {
  it('does not render when isOpen is false', () => {
    render(<BuyB1tModal isOpen={false} onClose={vi.fn()} onPurchased={vi.fn()} />)
    expect(screen.queryByText(/buy b1t/i)).not.toBeInTheDocument()
  })

  it('shows three package tiers when open', () => {
    render(<BuyB1tModal isOpen={true} onClose={vi.fn()} onPurchased={vi.fn()} />)
    expect(screen.getByText(/100 b1t/i)).toBeInTheDocument()
    expect(screen.getByText(/500 b1t/i)).toBeInTheDocument()
    expect(screen.getByText(/1000 b1t/i)).toBeInTheDocument()
  })

  it('calls purchaseB1t and onPurchased when a tier is confirmed', async () => {
    vi.spyOn(api, 'purchaseB1t').mockResolvedValue({
      status: 'granted',
      b1t_credited: 500,
      message: '500 B1T$ credited (dev mode).',
    })
    const onPurchased = vi.fn()
    render(<BuyB1tModal isOpen={true} onClose={vi.fn()} onPurchased={onPurchased} />)

    fireEvent.click(screen.getByRole('button', { name: /500 b1t/i }))

    await waitFor(() => expect(onPurchased).toHaveBeenCalledWith(500))
  })

  it('shows an error message when purchase is not yet available', async () => {
    vi.spyOn(api, 'purchaseB1t').mockRejectedValue(
      new Error('B1T$ purchases are not yet available.'),
    )
    render(<BuyB1tModal isOpen={true} onClose={vi.fn()} onPurchased={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /100 b1t/i }))

    expect(
      await screen.findByText(/not yet available/i),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd apps/web && npm run test -- BuyB1tModal`
Expected: fails — `./BuyB1tModal` module doesn't exist.

- [ ] **Step 7: Implement `BuyB1tModal.tsx`**

```typescript
/**
 * BuyB1tModal — package-tier B1T$ purchase entry point (spec §4).
 *
 * Backend is stubbed: returns 501 in production config, credits balance
 * only when M2P_DEV_CREDIT_GRANTS is set server-side.
 */

import { useState } from "react";
import { purchaseB1t } from "../lib/api";

interface BuyB1tModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchased: (creditedAmount: number) => void;
}

const TIERS: { tier: number; amount: number }[] = [
  { tier: 1, amount: 100 },
  { tier: 2, amount: 500 },
  { tier: 3, amount: 1000 },
];

export function BuyB1tModal({ isOpen, onClose, onPurchased }: BuyB1tModalProps) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuy = async (tier: number, amount: number) => {
    setPending(tier);
    setError(null);
    try {
      const result = await purchaseB1t(tier);
      if (result.b1t_credited) {
        onPurchased(result.b1t_credited);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
      void amount;
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Buy B1T$</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TIERS.map(({ tier, amount }) => (
            <button
              key={tier}
              onClick={() => handleBuy(tier, amount)}
              disabled={pending !== null}
              className="flex flex-col items-center gap-1 p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-red-500 disabled:opacity-50 transition-colors"
            >
              <span className="text-lg font-bold text-white">{amount} B1T$</span>
              {pending === tier && (
                <span className="text-xs text-gray-400">Processing…</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd apps/web && npm run test -- BuyB1tModal`
Expected: `4 passed`

- [ ] **Step 9: Run the full frontend suite**

Run: `cd apps/web && npm run test`
Expected: all tests pass, no regressions.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/AuthStatus.tsx apps/web/src/components/AuthStatus.test.tsx apps/web/src/components/BuyB1tModal.tsx apps/web/src/components/BuyB1tModal.test.tsx
git commit -m "feat: real LaGrieta register redirect and BuyB1tModal purchase UI"
```

---

## Task 12: HUD design tokens (Tailwind config + CSS)

**Files:**
- Modify: `apps/web/tailwind.config.js`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Produces: Tailwind utility classes `.hud-panel` (clipped-corner panel),
  `.hud-corner-brackets` (corner accent overlay), `.hud-scanlines` (background texture),
  `.hud-glow-border` (red glow border), `font-mono` readout styling (already present in
  `tailwind.config.js`, reused). No JS-side changes — pure CSS/config additions, so no
  automated test; verified visually in Task 13/14 component usage and manually in the
  browser (per this project's UI-change testing requirement).

- [ ] **Step 1: Extend `tailwind.config.js` with HUD color tokens**

Replace the `colors` block in `apps/web/tailwind.config.js`:

```javascript
      colors: {
        // M2P brand palette (§26): black/charcoal, white, red
        red: '#a00000',
        'red-dark': '#700000',
        'red-glow': 'rgba(160, 0, 0, 0.35)',
        charcoal: '#121212',
        'charcoal-light': '#bfbfbf',
        ink: '#e8e8e8',
      },
```

- [ ] **Step 2: Add HUD utility classes to `index.css`**

Replace the full contents of `apps/web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* M2P color scheme (§26): black/charcoal, white, red. HUD tokens: spec §5. */
:root {
  --m2p-red: #a00000;
  --m2p-red-dark: #700000;
  --m2p-red-glow: rgba(160, 0, 0, 0.35);
  --m2p-charcoal: #121212;
  --m2p-charcoal-light: #bfbfbf;
}

/* Ensure dark mode is the default — M2P is a dark, technical tool */
html {
  color-scheme: dark;
}

@layer components {
  /* Clipped-corner HUD panel (spec §5) */
  .hud-panel {
    clip-path: polygon(
      0 12px,
      12px 0,
      100% 0,
      100% calc(100% - 12px),
      calc(100% - 12px) 100%,
      0 100%
    );
  }

  /* Thin red-glow border for focus/active HUD elements (spec §5) */
  .hud-glow-border {
    border: 1px solid rgba(160, 0, 0, 0.6);
    box-shadow: 0 0 12px 0 var(--m2p-red-glow);
  }

  /* Corner bracket accents, absolutely positioned inside a `relative` parent */
  .hud-corner-brackets::before,
  .hud-corner-brackets::after {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: var(--m2p-red);
    pointer-events: none;
  }
  .hud-corner-brackets::before {
    top: 0;
    left: 0;
    border-top: 2px solid var(--m2p-red);
    border-left: 2px solid var(--m2p-red);
  }
  .hud-corner-brackets::after {
    bottom: 0;
    right: 0;
    border-bottom: 2px solid var(--m2p-red);
    border-right: 2px solid var(--m2p-red);
  }

  /* Subtle background grid texture — decorative only, sits behind text (spec §5 a11y) */
  .hud-scanlines {
    background-image: repeating-linear-gradient(
        0deg,
        rgba(255, 255, 255, 0.02) 0px,
        rgba(255, 255, 255, 0.02) 1px,
        transparent 1px,
        transparent 3px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.015) 0px,
        rgba(255, 255, 255, 0.015) 1px,
        transparent 1px,
        transparent 40px
      );
  }

  /* Angular button with a scan-line hover sweep (spec §5) — CSS only, no JS */
  .hud-button {
    position: relative;
    overflow: hidden;
    clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  }
  .hud-button::after {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(
      120deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transition: left 0.4s ease;
  }
  .hud-button:hover::after {
    left: 120%;
  }
}
```

- [ ] **Step 3: Verify the build compiles with the new Tailwind config**

Run: `cd apps/web && npm run build`
Expected: build succeeds with no Tailwind/PostCSS errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tailwind.config.js apps/web/src/index.css
git commit -m "feat: add HUD design tokens (clipped panels, glow borders, scanlines, angular buttons)"
```

---

## Task 13: `ProgressRail` component and `Logo` size variants

**Files:**
- Create: `apps/web/src/components/ProgressRail.tsx`
- Test: `apps/web/src/components/ProgressRail.test.tsx`
- Modify: `apps/web/src/components/Logo.tsx`

**Interfaces:**
- Produces:
  - `ProgressRail({ current }: { current: "input" | "source" | "extractor" | "result" })`
    — renders SOURCE → INSPECT → EXTRACT → DELIVER, highlighting the step matching
    `current` (mapped: `input`→SOURCE, `source`→INSPECT, `extractor`→EXTRACT,
    `result`→DELIVER).
  - `Logo` gains no new props (kept as a plain SVG component); call sites control size
    via `className` as before — verified this still works, no interface change needed
    here since `Logo` already accepts arbitrary `SVGProps`.

- [ ] **Step 1: Write the failing test for `ProgressRail`**

```typescript
// apps/web/src/components/ProgressRail.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressRail } from './ProgressRail'

describe('ProgressRail', () => {
  it('renders all four step labels', () => {
    render(<ProgressRail current="input" />)
    expect(screen.getByText('SOURCE')).toBeInTheDocument()
    expect(screen.getByText('INSPECT')).toBeInTheDocument()
    expect(screen.getByText('EXTRACT')).toBeInTheDocument()
    expect(screen.getByText('DELIVER')).toBeInTheDocument()
  })

  it('marks the step matching the current view as active', () => {
    render(<ProgressRail current="extractor" />)
    expect(screen.getByText('EXTRACT')).toHaveAttribute('aria-current', 'step')
  })

  it('does not mark other steps as active', () => {
    render(<ProgressRail current="extractor" />)
    expect(screen.getByText('SOURCE')).not.toHaveAttribute('aria-current')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npm run test -- ProgressRail`
Expected: fails — `./ProgressRail` module doesn't exist.

- [ ] **Step 3: Implement `ProgressRail.tsx`**

```typescript
/**
 * ProgressRail — 4-step HUD indicator matching the product pipeline
 * (SOURCE → INSPECT → EXTRACT → DELIVER, spec §5, README.md tagline).
 */

type ViewState = "input" | "source" | "extractor" | "result";

interface ProgressRailProps {
  current: ViewState;
}

const STEPS: { view: ViewState; label: string }[] = [
  { view: "input", label: "SOURCE" },
  { view: "source", label: "INSPECT" },
  { view: "extractor", label: "EXTRACT" },
  { view: "result", label: "DELIVER" },
];

export function ProgressRail({ current }: ProgressRailProps) {
  const currentIndex = STEPS.findIndex((s) => s.view === current);

  return (
    <div className="flex items-center gap-2 text-xs font-mono tracking-widest">
      {STEPS.map((step, i) => {
        const isActive = step.view === current;
        const isComplete = i < currentIndex;
        return (
          <div key={step.view} className="flex items-center gap-2">
            <span
              aria-current={isActive ? "step" : undefined}
              className={
                isActive
                  ? "text-red-400 font-bold"
                  : isComplete
                    ? "text-gray-400"
                    : "text-gray-700"
              }
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-gray-800">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npm run test -- ProgressRail`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ProgressRail.tsx apps/web/src/components/ProgressRail.test.tsx
git commit -m "feat: add ProgressRail HUD step indicator"
```

---

## Task 14: `Landing.tsx` redesign — wire everything together

**Files:**
- Modify: `apps/web/src/routes/Landing.tsx`
- Modify: `apps/web/src/features/source/SourceCard.tsx` (guest free-download badge slot)

**Interfaces:**
- Consumes: `ProgressRail` (Task 13), `BuyB1tModal` (Task 11), `isDevModeAvailable`
  (Task 10), `ClipEditor`'s new `maxClipSeconds` prop (Task 9), `getQuota` /
  `downloadSource` (Task 8), `QuotaResponse` type (Task 8).
- Produces: `Landing` fetches quota once on mount (in addition to `AuthStatus`'s own
  fetch — acceptable duplication since they're independent concerns and this avoids
  prop-drilling session state through the tree, matching the existing pattern where
  `AuthStatus` already fetches its own session), passes `maxClipSeconds` into
  `ClipEditor`, renders `ProgressRail` above the view content, renders the HUD hero on
  the `input` view, shrinks to a header lockup on other views, adds a "Buy B1T$" trigger,
  and adds the guest free-download badge to `SourceCard`'s action row.

- [ ] **Step 1: Add the free-download badge slot to `SourceCard`**

In `apps/web/src/features/source/SourceCard.tsx`, add a new prop and render it above the
Actions block. Change the `SourceCardProps` interface:

```typescript
interface SourceCardProps {
  media: InspectResponse;
  onExtract?: () => void;
  onPreview?: () => void;
  onDownloadSource?: () => void;
  freeDownloadBadge?: "available" | "used" | null;
}
```

Update the function signature:

```typescript
export function SourceCard({
  media,
  onExtract,
  onPreview,
  onDownloadSource,
  freeDownloadBadge,
}: SourceCardProps) {
```

Add the badge and a download-source button just before the closing `{/* Actions (§13) */}`
block's `</div>`, i.e. insert this block immediately before the final `<div className="flex gap-3 pt-2">` actions row:

```typescript
      {freeDownloadBadge && (
        <div
          className={`text-xs font-mono px-3 py-2 rounded border ${
            freeDownloadBadge === "available"
              ? "text-red-400 border-red-800 bg-red-900/10"
              : "text-gray-500 border-gray-800 bg-gray-900/40"
          }`}
        >
          {freeDownloadBadge === "available"
            ? "1 FREE FULL DOWNLOAD AVAILABLE"
            : "FREE DOWNLOAD USED — Register or buy B1T$ for more"}
        </div>
      )}
```

And add a download-source button inside the existing Actions `<div className="flex gap-3 pt-2">`, alongside Preview/Extract:

```typescript
        {onDownloadSource && (
          <button
            onClick={onDownloadSource}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Download source
          </button>
        )}
```

- [ ] **Step 2: Rewrite `Landing.tsx`**

```typescript
import { useState, useEffect } from "react";
import { Logo } from "../components/Logo";
import { UrlInput } from "../components/UrlInput";
import { SourceCard } from "../features/source/SourceCard";
import { ClipEditor } from "../features/extractor/ClipEditor";
import { AuthStatus } from "../components/AuthStatus";
import { DevModeToggle, isDevModeAvailable } from "../components/DevModeToggle";
import { ProgressRail } from "../components/ProgressRail";
import { BuyB1tModal } from "../components/BuyB1tModal";
import { useMutation } from "@tanstack/react-query";
import { extractClip, downloadSource, getFileUrl, getQuota } from "../lib/api";
import type { InspectResponse, ExtractResponse, QuotaResponse } from "../types";

type ViewState = "input" | "source" | "extractor" | "result";

export default function Landing() {
  const [view, setView] = useState<ViewState>("input");
  const [media, setMedia] = useState<InspectResponse | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(
    null,
  );
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);

  useEffect(() => {
    getQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [view === "result"]);

  const extractMutation = useMutation({
    mutationFn: extractClip,
    onSuccess: (data) => {
      setExtractResult(data);
      setView("result");
    },
  });

  const downloadMutation = useMutation({
    mutationFn: downloadSource,
    onSuccess: (data) => {
      setExtractResult(data);
      setView("result");
      getQuota()
        .then(setQuota)
        .catch(() => {});
    },
  });

  const handleInspectSuccess = (data: InspectResponse) => {
    setMedia(data);
    setView("source");
  };

  const handleExtract = (start: number, end: number) => {
    if (!media) return;
    extractMutation.mutate({
      url: media.webpage_url || media.id,
      start,
      end,
      format: "mp4",
    });
  };

  const handleDownloadSource = () => {
    if (!media) return;
    downloadMutation.mutate({ url: media.webpage_url || media.id });
  };

  const handleBackToInput = () => {
    setMedia(null);
    setExtractResult(null);
    setView("input");
  };

  const handleBackToSource = () => {
    setView("source");
  };

  const isGuest = !quota || quota.role === "guest";
  const freeDownloadBadge = isGuest
    ? quota?.free_download_used
      ? "used"
      : "available"
    : null;

  return (
    <div className="min-h-screen bg-charcoal text-ink flex flex-col items-center px-4 py-12 hud-scanlines">
      <div className="w-full max-w-4xl">
        {view === "input" ? (
          <div className="text-center mb-12 relative hud-corner-brackets py-8">
            <Logo className="w-24 h-24 mx-auto mb-4" />
            <h1 className="text-5xl font-bold tracking-tight mb-1">M2P</h1>
            <p className="text-xl text-gray-400">Media Server 2 Peer</p>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 pb-4 hud-glow-border border-t-0 border-x-0">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8" />
              <span className="text-lg font-bold tracking-tight">M2P</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <ProgressRail current={view} />
          <div className="flex items-center gap-3">
            <AuthStatus />
            <button
              onClick={() => setIsBuyModalOpen(true)}
              className="hud-button px-3 py-1 text-sm text-white bg-gray-800 border border-gray-700 hover:bg-gray-700"
            >
              Buy B1T$
            </button>
          </div>
        </div>

        {view === "input" && (
          <div className="space-y-12">
            <div className="text-center">
              <UrlInput onInspectSuccess={handleInspectSuccess} />
            </div>
            <div className="text-center space-y-4 text-gray-300">
              <p className="text-lg">
                Extract what you need. Take it to your workflow.
              </p>
              <div className="space-y-2 font-mono text-xs">
                <p>
                  <span className="text-red-400 font-medium">GUEST:</span>{" "}
                  20s clip extraction, always free. Plus one free unlimited
                  full download.
                </p>
                <p>
                  <span className="text-red-400 font-medium">
                    REGISTERED:
                  </span>{" "}
                  Unlimited extraction, gated by B1T$ balance.
                </p>
              </div>
            </div>
          </div>
        )}

        {view === "source" && media && (
          <div className="space-y-6">
            <button
              onClick={handleBackToInput}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              ← Back to URL input
            </button>
            <SourceCard
              media={media}
              onExtract={() => setView("extractor")}
              onPreview={() => console.log("Preview clicked")}
              onDownloadSource={handleDownloadSource}
              freeDownloadBadge={freeDownloadBadge}
            />
            {downloadMutation.isError && (
              <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
                {downloadMutation.error instanceof Error
                  ? downloadMutation.error.message
                  : "Download failed. Please try again."}
              </div>
            )}
          </div>
        )}

        {view === "extractor" && media && (
          <div className="space-y-6">
            <button
              onClick={handleBackToSource}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              ← Back to source
            </button>
            <ClipEditor
              media={media}
              onExtract={handleExtract}
              isExtracting={extractMutation.isPending}
              maxClipSeconds={
                quota?.role === "guest" ? (quota.max_clip_seconds ?? 20) : null
              }
            />
            {extractMutation.isError && (
              <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
                {extractMutation.error instanceof Error
                  ? extractMutation.error.message
                  : "Extraction failed. Please try again."}
              </div>
            )}
          </div>
        )}

        {view === "result" && extractResult && (
          <div className="text-center space-y-6">
            <div className="hud-panel p-6 bg-gray-900 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-4">
                Clip ready!
              </h2>
              <p className="text-gray-300 mb-4">
                Your clip is ready to download.
              </p>
              <a
                href={getFileUrl(extractResult.file_id)}
                download={`m2p_clip_${extractResult.file_id.slice(0, 8)}.mp4`}
                className="hud-button inline-block px-6 py-3 text-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Download clip
              </a>
            </div>
            <button
              onClick={handleBackToInput}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              ← Extract another clip
            </button>
          </div>
        )}
      </div>
      {isDevModeAvailable && <DevModeToggle />}
      <BuyB1tModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onPurchased={() => {
          setIsBuyModalOpen(false);
          getQuota()
            .then(setQuota)
            .catch(() => {});
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run the full frontend test suite**

Run: `cd apps/web && npm run test`
Expected: all tests pass, no regressions from the `Landing`/`SourceCard` changes (no
direct tests target `Landing.tsx` itself, but this confirms nothing else broke).

- [ ] **Step 4: Type-check and build**

Run: `cd apps/web && npm run build`
Expected: `tsc -b` and `vite build` both succeed with no type errors.

- [ ] **Step 5: Manually verify in the browser**

Run: `cd apps/web && npm run dev` (and in a separate terminal, `cd services/api &&
uvicorn main:app --reload --port 8001`)

Open `http://localhost:5173` and verify:
- Landing hero shows the enlarged logo + HUD corner brackets.
- Pasting a URL and inspecting shows the progress rail advance to INSPECT.
- The guest free-download badge shows "1 FREE FULL DOWNLOAD AVAILABLE" on the source
  view.
- Clicking "Download source" once succeeds; a second attempt (reload, try again) shows
  the "already used" error and the badge flips to "used".
- The ClipEditor shows numeric IN/OUT inputs (no broken video element), and guests are
  capped at 20s while the boundary marker renders correctly.
- "Buy B1T$" opens the modal with three tiers; without `M2P_DEV_CREDIT_GRANTS=true` set
  on the backend, clicking a tier shows the "not yet available" error.
- "Sign in with LaGrieta" is disabled/greyed out with a "Coming soon" tooltip (no
  `VITE_LAGRIETA_AUTH_URL` configured in dev).
- `DevModeToggle` still appears in `npm run dev` (dev build) — confirms the
  `isDevModeAvailable` gate didn't hide it in dev, only in production builds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/Landing.tsx apps/web/src/features/source/SourceCard.tsx
git commit -m "feat: HUD redesign — progress rail, hero logo, free-download badge, buy B1T\$ entry point"
```

---

## Task 15: Full regression pass

**Files:** none created/modified — verification only.

- [ ] **Step 1: Run the full backend test suite**

Run: `cd services/api && pytest -v`
Expected: all tests across `test_harness_smoke.py`, `test_credit_service.py`,
`test_guest_service.py`, `test_extraction_limits.py`, `test_files_ownership.py`,
`test_quota_and_purchase.py` pass.

- [ ] **Step 2: Run the full frontend test suite**

Run: `cd apps/web && npm run test`
Expected: all tests across `smoke.test.tsx`, `guestToken.test.ts`, `ClipEditor.test.tsx`,
`AuthStatus.test.tsx`, `BuyB1tModal.test.tsx`, `ProgressRail.test.tsx` pass.

- [ ] **Step 3: Run frontend lint and type-check**

Run: `cd apps/web && npm run lint && npm run build`
Expected: no lint errors, build succeeds.

- [ ] **Step 4: Confirm no leftover references to removed code**

Run: `cd apps/web && grep -rn "GUEST_MAX_SECONDS\|getVideoSource\|videoRef" src/ || echo "clean"`
Expected: `clean` — confirms the old hardcoded cap and broken video-preview code paths
were fully removed, not just shadowed.

- [ ] **Step 5: Commit any final fixups**

If steps 1–4 required fixes, commit them individually with descriptive messages
following the same pattern as prior tasks. If everything passed clean, no commit is
needed for this task.

---

## Self-Review Notes

- **Spec §2 (bug fixes):** covered by Tasks 5 (file ownership), 9 (ClipEditor cap +
  video preview), 10 (DevModeToggle gating), 8 (auth header plumbing).
- **Spec §3 (unlimited registered users, guest free download):** covered by Tasks 2
  (CreditService), 3 (GuestService), 4 (wiring), 6 (quota response shape).
- **Spec §4 (register/buy B1T$):** covered by Tasks 6 (purchase endpoint), 11
  (AuthStatus redirect + BuyB1tModal), 14 (wiring into Landing/SourceCard).
- **Spec §5 (HUD redesign):** covered by Tasks 12 (design tokens), 13 (ProgressRail,
  Logo usage), 14 (Landing/SourceCard visual wiring).
- **Spec §6 (non-goals):** respected throughout — no real payment integration, no
  LAG-Bridge server implementation, no server-authoritative cross-device balance, no
  video-streaming proxy.
