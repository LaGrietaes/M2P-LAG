import tempfile
from pathlib import Path

import pytest

from services.auth_service import Session
from services.extraction_service import ExtractionError, ExtractionService
from services.guest_service import GuestService


class FakeExtractionService(ExtractionService):
    """Skips real yt-dlp/ffmpeg calls so we can test quota/credit logic only."""

    def _download_source(self, url, file_id):
        # extract_source() renames this path, so it must exist on disk (unlike
        # extract_clip(), which only ever passes it to the faked _ffmpeg_extract).
        fake = Path(tempfile.mkdtemp(prefix="m2p_fake_src_")) / "source.mp4"
        fake.write_bytes(b"")
        return str(fake)

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
