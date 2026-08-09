# M2P — Bug Audit, Unlimited Registered Users, Guest Free Download, B1T$ Purchase, HUD Redesign

**Date:** 2026-08-09
**Status:** Approved by user, pending implementation plan

## 1. Context

M2P is pre-LAG-Bridge (the auth integration in `docs/LAG-BRIDGE.md` is a request to the
LaGrieta team, not yet implemented on their side). Before wiring that integration, this
spec covers four related pieces of work against the current codebase
(`apps/web`, `services/api`):

1. Fix concrete GUI/logic bugs found during audit.
2. Remove duration/size limits for registered users — gate only on B1T$ balance.
3. Give guests one free unlimited download, plus register/buy-B1T$ entry points.
4. Redesign the GUI in a "HUD / mission-console" direction using the full logo.

These ship together because they touch the same files (quota logic, `AuthStatus`,
`ClipEditor`, `SourceCard`, `Landing`).

## 2. Bug fixes

| Bug | Location | Fix |
|---|---|---|
| Hardcoded 20s cap enforced client-side for everyone | `ClipEditor.tsx` (`GUEST_MAX_SECONDS = 20`) | Read `max_clip_seconds` from `/api/v1/me/quota`; `null`/absent = unlimited, no boundary marker rendered. |
| Broken video preview (`<video src={format_id}>`) | `ClipEditor.tsx` `getVideoSource()` | Remove the non-functional inline `<video>` scrubbing. Show the thumbnail plus numeric MM:SS inputs for IN/OUT instead of a scrub bar. |
| Weak file lookup / no ownership check | `main.py` `/api/v1/files/{file_id}` GET & DELETE | Store full UUID hex as filename (already generated), match exactly instead of `startswith(file_id[:8])`. Record the creating session's `user_id` or `guest_token` in the `_jobs` entry; reject download/delete if the requester doesn't match. |
| Fake client-side role switch shippable to prod | `DevModeToggle.tsx` | Remove from the rendered tree outside of `import.meta.env.DEV`; never shown in a production build. |
| No B1T$ deduction / daily-job counting anywhere | `extraction_service.py`, `main.py` | Replaced by the new `CreditService` (§3). |
| API client never sends `Authorization` header | `lib/api.ts` | Add a token accessor (reads from the new auth/session storage, §4) and attach `Authorization: Bearer <token>` to all requests when present. |

Out of scope (already tracked in `SECURITY_AUDIT.md`, not re-litigated here): HTTPS/TLS,
distributed rate limiting, hardcoded tool paths, CORS header tightening, security headers,
request size limits, CSRF, dependency pinning.

## 3. Quota & B1T$ credit logic

### Registered users: unlimited, credit-gated

- Remove server-side enforcement of `max_clip_seconds` / `max_source_size` /
  `USER_DAILY_JOBS` for role `"user"` and `"admin"`. These fields may still be reported by
  LAG-Bridge in the future but M2P no longer enforces them as hard caps once B1T$ gating
  exists.
- New `CreditService` (`services/api/services/credit_service.py`):
  - Input: `Session`, operation type (`clip`, `full_download`, `transcript`,
    `hevc_encode`), and duration/size as applicable.
  - Computes cost using the existing table from `ARCHITECTURE.md` §L:
    - Registered short clip (≤60s): 0 (free tier, unchanged)
    - Full source download: `ceil(file_size / 50MB)`
    - Transcript extraction: `ceil(duration / 60s)`
    - HEVC/H.265 encode: `ceil(duration / 60s) * 2`
  - Checks balance via LAG-Bridge-reported `b1t_balance` (session-scoped for now, since
    M2P has no user DB); on success, deducts and appends a record to
    `/data/credits/<user_id>.jsonl` (append-only transaction log, consistent with the
    "no DB, JSON files" MVP persistence pattern in `ARCHITECTURE.md` §K).
  - Insufficient balance → raise `InsufficientCreditsError`, mapped to HTTP `402` with a
    message identifying the shortfall; frontend catches `402` and offers the Buy B1T$
    modal (§5).
  - This is a session-local ledger until LAG-Bridge is live and b1t$ balance becomes
    authoritative server-side on the LaGrieta side; that migration is a future phase, not
    part of this spec.

### Guests: one free unlimited download

- Frontend generates a random `guest_token` (UUID) on first load if none exists in
  `localStorage`, and sends it as `X-M2P-Guest-Token` on every request.
- New backend store `/data/guests/tokens.json`: maps `guest_token → { free_download_used:
  bool, first_seen: timestamp }`.
- Scope of the free download: exactly one call to `POST /api/v1/jobs/download` (full
  source, standard/H.264 quality — HEVC and transcript-only extraction remain
  registered-only), with no duration or file-size cap. The existing always-free 20-second
  clip extraction is untouched and unaffected by token state.
