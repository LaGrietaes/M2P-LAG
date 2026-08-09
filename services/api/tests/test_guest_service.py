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
