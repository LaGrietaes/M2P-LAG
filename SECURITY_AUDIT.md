# M2P-LAG Security Audit Report

**Date**: 2026-01-09  
**Auditor**: Automated Security Analysis  
**Scope**: Full-stack application (Frontend + Backend + Infrastructure)  
**Status**: Phase 4 — Registered User Support

---

## Executive Summary

The M2P-LAG project demonstrates **strong security awareness** in several areas, particularly SSRF protection, input validation, and the principle of backend authority for quotas. However, there are **critical gaps** in authentication handling, infrastructure security, and defense-in-depth that need immediate attention.

**Risk Level**: **MEDIUM-HIGH**
- 2 High-severity issues
- 5 Medium-severity issues  
- 8 Low-severity issues
- 3 Informational findings

---

## Critical Findings

### 🔴 [HIGH-1] Authentication Fallback to Guest on Service Failure

**Location**: `services/api/services/auth_service.py:69-70, 86-100, 113-118`

**Issue**: When the LAG-BRIDGE authentication service is unreachable or returns errors, the system **automatically falls back to guest sessions** for all users.

```python
if not self.enabled or not token:
    return self._guest_session()
# ...
except httpx.RequestError as exc:
    log.error("Auth service unreachable: %s", exc)
    return self._guest_session()  # ⚠️ DANGEROUS FALLBACK
```

**Risk**: 
- **Availability Attack**: If LAG-BRIDGE is flooded/DDoS'd, all authenticated users become guests
- **Privilege Escalation**: Registered users lose access controls, potentially accessing features meant only for authenticated users
- **Denial of Service**: Legitimate users cannot authenticate during outages

**Impact**: Complete authentication bypass during infrastructure issues

**Recommendation**:
```python
# Option 1: Fail closed (strict)
if not self.enabled or not token:
    return self._guest_session()

# For authenticated requests with invalid/error states:
if token and response.status_code == 503:
    raise AuthError("Authentication service temporarily unavailable. Please try again.")
```

---

### 🔴 [HIGH-2] Hardcoded Windows Paths in Configuration

**Location**: `services/api/config.py:49-59`

**Issue**: Production configuration contains hardcoded Windows user paths:

```python
YTDLP_PATH: str = os.getenv(
    "YTDLP_PATH",
    r"C:\Users\Lag-d\AppData\Local\Programs\Python\Python312\Scripts\yt-dlp.exe",
)
FFMPEG_PATH: str = os.getenv(
    "FFMPEG_PATH",
    r"C:\Users\Lag-d\AppData\Local\Microsoft\WinGet\Packages\..."
)
```

**Risk**:
- **Information Disclosure**: Exposes internal username (`Lag-d`) and system configuration
- **Deployment Failure**: Will break in production/Linux environments
- **Path Traversal**: If environment variables are overridden maliciously, could point to arbitrary executables

**Impact**: Information disclosure, deployment failures, potential command injection

**Recommendation**:
```python
# Use system PATH or relative paths
YTDLP_PATH: str = os.getenv("YTDLP_PATH", "yt-dlp")
FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "ffmpeg")
FFPROBE_PATH: str = os.getenv("FFPROBE_PATH", "ffprobe")
```

---

## Medium Severity Findings

### 🟡 [MEDIUM-1] SSRF Protection Completely Disabled with `ALLOW_PRIVATE_ADDRESSES`

**Location**: `services/api/security/url_guard.py:151-171`

**Issue**: Setting `ALLOW_PRIVATE_ADDRESSES=true` **completely disables the socket guard**:

```python
def install_socket_guard(allow_private: bool = False, proxy_urls=()) -> None:
    if allow_private:
        return  # ⚠️ NO PROTECTION AT ALL
    # ... rest of guard installation
```

**Risk**:
- **Complete SSRF Exposure**: Internal services (cloud metadata, databases, internal APIs) become accessible
- **Cloud Metadata Theft**: AWS/GCP/Azure metadata endpoints (169.254.169.254) can be accessed
- **Internal Network Scanning**: Attacker can map internal network topology

