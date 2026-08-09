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


def test_quota_guest_gets_numeric_caps(tmp_data_dir):
    resp = client.get(
        "/api/v1/me/quota", headers={"X-M2P-Guest-Token": "tok-guest-caps"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "guest"
    assert body["max_clip_seconds"] == settings.GUEST_MAX_CLIP_SECONDS
    assert body["max_file_size"] == settings.GUEST_MAX_FILE_SIZE


def test_quota_registered_user_has_no_clip_or_size_cap(tmp_data_dir, monkeypatch):
    from services.auth_service import Session

    def fake_session_from_request(req):
        return Session(user_id="user_1", role="user", provider="ghost", b1t_balance=10)

    import main

    monkeypatch.setattr(main, "_session_from_request", fake_session_from_request)

    resp = client.get("/api/v1/me/quota")
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "user"
    assert body["max_clip_seconds"] is None
    assert body["max_file_size"] is None


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
