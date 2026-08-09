"""Pydantic models for the M2P API (§08).

These mirror the Zod schemas in packages/shared-types so frontend and backend
share a single source of truth for the wire format.
"""

from pydantic import BaseModel, Field
from typing import Optional


class InspectRequest(BaseModel):
    """Request body for POST /api/v1/media/inspect."""

    url: str = Field(..., min_length=1, description="Media URL to inspect")


class FormatOption(BaseModel):
    """A single downloadable format for a media source (§13)."""

    format_id: str
    ext: str
    resolution: Optional[str] = None
    filesize: Optional[int] = None
    tbr: Optional[float] = None
    codec: Optional[str] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    height: Optional[int] = None


class SubtitleOption(BaseModel):
    """An available subtitle track (§13)."""

    language: str
    ext: str
    url: Optional[str] = None


class InspectResponse(BaseModel):
    """Response from POST /api/v1/media/inspect (§08, §13)."""

    id: str
    title: str
    creator: Optional[str] = None
    duration: Optional[float] = None
    thumbnail: Optional[str] = None
    platform: Optional[str] = None
    webpage_url: Optional[str] = None
    upload_date: Optional[str] = None
    formats: list[FormatOption] = []
    subtitles: list[SubtitleOption] = []


class ExtractRequest(BaseModel):
    """Request body for POST /api/v1/jobs/extract (§08, §10)."""

    url: str = Field(..., min_length=1, description="Media URL to extract from")
    start: float = Field(..., ge=0, description="Start time in seconds")
    end: float = Field(..., gt=0, description="End time in seconds")
    format: str = Field("mp4", description="Output format (mp4, mp3, etc.)")


class ExtractResponse(BaseModel):
    """Response from POST /api/v1/jobs/extract."""

    file_id: str
    status: str = "ready"
    message: Optional[str] = None


class JobStatus(str):
    """Job status values (§14)."""
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class JobResponse(BaseModel):
    """Response from GET /api/v1/jobs/:id (§14)."""

    id: str
    status: str
    media_id: Optional[str] = None
    start: Optional[float] = None
    end: Optional[float] = None
    file_id: Optional[str] = None
    error: Optional[str] = None
    created_at: float
    expires_at: Optional[float] = None


class HealthResponse(BaseModel):
    status: str = "ok"


class VersionResponse(BaseModel):
    version: str
    yt_dlp: Optional[str] = None
    ffmpeg: Optional[str] = None