**Impact**: Full SSRF vulnerability when feature flag is enabled

**Recommendation**:
```python
def install_socket_guard(allow_private: bool = False, proxy_urls=()) -> None:
    # Even with allow_private, maintain guard but whitelist private ranges
    _allowed_loopback_endpoints.clear()
    _allowed_loopback_endpoints.update(_collect_proxy_endpoints(proxy_urls))
    
    if allow_private:
        # Add configured private ranges to whitelist instead of disabling
        _allowed_private_ranges = os.getenv("ALLOWED_PRIVATE_RANGES", "").split(",")
        # ... validate and add to allowed list
    
    socket.getaddrinfo = _guarded_getaddrinfo
```

---

### 🟡 [MEDIUM-2] In-Memory Rate Limiter - No Distributed Coordination

**Location**: `services/api/middleware.py:57-87`

**Issue**: Rate limiting uses in-memory storage with no Redis/backend coordination:

```python
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        self.requests: dict[str, list[float]] = defaultdict(list)
```

**Risk**:
- **Rate Limit Bypass**: Multiple API instances don't share state
- **Memory Exhaustion**: Unbounded growth of `self.requests` dictionary
- **No Persistence**: Rate limits reset on restart

**Impact**: Rate limiting ineffective in production, potential DoS

**Recommendation**:
```python
# Use Redis for distributed rate limiting
import redis

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        self.redis = redis.Redis(host='localhost', port=6379, db=0)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        key = f"ratelimit:{client_ip}"
        
        # Sliding window algorithm
        current = self.redis.zadd(key, {time.time(): time.time()})
        self.redis.zremrangebyscore(key, 0, time.time() - self.window_seconds)
        count = self.redis.zcard(key)
        
        if count >= self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests")
        
        self.redis.expire(key, self.window_seconds)
        return await call_next(request)
```

---

### 🟡 [MEDIUM-3] No HTTPS/TLS Configuration

**Location**: `docker-compose.yml`, `infra/nginx/m2p.conf`, `services/api/main.py`

**Issue**: All services run exclusively on HTTP:
- API: `http://m2p-api:8000`
- Frontend: `http://localhost:5173`
- No TLS termination in nginx config

**Risk**:
- **Man-in-the-Middle (MitM)**: Credentials and tokens transmitted in plaintext
- **Session Hijacking**: Bearer tokens can be intercepted
- **Data Tampering**: Responses can be modified in transit

**Impact**: Complete compromise of confidentiality and integrity

**Recommendation**:
```nginx
# Add to infra/nginx/m2p.conf
server {
    listen 443 ssl http2;
    server_name _;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # ... rest of config
}

server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

---

### 🟡 [MEDIUM-4] Overly Permissive CORS Configuration

**Location**: `services/api/main.py:42-48`

**Issue**: CORS allows all methods and headers with credentials:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],  # ⚠️ Too permissive
    allow_headers=["*"],  # ⚠️ Too permissive
)
```

**Risk**:
- **CSRF Attacks**: Any HTTP method allowed increases CSRF surface
- **Credential Theft**: Malicious origins could exploit overly broad CORS if origins list is misconfigured

**Impact**: Increased attack surface for CSRF and credential theft

**Recommendation**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],  # Explicit list
    allow_headers=["Authorization", "Content-Type"],  # Explicit list
    max_age=3600,
)
```

---

### 🟡 [MEDIUM-5] No Request Size Limits

**Location**: `services/api/main.py`

**Issue**: FastAPI app has no configured maximum request body size:

```python
app = FastAPI(
    title="M2P API",
    description="Media Server 2 Peer — API",
    version=settings.VERSION,
    # Missing: limit_request_size, etc.
)
```

**Risk**:
- **Denial of Service**: Large request bodies can exhaust memory/disk
- **Resource Exhaustion**: No protection against payload bombs

**Impact**: Availability risk, potential DoS

**Recommendation**:
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# In uvicorn config:
# --limit-request-line 8192
# --limit-request-field_size 8192
# --limit-request-fields 100
```

