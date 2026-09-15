"""M2P API — Media Server 2 Peer.

Phase 4: registered user support with LAG-Bridge auth.
"""

import os
import time
import uuid
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel
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
    PurchaseRequest,
    PurchaseResponse,
)
from services.metadata_service import MetadataService, MetadataError
from services.extraction_service import ExtractionService, ExtractionError
from services.storage_service import StorageService
from services.cleanup_service import CleanupService
from services.auth_service import AuthService
from services.guest_service import GuestService
from middleware import AuthMiddleware, RateLimitMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
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
# Note: GuestService is constructed fresh per-request in get_quota (below)
# rather than as a module-level singleton, so tests that monkeypatch
# settings.DATA_DIR after import still see the correct data dir.

# ── In-memory job store (Phase 3 — no DB, §31) ──────────────────────────
_jobs: dict[str, dict] = {}


def _owner_key(session, guest_token: str | None) -> str:
    if session.role == "guest":
        return f"guest:{guest_token}" if guest_token else "guest:anonymous"
    return f"user:{session.user_id}"


def _session_from_request(req: Request):
    """Return the session attached by AuthMiddleware.

    AuthMiddleware unconditionally sets request.state.session for every
    non-public path, so this fallback is defensive/unreachable in normal
    operation — kept for safety and to avoid an AttributeError if a route
    is ever exempted from the middleware.
    """
    session = getattr(req.state, "session", None)
    if session is None:
        session = AuthService()._guest_session()
    return session


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
def inspect_media(request: InspectRequest) -> InspectResponse:
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
def extract_clip(request: ExtractRequest, req: Request) -> ExtractResponse:
    """Extract a media segment (§08, §10)."""
    session = _session_from_request(req)
    guest_token = getattr(req.state, "guest_token", None)

    if session.role == "guest" and not guest_token:
        raise HTTPException(
            status_code=422,
            detail="A guest token (X-M2P-Guest-Token header) is required to extract a clip.",
        )

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
            format_id=request.format_id,
            format=request.format,
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
    clip_dir = storage_service.clips_dir
    matched_path = next(
        (p for p in clip_dir.iterdir() if p.stem.startswith(file_id)), None
    )
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

    source_ext = (
        Path(matched_path).suffix.lstrip(".")
        if matched_path
        else (request.format or "mp4")
    )

    return ExtractResponse(
        file_id=file_id,
        status="ready",
        format=source_ext,
        expires_at=now + ttl,
    )