- First use: succeeds, marks `free_download_used = true` for that token.
- Subsequent use by the same token: `403` with "Free download already used — register or
  buy B1T$ for more downloads."
- This is a soft, resettable perk (clearing `localStorage` or using a new browser resets
  it) — acceptable since it's a low-stakes acquisition incentive, not a security boundary.

### `/api/v1/me/quota` response changes

Add `free_download_used: bool | null` (guests only, `null` for registered users) to the
existing response shape. `daily_jobs_remaining` continues to be reported for
informational/analytics purposes but is no longer enforced for registered users per the
above.

## 4. Register / Buy B1T$ entry points

- **`AuthStatus`**: replace the `alert()` login placeholder with a real "Sign in with
  LaGrieta" button that navigates to `import.meta.env.VITE_LAGRIETA_AUTH_URL`. If that env
  var is unset, the button is disabled with a "Coming soon" tooltip instead of firing a
  dead alert. Same treatment for sign-out (clears local session token) once a token exists
  to clear.
- **`BuyB1tModal`** (new component): opened from a header "Buy B1T$" affordance or
  automatically offered on a `402` response. Shows three package tiers (100 / 500 / 1000
  B1T$, styled as HUD cards, §6). Confirming calls `POST /api/v1/b1t/purchase` (new stub
  endpoint):
  - Default (production) config: returns `501 Not Implemented` with "B1T$ purchases are
    not yet available."
  - When `M2P_DEV_CREDIT_GRANTS=true` (dev/staging only): actually credits the session's
    balance, so the full UI flow is clickable and demoable without a real payment
    provider. Real MedusaJS/payment integration is explicitly out of scope (per
    `ARCHITECTURE.md` §L, billing is post-MVP).
- **Guest free-download badge**: small indicator near the source card — "1 FREE FULL
  DOWNLOAD AVAILABLE" before use; "FREE DOWNLOAD USED — Register or buy B1T$" after,
  linking to the register button / buy modal respectively.

## 5. GUI redesign — HUD / mission-console

A re-skin of the existing view states (input → source → extractor → result) and
components — no new information architecture.

- **Palette**: charcoal `#121212` base (unchanged), `#a00000` red accent (unchanged), add
  `rgba(160,0,0,0.35)` red glow for borders/focus states, `#e8e8e8` body text (reserve
  pure white for emphasis), gray-500 for secondary HUD labels.
- **Typography**: keep existing sans for body copy; add a monospace face (system mono
  stack, e.g. `ui-monospace, "JetBrains Mono", monospace`) for all data readouts —
  duration, filesize, codec, resolution, b1t$ balance, timestamps.
- **Shape language**: replace `rounded-xl` cards with clipped-corner panels (`clip-path`
  cutting one or two corners, echoing the diamond logo), 1px borders that glow red on
  focus/active, small SVG/CSS "targeting bracket" accents on the main panel's corners.
- **Background texture**: fixed low-opacity grid/scanline overlay behind the charcoal
  base (CSS `repeating-linear-gradient` or a tiled SVG pattern) — subtle, must not reduce
  text contrast below WCAG AA.
- **Landing hero**: logo mark enlarged (2–3x current), "M2P" wordmark in bold
  tracked-out uppercase plus tagline, framed by HUD corner brackets — the one large "full
  logo" showcase moment.
- **Header (source/extractor/result views)**: logo mark + wordmark shrink into a
  persistent top bar alongside `AuthStatus` (session, b1t$ balance, register/buy
  affordances); bottom border with a subtle red glow line.
- **Progress rail**: thin 4-step indicator (SOURCE → INSPECT → EXTRACT → DELIVER,
  matching the existing product tagline in `README.md`) across the top of the content
  area, reflecting the current `ViewState`.
- **Buttons**: primary actions get an angular-cut shape with a thin CSS scan-line sweep
  on hover; no new JS dependencies.

Accessibility constraint: all redesign changes must keep contrast ratios at WCAG AA for
body and readout text — glow/texture effects are decorative layers behind text, never
the text's only distinguishing treatment.

## 6. Non-goals

- Real payment/checkout integration (MedusaJS or otherwise) — stubbed only.
- Actual LAG-Bridge endpoint implementation on the LaGrieta side — M2P only calls it via
  a configurable URL; if unreachable, `AuthService` continues falling back to guest
  (existing behavior, flagged as HIGH-1 in `SECURITY_AUDIT.md`, not re-addressed here).
- Server-authoritative B1T$ balance across sessions/devices — until LAG-Bridge is live,
  the credit ledger described in §3 is best-effort and session/token-scoped.
- Video scrubbing preview fix via a backend streaming proxy — replaced with a simpler
  thumbnail + numeric-input approach instead.
