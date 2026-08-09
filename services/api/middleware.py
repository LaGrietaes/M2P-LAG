"""Middleware for M2P API.

- AuthMiddleware: extracts bearer token, validates session, attaches to request state.
- RateLimitMiddleware: basic rate limiting (placeholder for Phase 5).
"""

import os
import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from services.auth_service import AuthService, AuthError

log = logging.getLogger("m2p.middleware")

auth_service = AuthService()


class AuthMiddleware(BaseHTTPMiddleware):
    """Extract bearer token and validate session (§20).

    Attaches `request.state.session` with the authenticated user session.
    Falls back to guest if no token or validation fails.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        public_paths = [
            "/health",
            "/version",
            "/api/v1/media/inspect",
            "/docs",
            "/openapi.json",
        ]
        if request.url.path in public_paths:
            return await call_next(request)

        # Extract bearer token
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        # Validate token
        try:
            session = await auth_service.validate_token(token)
        except AuthError as exc:
            raise HTTPException(status_code=403, detail=str(exc))

        request.state.session = session
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Basic rate limiting middleware.

    Phase 5 will replace this with a proper Redis-backed rate limiter.
    For Phase 4, this is a placeholder that logs warnings.
    """

    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old requests
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < self.window_seconds
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            log.warning("Rate limit exceeded for %s", client_ip)
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
            )

        self.requests[client_ip].append(now)
        return await call_next(request)
