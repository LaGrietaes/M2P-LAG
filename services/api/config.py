"""M2P API configuration — environment-driven (§17).

All limits and paths are configurable via environment variables. The backend
is authoritative for quotas; the frontend never trusts client-side limits (§10).
"""

import os
import logging

log = logging.getLogger("m2p.config")


class Settings:
    # ── Server ──────────────────────────────────────────────────────────
    HOST: str = os.getenv("M2P_API_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("M2P_API_PORT", "8000"))

    # ── CORS ────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins (frontend URLs).
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("M2P_CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]

    # ── Storage (§16) ────────────────────────────────────────────────────
    DATA_DIR: str = os.getenv("M2P_DATA_DIR", "/data")

    # ── Quotas (§17, §10) — backend-authoritative ───────────────────────
    GUEST_MAX_CLIP_SECONDS: int = int(os.getenv("GUEST_MAX_CLIP_SECONDS", "20"))
    GUEST_MAX_FILE_SIZE: int = int(
        os.getenv("GUEST_MAX_FILE_SIZE", str(50 * 1024 * 1024))  # 50 MB
    )
    USER_MAX_SOURCE_SIZE: int = int(
        os.getenv("USER_MAX_SOURCE_SIZE", str(500 * 1024 * 1024))  # 500 MB
    )
    USER_STORAGE_QUOTA: int = int(
        os.getenv("USER_STORAGE_QUOTA", str(1024 * 1024 * 1024))  # 1 GB
    )
    USER_DAILY_JOBS: int = int(os.getenv("USER_DAILY_JOBS", "10"))

    # ── Concurrency (§18) ───────────────────────────────────────────────
    MAX_CONCURRENT_DOWNLOADS: int = int(os.getenv("MAX_CONCURRENT_DOWNLOADS", "2"))
    MAX_CONCURRENT_EXTRACTIONS: int = int(
        os.getenv("MAX_CONCURRENT_EXTRACTIONS", "2")
    )

    # ── Media tools ─────────────────────────────────────────────────────
    YTDLP_PATH: str = os.getenv(
        "YTDLP_PATH",
        r"C:\Users\Lag-d\AppData\Local\Programs\Python\Python312\Scripts\yt-dlp.exe",
    )
    FFMPEG_PATH: str = os.getenv(
        "FFMPEG_PATH",
        r"C:\Users\Lag-d\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe",
    )
    FFPROBE_PATH: str = os.getenv(
        "FFPROBE_PATH",
        r"C:\Users\Lag-d\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffprobe.exe",
    )

    # ── SSRF guard (§19) ────────────────────────────────────────────────
    ALLOW_PRIVATE_ADDRESSES: bool = os.getenv(
        "ALLOW_PRIVATE_ADDRESSES", "false"
    ).lower() in ("1", "true", "yes")

    # ── Auth (§20, §J) — Phase 4 ────────────────────────────────────────
    AUTH_PROVIDER: str = os.getenv("M2P_AUTH_PROVIDER", "ghost")
    GHOST_ADMIN_API_URL: str = os.getenv("GHOST_ADMIN_API_URL", "")
    GHOST_ADMIN_API_KEY: str = os.getenv("GHOST_ADMIN_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    # ── b1t$ credit system (§L) — Phase 4 ───────────────────────────────
    ENABLE_B1T_CREDITS: bool = os.getenv(
        "ENABLE_B1T_CREDITS", "false"
    ).lower() in ("1", "true", "yes")

    # ── B1T$ purchase (spec §4) ─────────────────────────────────────────
    M2P_DEV_CREDIT_GRANTS: bool = os.getenv(
        "M2P_DEV_CREDIT_GRANTS", "false"
    ).lower() in ("1", "true", "yes")
    B1T_PACKAGE_TIERS: dict = {1: 100, 2: 500, 3: 1000}

    # ── Version ─────────────────────────────────────────────────────────
    VERSION: str = os.getenv("M2P_VERSION", "0.1.0")


settings = Settings()
