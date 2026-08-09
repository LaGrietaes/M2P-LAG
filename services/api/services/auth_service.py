"""AuthService — pluggable authentication abstraction (§20, §J).

M2P does not manage its own user database. It delegates authentication to
LaGrieta's identity providers via the LAG-Bridge endpoint.

Supported providers:
  - Ghost CMS (session cookie / Admin API key)
  - MedusaJS (JWT)
  - Supabase Auth (JWT)

If no valid token is present, the user is treated as a guest.
"""

import os
import logging
import httpx
from dataclasses import dataclass

from config import settings

log = logging.getLogger("m2p.auth")


@dataclass
class Session:
    """Authenticated user session."""
    user_id: str
    role: str  # "guest", "user", "admin"
    provider: str  # "ghost", "medusa", "supabase", "none"
    email: str | None = None
    name: str | None = None
    b1t_balance: int = 0
    quota: dict | None = None


class AuthError(Exception):
    """Raised when authentication fails."""


class AuthService:
    """Validates tokens against LaGrieta's LAG-Bridge endpoint.

    Falls back to guest session if no token is provided or validation fails.
    """

    def __init__(self):
        self.lag_bridge_url = os.getenv(
            "LAG_BRIDGE_URL",
            "http://localhost:8000/api/v1/auth/validate",
        )
        self.enabled = os.getenv("M2P_AUTH_ENABLED", "false").lower() in (
            "1",
            "true",
            "yes",
        )

    async def validate_token(self, token: str | None) -> Session:
        """Validate a bearer token and return a session.

        Args:
            token: Bearer token from Authorization header, or None for guest.

        Returns:
            Session object with user identity and quota.

        Raises:
            AuthError: if token is invalid or provider returns an error.
        """
        if not self.enabled or not token:
            return self._guest_session()

        # Remove "Bearer " prefix if present
        if token.startswith("Bearer "):
            token = token[7:]

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    self.lag_bridge_url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code == 401:
                    log.warning("Auth validation failed: 401 Unauthorized")
                    return self._guest_session()

                if response.status_code == 403:
                    log.warning("Auth validation failed: 403 Forbidden")
                    raise AuthError("User is banned or restricted.")

                if response.status_code != 200:
                    log.warning(
                        "Auth validation failed: %s %s",
                        response.status_code,
                        response.text,
                    )
                    return self._guest_session()

                data = response.json()
                return Session(
                    user_id=data.get("user_id", "unknown"),
                    role=data.get("role", "user"),
                    provider=data.get("provider", "unknown"),
                    email=data.get("email"),
                    name=data.get("name"),
                    b1t_balance=data.get("b1t_balance", 0),
                    quota=data.get("quota"),
                )

        except httpx.RequestError as exc:
            log.error("Auth service unreachable: %s", exc)
            return self._guest_session()
        except Exception as exc:
            log.error("Auth validation error: %s", exc)
            return self._guest_session()

    def dev_session(self) -> Session:
        """Fake registered-user session for local dev/testing only.

        Only ever constructed when config.settings.M2P_DEV_MODE is true and
        the caller sent X-M2P-Dev-Role: user (see middleware.py) — this
        method itself doesn't re-check the flag so it stays a pure fake-
        session factory, consistent with _guest_session() below.
        """
        return Session(
            user_id="dev-user",
            role="user",
            provider="dev",
            email="dev@localhost",
            name="Dev User",
            b1t_balance=settings.M2P_DEV_USER_B1T_BALANCE,
            quota=None,
        )

    def _guest_session(self) -> Session:
        """Return a default guest session."""
        return Session(
            user_id="guest",
            role="guest",
            provider="none",
            quota={
                "max_clip_seconds": settings.GUEST_MAX_CLIP_SECONDS,
                "max_file_size": settings.GUEST_MAX_FILE_SIZE,
                "daily_jobs": None,
                "storage_quota": 0,
            },
        )
