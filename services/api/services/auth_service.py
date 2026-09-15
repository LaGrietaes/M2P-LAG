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
    """Validates tokens against LaGrieta's LAG-Bridge endpoint or direct JWT/DB.

    Falls back to guest session if no token is provided or validation fails.
    """

    def __init__(self):
        self.lag_bridge_url = os.getenv(
            "LAG_BRIDGE_URL",
            "http://localhost:8000/api/v1/auth/validate",
        )
        self.enabled = os.getenv("M2P_AUTH_ENABLED", "true").lower() in (
            "1",
            "true",
            "yes",
        )
        self.jwt_secret = os.getenv("JWT_SECRET")
        self.database_url = os.getenv("DATABASE_URL")

    def login_with_email(self, email: str) -> tuple[str, Session]:
        """Authenticate directly with a member email, resolving against Postgres and issuing JWT."""
        clean_email = email.strip().lower()
        if not clean_email or "@" not in clean_email:
            raise AuthError("Invalid email address")

        record = None
        if self.database_url:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                with psycopg2.connect(self.database_url) as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            "SELECT id, email, bits_balance, handle, avatar_url FROM lagrieta_member WHERE LOWER(email) = %s LIMIT 1;",
                            (clean_email,),
                        )
                        record = cur.fetchone()
                        if not record:
                            import uuid
                            new_id = f"lgm_{uuid.uuid4().hex[:26]}"
                            ghost_id = uuid.uuid4().hex[:24]
                            cur.execute(
                                """
                                INSERT INTO lagrieta_member (id, ghost_member_id, email, bits_balance)
                                VALUES (%s, %s, %s, %s)
                                RETURNING id, email, bits_balance, handle, avatar_url;
                                """,
                                (new_id, ghost_id, clean_email, 0),
                            )
                            record = cur.fetchone()
                            conn.commit()
            except Exception as exc:
                log.warning("DB query/insert in login_with_email failed: %s", exc)

        user_id = record["id"] if record else "user"
        bits_balance = record["bits_balance"] if record and "bits_balance" in record else 0
        name = (record.get("handle") if record else None) or (clean_email.split("@")[0])

        jwt_secret = self.jwt_secret or "0qnZfgzMZcYW7IprA29pWHeKqSK72GWb1ArqrdFkkE"
        import jwt
        payload = {
            "id": user_id,
            "email": clean_email,
            "handle": record.get("handle") if record else None,
            "role": "MEMBER",
        }
        token = jwt.encode(payload, jwt_secret, algorithm="HS256")

        session = Session(
            user_id=user_id,
            role="user",
            provider="lagrieta",
            email=clean_email,
            name=name,
            b1t_balance=bits_balance,
            quota={
                "max_clip_seconds": 3600,
                "max_file_size": 2 * 1024 * 1024 * 1024,
                "daily_jobs": 100,
                "storage_quota": 5 * 1024 * 1024 * 1024,
            },
        )
        return token, session

    def _fetch_member_record(self, email: str | None, member_id: str | None) -> dict | None:
        if not self.database_url or (not email and not member_id):
            return None
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT id, email, bits_balance, handle, avatar_url FROM lagrieta_member WHERE email = %s OR id = %s LIMIT 1;",
                        (email or "", member_id or ""),
                    )
                    return cur.fetchone()
        except Exception as exc:
            log.warning("Database query failed in AuthService: %s", exc)
            return None

    async def validate_token(self, token: str | None, cookie_token: str | None = None) -> Session:
        """Validate a bearer token or SSO cookie and return a session.

        Args:
            token: Bearer token from Authorization header.
            cookie_token: lagrieta_sso cookie from request.

        Returns:
            Session object with user identity and quota.
        """
        raw_token = token or cookie_token
        if not self.enabled or not raw_token:
            return self._guest_session()

        # Remove "Bearer " prefix if present
        if raw_token.startswith("Bearer "):
            raw_token = raw_token[7:]

        # 1. Direct JWT Validation via JWT_SECRET (LaGrieta SSO)
        if self.jwt_secret:
            try:
                import jwt
                payload = jwt.decode(raw_token, self.jwt_secret, algorithms=["HS256"])
                user_id = payload.get("id") or "user"
                email = payload.get("email")
                handle = payload.get("handle")

                # Fetch live B1T$ balance from shared postgres DB
                record = self._fetch_member_record(email, user_id)
                bits_balance = record["bits_balance"] if record and "bits_balance" in record else 0
                name = (record.get("handle") if record else None) or handle or (email.split("@")[0] if email else "Member")

                return Session(
                    user_id=user_id,
                    role="user",
                    provider="lagrieta",
                    email=email,
                    name=name,
                    b1t_balance=bits_balance,
                    quota={
                        "max_clip_seconds": 3600,
                        "max_file_size": 2 * 1024 * 1024 * 1024,
                        "daily_jobs": 100,
                        "storage_quota": 5 * 1024 * 1024 * 1024,
                    },
                )
            except Exception as exc:
                log.debug("JWT decode failed: %s", exc)

        # 2. HTTP LAG_BRIDGE validation fallback
        if self.lag_bridge_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.post(
                        self.lag_bridge_url,
                        headers={
                            "Authorization": f"Bearer {raw_token}",
                            "Content-Type": "application/json",
                        },
                    )

                    if response.status_code == 401:
                        log.warning("Auth validation failed: 401 Unauthorized")
                        return self._guest_session()

                    if response.status_code == 403:
                        log.warning("Auth validation failed: 403 Forbidden")
                        raise AuthError("User is banned or restricted.")

                    if response.status_code == 200:
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
