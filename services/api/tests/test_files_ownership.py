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
