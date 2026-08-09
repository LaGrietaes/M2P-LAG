"""M2P API — Media Server 2 Peer.

Phase 4: registered user support with LAG-Bridge auth.
"""

import os
import time
import uuid
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models import (
    InspectRequest,
    InspectResponse,
    ExtractRequest,
    ExtractResponse,
    JobResponse,
    HealthResponse,
    VersionResponse,
)
from services.metadata_service import MetadataService, MetadataError
from services.extraction_service import ExtractionService, ExtractionError
from services.storage_service import StorageService
from services.cleanup_service import CleanupService
from services.auth_service import AuthService
from middleware import AuthMiddleware, RateLimitMiddleware

log = logging.getLogger("m2p.api")

app = FastAPI(
    title="M2P API",
    description="Media Server 2 Peer — API",
    version=settings.VERSION,
)

# ── CORS (§19) ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Middleware (§20) ────────────────────────────────────────────────────
app.add_middleware(AuthMiddleware)
app.add_middleware(
    RateLimitMiddleware, max_requests=100, window_seconds=60
)

# ── Services (§07) ──────────────────────────────────────────────────────
metadata_service = MetadataService()
extraction_service = ExtractionService()
storage_service = StorageService()
cleanup_service = CleanupService()
auth_service = AuthService()

# ── In-memory job store (Phase 3 — no DB, §31) ──────────────────────────
_jobs: dict[str, dict] = {}


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe."""
    return HealthResponse(status="ok")


@app.get("/version", response_model=VersionResponse)
async def version() -> VersionResponse:
    """Return service version and media-tool versions."""
    yt_dlp_version: str | None = None
    ffmpeg_version: str | None = None

    try:
        import yt_dlp
        yt_dlp_version = yt_dlp.version.__version__
    except ImportError:
        log.warning("yt-dlp not installed")

    try:
        import shutil
        if shutil.which("ffmpeg"):
            ffmpeg_version = "available"
    except Exception:
        pass

    return VersionResponse(
        version=settings.VERSION,
        yt_dlp=yt_dlp_version,
        ffmpeg=ffmpeg_version,
    )


@app.post("/api/v1/media/inspect", response_model=InspectResponse)
async def inspect_media(request: InspectRequest) -> InspectResponse:
    """Inspect a media URL and return metadata (§08, §13)."""
    log.info("Inspect requested for: %s", request.url)

    try:
        return metadata_service.inspect(request.url)
    except MetadataError as exc:
        log.warning("Inspect failed for %s: %s", request.url, exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        log.error("Unexpected error inspecting %s: %s", request.url, exc)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while inspecting this source.",
        )


@app.post("/api/v1/jobs/extract", response_model=ExtractResponse)
async def extract_clip(request: ExtractRequest, req: Request) -> ExtractResponse:
    """Extract a media segment (§08, §10)."""
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
    except ExtractionError as exc:
        log.warning("Extraction failed: %s", exc)
        status = 402 if "Insufficient" in str(exc) else 422
        raise HTTPException(status_code=status, detail=str(exc))
    except Exception as exc:
        log.error("Unexpected extraction error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during extraction.",
        )

    now = time.time()
    ttl = int(os.getenv("CLIP_TTL_SECONDS", "3600"))
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
    }

    return ExtractResponse(file_id=file_id, status="ready")


@app.get("/api/v1/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    """Get job status (§14)."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(**job)


@app.get("/api/v1/files/{file_id}")
async def download_file(file_id: str):
    """Download an extracted file (§08)."""
    clips_dir = storage_service.clips_dir
    for entry in clips_dir.iterdir():
        if entry.is_file() and entry.stem.startswith(file_id[:8]):
            return FileResponse(
                path=str(entry),
                media_type="video/mp4",
                filename=f"m2p_clip_{file_id[:8]}.mp4",
            )

    raise HTTPException(status_code=404, detail="File not found")


@app.delete("/api/v1/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file (§08)."""
    clips_dir = storage_service.clips_dir
    for entry in clips_dir.iterdir():
        if entry.is_file() and entry.stem.startswith(file_id[:8]):
            storage_service.delete_file(entry)
            if file_id in _jobs:
                del _jobs[file_id]
            return {"status": "deleted"}

    raise HTTPException(status_code=404, detail="File not found")


@app.get("/api/v1/me")
async def get_me(request: Request):
    """Get current user session info (§20)."""
    session = getattr(request.state, "session", None)
    if not session:
        return auth_service._guest_session()

    return {
        "user_id": session.user_id,
        "role": session.role,
        "provider": session.provider,
        "email": session.email,
        "name": session.name,
        "b1t_balance": session.b1t_balance,
        "quota": session.quota or {
            "max_clip_seconds": settings.GUEST_MAX_CLIP_SECONDS,
            "max_file_size": settings.GUEST_MAX_FILE_SIZE,
            "daily_jobs": settings.USER_DAILY_JOBS,
            "storage_quota": settings.USER_STORAGE_QUOTA,
        },
    }


@app.get("/api/v1/me/quota")
async def get_quota(request: Request):
    """Get user quota (§17)."""
    session = getattr(request.state, "session", None)
    if not session:
        session = auth_service._guest_session()

    quota = session.quota or {
        "max_clip_seconds": settings.GUEST_MAX_CLIP_SECONDS,
        "max_file_size": settings.GUEST_MAX_FILE_SIZE,
        "daily_jobs": settings.USER_DAILY_JOBS,
        "storage_quota": settings.USER_STORAGE_QUOTA,
    }

    return {
        "role": session.role,
        "max_clip_seconds": quota.get("max_clip_seconds", settings.GUEST_MAX_CLIP_SECONDS),
        "max_file_size": quota.get("max_file_size", settings.GUEST_MAX_FILE_SIZE),
        "daily_jobs_remaining": quota.get("daily_jobs"),
        "b1t_balance": session.b1t_balance,
    }


@app.get("/api/v1/me/history")
async def get_history(request: Request):
    """Get user history (§15). Phase 4 — returns empty for now."""
    session = getattr(request.state, "session", None)
    if not session or session.role == "guest":
        return {"items": []}

    return {"items": []}


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