# LAG-Bridge — M2P ↔ LaGrieta Integration Request

**From:** M2P Development Team  
**To:** LaGrieta Web Dev Team  
**Priority:** High (blocks Phase 4)  
**Domain:** m2p.lagrieta.es  

---

## 1. Context

M2P (Media Server 2 Peer) is a new media extraction tool in the LaGrieta ecosystem. It needs to authenticate registered users against the existing LaGrieta identity providers so that M2P can:

- Recognize LaGrieta members as registered M2P users
- Enforce per-user quotas and b1t$ credits
- Allow source downloads and longer extractions for authenticated users
- Log audit metadata (source URL, creator, extraction date) tied to a user identity

M2P does **not** manage its own user database. It delegates authentication to LaGrieta's existing providers.

---

## 2. What M2P Needs

### 2.1 Auth Provider Endpoint

M2P needs a **single HTTP endpoint** on the LaGrieta infrastructure that accepts a bearer token and returns a normalized user identity.

**Proposed endpoint:**

```
POST /api/v1/auth/validate
Authorization: Bearer <token>
```

**Request headers:**

```
Content-Type: application/json
```

**Success response (200):**

```json
{
  "user_id": "ghost_member_id_or_medusa_customer_id",
  "role": "user",
  "provider": "ghost",
  "email": "user@example.com",
  "name": "Display Name",
  "b1t_balance": 100,
  "quota": {
    "max_clip_seconds": 300,
    "max_source_size": 500000000,
    "daily_jobs": 10,
    "storage_quota": 1073741824
  }
}
```

**Error responses:**

- `401 Unauthorized` — token invalid, expired, or missing
- `403 Forbidden` — token valid but user is banned/restricted
- `422 Unprocessable Entity` — token format unsupported

**Field notes:**

- `role` must be one of: `guest`, `user`, `admin`
- `b1t_balance` is the user's credit balance (integer, 0 = no credits)
- `quota` overrides M2P defaults if present; M2P falls back to server-side config otherwise
- If `provider` is `"none"` or missing, M2P treats the user as a guest

---

### 2.2 CORS Configuration

M2P frontend runs on `m2p.lagrieta.es` (and `localhost:5173` for dev). The LaGrieta auth endpoint must allow CORS from these origins.

**Required CORS headers on `/api/v1/auth/validate`:**

```
Access-Control-Allow-Origin: https://m2p.lagrieta.es, http://localhost:5173
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

M2P will send a preflight `OPTIONS` request before `POST`.

---

### 2.3 Token Formats M2P Will Send

M2P needs to support three token types (pluggable provider abstraction):

| Provider | Token Type | How M2P receives it |
|----------|-----------|---------------------|
| **Ghost CMS** | Ghost session cookie or Admin API key | M2P frontend reads Ghost session cookie; backend validates via Ghost Admin API |
| **MedusaJS** | Medusa JWT | M2P frontend sends `Authorization: Bearer <medusa_jwt>` |
| **Supabase Auth** | Supabase JWT | M2P frontend sends `Authorization: Bearer <supabase_jwt>` |

**Preferred initial approach:** A single `/api/v1/auth/validate` endpoint on the LaGrieta API gateway that internally resolves the token against Ghost/Medusa/Supabase and returns the normalized response above. This keeps M2P decoupled from the underlying provider.

---

### 2.4 b1t$ Credit System (Optional for MVP)

If b1t$ credits are enabled, the auth response should include `b1_balance`. M2P will:

- Deduct credits before expensive operations (full source download, HEVC encode, transcript extraction)
- Reject the operation with HTTP 402 if balance is insufficient
- Log credit transactions for audit

**Credit costs (configurable server-side):**

| Operation | b1t$ Cost |
|-----------|-----------|
| Guest 20s clip | 0 (free) |
| Registered short clip (≤60s) | 0 (free tier) |
| Full source download | `ceil(file_size / 50MB)` |
| Transcript extraction | `ceil(duration / 60s)` |
| HEVC/H.265 encode | `ceil(duration / 60s) * 2` |

---

## 3. What M2P Will Provide

### 3.1 M2P API Base URL

```
Production: https://m2p.lagrieta.es/api/v1
Development: http://localhost:8001/api/v1
```

### 3.2 M2P Health Endpoint (for LaGrieta to monitor)

```
GET https://m2p.lagrieta.es/health
```

Returns:

```json
{ "status": "ok" }
```

### 3.3 M2P Webhook (Optional)

M2P can POST job completion events to a LaGrieta webhook if needed:

```
POST https://lagrieta.es/api/v1/m2p/webhook
X-M2P-Signature: <hmac>
```

Body:

```json
{
  "event": "extraction.complete",
  "user_id": "ghost_123",
  "file_id": "abc123",
  "media_title": "Rick Astley - Never Gonna Give You Up",
  "duration": 15.0,
  "file_size": 5242880,
  "b1t_cost": 0,
  "timestamp": "2026-08-09T00:00:00Z"
}
```

---

## 4. Security Requirements

### 4.1 Token Handling

- M2P never stores raw tokens long-term (session-only)
- Tokens are sent over HTTPS only
- M2P validates token format before forwarding to LaGrieta
- LaGrieta's `/api/v1/auth/validate` must validate token expiry, signature, and revocation

### 4.2 Rate Limiting

LaGrieta's auth endpoint should rate-limit per IP/token to prevent abuse:

```
Max: 10 requests/second per IP
Burst: 20 requests
```

### 4.3 Audit Logging

LaGrieta should log (at minimum):

- Timestamp
- User ID
- IP address
- Token provider
- Result (success/failure)
- Failure reason (if any)

M2P will log its own audit trail separately.

---

## 5. Implementation Timeline

| Milestone | Description | ETA |
|-----------|-------------|-----|
| **LAG-Bridge v1** | `/api/v1/auth/validate` endpoint + CORS | 1–2 days |
| **Ghost integration** | Validate Ghost session cookies | +1 day |
| **Medusa integration** | Validate Medusa JWTs | +1 day |
| **Supabase integration** | Validate Supabase JWTs | +1 day |
| **b1t$ integration** | Return balance + quota in auth response | +1 day |
| **End-to-end test** | M2P ↔ LaGrieta auth flow | +1 day |

---

## 6. Contact

**M2P Team:**  
- Repo: https://github.com/alexta69/metube (reference)  
- Domain: https://m2p.lagrieta.es  
- Blueprint: `docs/ARCHITECTURE.md` in M2P repo  

**Questions?** Open an issue in the M2P repo or contact the LaGrieta lead dev.

---

## 7. Appendix: M2P Auth Flow

```
User opens m2p.lagrieta.es
         |
         v
M2P frontend checks for LaGrieta session cookie / stored token
         |
         v
M2P backend sends token to LaGrieta /api/v1/auth/validate
         |
         v
LaGrieta returns { user_id, role, provider, quota }
         |
         v
M2P backend creates M2P session (JWT or session cookie)
         |
         v
M2P frontend uses M2P session for subsequent API calls
```

**Guest fallback:** If no token is present or validation fails, M2P treats the user as a guest with default 20-second limits.
