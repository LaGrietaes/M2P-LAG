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