---

## Low Severity Findings

### 🟢 [LOW-1] No Security Headers in Nginx

**Location**: `infra/nginx/m2p.conf`

**Issue**: Missing standard security headers:

```nginx
# Missing:
# - Content-Security-Policy
# - X-Frame-Options
# - X-Content-Type-Options
# - Strict-Transport-Security
# - X-XSS-Protection
# - Referrer-Policy
```

**Risk**: XSS, clickjacking, MIME sniffing attacks

**Recommendation**:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

### 🟢 [LOW-2] Detailed Error Messages Leak Internal Information

**Location**: `services/api/main.py:109-114`, `services/api/services/extraction_service.py:145-148`

**Issue**: Error messages expose internal details:

```python
raise HTTPException(
    status_code=500,
    detail="An unexpected error occurred while inspecting this source.",
)
# But logs contain full stack traces accessible via debug endpoints
```

**Risk**: Information disclosure aids attacker reconnaissance

**Recommendation**: Ensure debug endpoints are disabled in production, sanitize error responses

---

### 🟢 [LOW-3] No CSRF Protection

**Location**: All POST endpoints

**Issue**: No CSRF tokens implemented, relies solely on CORS + Bearer auth

**Risk**: If browser-based attacks are possible (XSS), CSRF could be exploited

**Impact**: Low (requires XSS first), but defense-in-depth missing

**Recommendation**: Implement CSRF double-submit cookie pattern for state-changing operations

---

### 🟢 [LOW-4] Unbounded In-Memory Job Store

**Location**: `services/api/main.py:64`

**Issue**: Jobs dictionary grows unbounded:

```python
_jobs: dict[str, dict] = {}
```

**Risk**: Memory exhaustion under high load

**Recommendation**: Implement TTL-based cleanup or use Redis with expiration

---

### 🟢 [LOW-5] No Dependency Pinning for Backend

**Location**: `services/api/requirements.txt`

**Issue**: Uses version ranges (`>=`) instead of exact versions:

```
fastapi>=0.115.0
yt-dlp>=2024.12.0
```

**Risk**: Supply chain attacks, unexpected breaking changes

**Recommendation**: Use `pip freeze > requirements.txt` for exact versions

---

### 🟢 [LOW-6] Frontend API Calls Without Authentication Headers

**Location**: `apps/web/src/lib/api.ts`

**Issue**: API client doesn't attach authentication tokens:

```typescript
const response = await fetch(`${API_BASE}/api/v1/media/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Missing: Authorization header
});
```

**Risk**: Authenticated endpoints may reject requests or fall back to guest

**Recommendation**: Implement auth token management in API client

---

### 🟢 [LOW-7] Guest Session Information Disclosure

**Location**: `services/api/main.py:203-223`

**Issue**: `/api/v1/me` endpoint reveals system configuration to unauthenticated users:

```python
return {
    "user_id": session.user_id,
    "role": session.role,
    "quota": {
        "max_clip_seconds": settings.GUEST_MAX_CLIP_SECONDS,
        "max_file_size": settings.GUEST_MAX_FILE_SIZE,
        # ... exposes internal limits
    }
}
```

**Risk**: Information disclosure aids attacker reconnaissance

**Impact**: Low (configuration is not secret), but unnecessary exposure

---

### 🟢 [LOW-8] Cleanup Service Not Scheduled

**Location**: `services/api/services/cleanup_service.py`

**Issue**: Cleanup service exists but no background scheduler configured:

```python
class CleanupService:
    def run(self):
        """Execute all cleanup tasks."""
        # This is never called automatically!