@app.get("/api/v1/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    """Get job status (§14)."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(**job)


@app.get("/api/v1/files/{file_id}")
async def download_file(file_id: str, req: Request):
    """Download an extracted file, restricted to its owner (spec §2)."""
    job = _jobs.get(file_id)
    if not job or not job.get("path"):
        raise HTTPException(status_code=404, detail="File not found")

    session = _session_from_request(req)
    guest_token = getattr(req.state, "guest_token", None)

    if job["owner"] != _owner_key(session, guest_token):
        raise HTTPException(status_code=403, detail="You do not have access to this file.")

    path = Path(job["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = path.suffix.lstrip(".")
    media_type = "video/webm" if ext == "webm" else "audio/mpeg" if ext == "mp3" else "video/mp4"

    return FileResponse(
        path=str(path),
        media_type=media_type,
        filename=f"m2p_clip_{file_id[:8]}.{ext}",
    )


@app.delete("/api/v1/files/{file_id}")
async def delete_file(file_id: str, req: Request):
    """Delete a file, restricted to its owner (spec §2)."""
    job = _jobs.get(file_id)
    if not job or not job.get("path"):
        raise HTTPException(status_code=404, detail="File not found")

    session = _session_from_request(req)
    guest_token = getattr(req.state, "guest_token", None)

    if job["owner"] != _owner_key(session, guest_token):
        raise HTTPException(status_code=403, detail="You do not have access to this file.")

    path = Path(job["path"])
    storage_service.delete_file(path)
    del _jobs[file_id]
    return {"status": "deleted"}


class LoginRequest(BaseModel):
    email: str


@app.post("/api/v1/auth/login")
async def direct_login(req_body: LoginRequest, request: Request, response: Response):
    """Direct member authentication against medusa_db."""
    try:
        token, session = auth_service.authenticate_direct(req_body.email)
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        log.error("Direct login failed: %s", exc)
        raise HTTPException(status_code=500, detail="Authentication failed")

    host = request.headers.get("host", "")
    domain = ".lagrieta.es" if "lagrieta.es" in host else None

    response.set_cookie(
        key="lagrieta_sso",
        value=token,
        domain=domain,
        httponly=True,
        secure=request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https",
        samesite="lax",
        max_age=86400 * 30,
    )

    return {
        "status": "authenticated",
        "token": token,
        "session": {
            "user_id": session.user_id,
            "role": session.role,
            "email": session.email,
            "name": session.name,
            "b1t_balance": session.b1t_balance,
        },
    }


@app.post("/api/v1/auth/logout")
async def auth_logout(request: Request, response: Response):
    """Log out and clear SSO cookie."""
    host = request.headers.get("host", "")
    domain = ".lagrieta.es" if "lagrieta.es" in host else None

    response.delete_cookie("lagrieta_sso", domain=domain)
    response.delete_cookie("lagrieta_sso")
    return {"status": "logged_out"}


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
    """Get user quota (§17, spec §3)."""
    session = _session_from_request(request)
    guest_token = getattr(request.state, "guest_token", None)

    quota = session.quota or {
        "max_clip_seconds": settings.GUEST_MAX_CLIP_SECONDS,
        "max_file_size": settings.GUEST_MAX_FILE_SIZE,
        "daily_jobs": settings.USER_DAILY_JOBS,
        "storage_quota": settings.USER_STORAGE_QUOTA,
    }

    free_download_used = None
    if session.role == "guest":
        # Constructed fresh (not the module-level guest_service) so tests that
        # monkeypatch settings.DATA_DIR after import see the right data dir.
        free_download_used = (
            GuestService().has_used_free_download(guest_token) if guest_token else False
        )

    max_clip_seconds = None
    max_file_size = None
    if session.role == "guest":
        max_clip_seconds = quota.get("max_clip_seconds", settings.GUEST_MAX_CLIP_SECONDS)
        max_file_size = quota.get("max_file_size", settings.GUEST_MAX_FILE_SIZE)

    return {
        "role": session.role,
        "email": session.email,
        "name": session.name,
        "max_clip_seconds": max_clip_seconds,
        "max_file_size": max_file_size,
        "daily_jobs_remaining": quota.get("daily_jobs"),
        "b1t_balance": session.b1t_balance,
        "free_download_used": free_download_used,
    }


@app.get("/api/v1/me/history")
async def get_history(request: Request):
    """Get user history (§15). Phase 4 — returns empty for now."""
    session = getattr(request.state, "session", None)
    if not session or session.role == "guest":
        return {"items": []}

    return {"items": []}


@app.post("/api/v1/jobs/download", response_model=ExtractResponse)
def download_source(request: InspectRequest, req: Request) -> ExtractResponse:
    """Download full source media (§02, §08, spec §3).

    Registered users: unlimited, B1T$-gated. Guests: one free unlimited
    download per guest_token, then rejected.
    """
    session = _session_from_request(req)
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
            format_id=request.format_id,
            format=request.format or "mp4",
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

    now = time.time()
    ttl = int(os.getenv("CLIP_TTL_SECONDS", "3600"))
    clip_dir = storage_service.clips_dir
    matched_path = next(
        (p for p in clip_dir.iterdir() if p.stem.startswith(file_id)), None
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

    source_ext = (
        Path(matched_path).suffix.lstrip(".")
        if matched_path
        else (request.format or "mp4")
    )

    return ExtractResponse(
        file_id=file_id,
        status="ready",
        format=source_ext,
        expires_at=now + ttl,
    )



@app.post("/api/v1/b1t/purchase", response_model=PurchaseResponse)
async def purchase_b1t(request: PurchaseRequest) -> PurchaseResponse:
    """Buy B1T$ credits (spec §4). Stub — real payment integration is out of scope.

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
