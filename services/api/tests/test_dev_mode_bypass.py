from fastapi.testclient import TestClient

from config import settings
from main import app
from middleware import auth_service

client = TestClient(app)


def test_dev_role_header_ignored_when_dev_mode_off(tmp_data_dir, monkeypatch):
    monkeypatch.setattr(settings, "M2P_DEV_MODE", False)
    resp = client.get(
        "/api/v1/me",
        headers={"X-M2P-Dev-Role": "user", "X-M2P-Guest-Token": "tok-1"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "guest"


def test_dev_role_header_grants_registered_session_when_dev_mode_on(
    tmp_data_dir, monkeypatch
):
    monkeypatch.setattr(settings, "M2P_DEV_MODE", True)
    monkeypatch.setattr(settings, "M2P_DEV_USER_B1T_BALANCE", 777)
    resp = client.get(
        "/api/v1/me",
        headers={"X-M2P-Dev-Role": "user", "X-M2P-Guest-Token": "tok-1"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "user"
    assert body["provider"] == "dev"
    assert body["b1t_balance"] == 777


def test_dev_mode_on_but_no_header_still_resolves_guest(tmp_data_dir, monkeypatch):
    monkeypatch.setattr(settings, "M2P_DEV_MODE", True)
    resp = client.get("/api/v1/me", headers={"X-M2P-Guest-Token": "tok-1"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "guest"


def test_dev_mode_on_wrong_role_value_falls_through_to_normal_auth(
    tmp_data_dir, monkeypatch
):
    monkeypatch.setattr(settings, "M2P_DEV_MODE", True)
    resp = client.get(
        "/api/v1/me",
        headers={"X-M2P-Dev-Role": "admin", "X-M2P-Guest-Token": "tok-1"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "guest"


def test_dev_session_helper_returns_registered_role():
    session = auth_service.dev_session()
    assert session.role == "user"
    assert session.provider == "dev"
    assert session.b1t_balance == settings.M2P_DEV_USER_B1T_BALANCE