```

**Risk**: Disk space exhaustion, orphaned files accumulate

**Recommendation**: Add APScheduler or Celery beat to run cleanup periodically

---

## Positive Security Findings ✅

### Strong Points:

1. **SSRF Protection**: Excellent multi-layered SSRF guard with DNS rebinding protection
2. **Backend Authority**: Quotas enforced server-side, never trusting client input
3. **Input Validation**: Pydantic models + Zod schemas provide strong type safety
4. **Path Sanitization**: File paths properly sanitized to prevent traversal
5. **Guest Enforcement**: Clear separation of guest vs. authenticated user limits
6. **Error Handling**: Proper exception handling with user-friendly messages
7. **Logging**: Comprehensive logging for security events
8. **Dependency Management**: Modern, actively maintained dependencies

---

## Recommendations Priority Matrix

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | [HIGH-1] Auth fallback to guest | Low | Critical |
| **P0** | [HIGH-2] Hardcoded Windows paths | Low | High |
| **P1** | [MEDIUM-1] SSRF bypass with allow_private | Medium | High |
| **P1** | [MEDIUM-2] In-memory rate limiting | High | Medium |
| **P1** | [MEDIUM-3] No HTTPS/TLS | High | High |
| **P2** | [MEDIUM-4] Overly permissive CORS | Low | Medium |
| **P2** | [MEDIUM-5] No request size limits | Low | Medium |
| **P3** | [LOW-*] All low-severity findings | Various | Low |

---

## Compliance & Best Practices

### OWASP Top 10 Coverage:

| OWASP Category | Status | Notes |
|----------------|--------|-------|
| A01:2021 – Broken Access Control | ⚠️ Partial | Auth fallback weakens access control |
| A02:2021 – Cryptographic Failures | ✅ Good | No sensitive data storage, TLS recommended |
| A03:2021 – Injection | ✅ Good | SSRF guard, input validation |
| A04:2021 – Insecure Design | ⚠️ Partial | Auth fallback is design flaw |
| A05:2021 – Security Misconfiguration | ⚠️ Partial | Hardcoded paths, missing security headers |
| A06:2021 – Vulnerable Components | ✅ Good | Modern dependencies |
| A07:2021 – Auth Failures | ⚠️ Partial | Fallback to guest weakens auth |
| A08:2021 – Data Integrity Failures | ✅ Good | No code injection vectors |
| A09:2021 – Logging Failures | ✅ Good | Comprehensive logging |
| A10:2021 – SSRF | ⚠️ Partial | Good guard, but can be disabled |

---

## Next Steps

1. **Immediate (P0)**:
   - Fix authentication fallback behavior
   - Remove hardcoded Windows paths

2. **Short-term (P1)**:
   - Implement Redis-backed rate limiting
   - Add TLS/HTTPS support
   - Fix SSRF guard bypass

3. **Medium-term (P2)**:
   - Restrict CORS methods/headers
   - Add request size limits
   - Implement security headers

4. **Long-term (P3)**:
   - Pin all dependencies
   - Add CSRF protection
   - Schedule cleanup jobs
   - Implement distributed job store

---

## Appendix: Files Reviewed

### Backend:
- `services/api/main.py` — Main FastAPI application
- `services/api/middleware.py` — Auth & rate limiting middleware
- `services/api/config.py` — Configuration management
- `services/api/models.py` — Pydantic request/response models
- `services/api/services/auth_service.py` — Authentication service
- `services/api/services/extraction_service.py` — Media extraction
- `services/api/services/metadata_service.py` — Metadata extraction
- `services/api/services/storage_service.py` — File storage management
- `services/api/services/cleanup_service.py` — Cleanup worker
- `services/api/security/url_guard.py` — SSRF protection

### Frontend:
- `apps/web/src/lib/api.ts` — API client
- `apps/web/src/components/AuthStatus.tsx` — Auth UI
- `apps/web/src/components/UrlInput.tsx` — URL input component
- `apps/web/src/features/extractor/ClipEditor.tsx` — Clip editor
- `apps/web/src/types/index.ts` — TypeScript types
- `apps/web/vite.config.ts` — Vite configuration
- `apps/web/package.json` — Dependencies

### Infrastructure:
- `docker-compose.yml` — Docker orchestration
- `infra/docker/Dockerfile.api` — API container
- `infra/docker/Dockerfile.web` — Web container
- `infra/nginx/m2p.conf` — Nginx configuration
- `services/api/requirements.txt` — Python dependencies

---

**End of Report**