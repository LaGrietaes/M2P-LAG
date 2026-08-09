# M2P — Architecture Assessment

> Phase 0 deliverable. Produced before any application code is written, per
> blueprint §37. This documents the MeTube reference inspection, what can be
> reused, what must be rewritten, and the Phase 1 implementation plan.

## A. Repository state

`c:/dev/M2P-LAG` is an **empty repository** (no source code). It contains only a
brand asset folder (`M2P Brand/Logos/SVG/Asset 2.svg`).

**Conclusion:** This is a brand-new M2P project — **not** a MeTube fork, **not**
an existing M2P codebase, **not** unrelated.

## B. MeTube reference inspection

Reference: https://github.com/alexta69/metube (AGPL-3.0)

### Stack

| Layer        | MeTube                          | M2P target (blueprint)                 |
|--------------|---------------------------------|----------------------------------------|
| Backend      | Python 3.13, **aiohttp**, socketio | Python 3.13+, REST + SSE/WS            |
| Frontend     | **Angular**                     | **React + TS + Vite**                  |
| Media engine | yt-dlp[default,curl-cffi,deno]  | yt-dlp + FFmpeg                        |
| Persistence  | AtomicJsonStore (JSON files)    | JSON files (no DB for MVP)             |
| Deps         | uv (uv.lock)                    | uv or pip                              |
| Container    | multi-stage Docker (node→python:3.13-slim) | Docker Compose (m2p-web, m2p-api, m2p-worker) |

### Backend modules inspected

- `app/main.py` (~1100 lines) — aiohttp app, `Config` (env-driven), REST routes,
  socket.io progress broadcasting, static file serving, CORS, graceful exit.
  Routes: `add`, `cancel-add`, `retry`, `delete`, `start`, `history`,
  `presets`, `subscribe`/`subscriptions`, `upload-cookies`/`delete-cookies`,
  `cookie-status`, `version`, `robots.txt`.
- `app/ytdl.py` (~1960 lines) — the download engine:
  - `_ConfinedYoutubeDL` — **path-containment enforcement** (refuses any output
    path outside allowed roots; defeats yt-dlp template traversal).
  - `_sanitize_path_component` / `_is_within_directory` — Windows-invalid char
    stripping + `..` traversal neutralisation.
  - `_sanitize_entry_for_pickle` — serialises yt-dlp info_dicts for shelve.
  - `Download` class — runs yt-dlp in a **forked subprocess** (Linux), own
    process group, SIGINT→SIGKILL escalation, throttled progress hooks,
    status queue, chapter/subtitle capture.
  - `PersistentQueue` + `AtomicJsonStore` — crash-safe JSON persistence of the
    download queue (no database).
  - `clip_start`/`clip_end` via `yt_dlp.utils.download_range_func`.
- `app/url_guard.py` (~250 lines) — **SSRF protection**:
  - `validate_url` — ingress validation (scheme, blocked hostnames, resolves
    every address and rejects non-global IPs incl. link-local/private).
  - `install_socket_guard` — connect-time `getaddrinfo` monkey-patch covering
    redirects, DNS rebinding, manifest-derived media URLs; proxy-aware.
- `app/dl_formats.py` (~195 lines) — **format/codec selection**:
  - `CODEC_FILTER_MAP` = `{h264, h265, av1, vp9}` → yt-dlp vcodec selectors.
  - `get_format` — builds format selectors with resolution capping
    (`[height<=QUALITY]`) and ext constraints.
  - `get_opts` — postprocessors (FFmpegExtractAudio, FFmpegSubtitlesConvertor,
    FFmpegThumbnailsConvertor, EmbedThumbnail, FFmpegMetadata).
- `app/bg_tasks.py`, `app/state_store.py`, `app/subscriptions.py`,
  `app/music_metadata.py` — background tasks, atomic JSON store, subscription
  scanning, music metadata post-processing.
- `app/tests/` — pytest suite (aiohttp, asyncio) covering url_guard, formats,
  queue, config, helpers.

### Frontend

Angular 19+ (standalone components, signals). **Must be fully rewritten** for
React. The Angular code is **not** reusable as-is.

## C. What can be reused (backend, AGPL-3.0)

These modules map **directly** to M2P's security and media requirements and
should be ported (with license preservation) into M2P's backend services:

| MeTube module        | M2P service             | Rationale                                                                 |
|----------------------|-------------------------|---------------------------------------------------------------------------|
| `url_guard.py`       | `security/`             | SSRF guard is explicitly required by §19. High reuse value, drop-in.      |
| `dl_formats.py`      | `media/` (format select)| `h265` codec + `[height<=Q]` resolution capping = the HEVC/720p requirement.|
| `_ConfinedYoutubeDL` | `media/`                | Path-containment invariant required by §19 ("never expose FS paths").     |
| `_sanitize_path_component` | `media/`          | Defeats template-based path traversal.                                    |
| `Download` patterns  | `DownloadService`       | Subprocess mgmt, cancellation, progress throttling.                       |
| `AtomicJsonStore`    | `state_store`           | MVP persistence without a DB (§31: "simplest persistence").               |
| `PersistentQueue`    | `JobService`            | Crash-safe job queue persistence.                                         |
| Docker multi-stage   | `infra/docker/`         | node builder → python:3.13-slim runtime pattern.                          |

**License obligation:** MeTube is AGPL-3.0. Any directly incorporated code must
preserve the license. M2P should wrap reused logic behind clean service
interfaces so M2P-specific application logic stays separate (§06).

## D. What must be rewritten for React

- **Entire frontend** — Angular → React + TS + Vite + React Router + TanStack
  Query + Zod + Tailwind (§05). MeTube's Angular components are not reusable.
- **API surface** — MeTube's routes are download-centric (`add`/`start`). M2P
  needs `inspect`, `jobs/download`, `jobs/extract`, `jobs/:id/progress`,
  `files/:id`, `me`, `me/quota`, `me/history` (§08).
- **Extraction pipeline** — MeTube only does `clip_start/clip_end` inside
  yt-dlp. M2P needs a dedicated `ExtractionService` (FFmpeg segment extraction)
  with the guest 20-second hard limit (§10, §09).
- **Quota system** — MeTube has none. M2P needs guest/user quotas enforced
  server-side (§17, §10).
- **Auth** — MeTube has none. M2P needs guest/user/admin roles (§20).
- **Job model** — MeTube is download-only. M2P needs
  QUEUED/DOWNLOADING/PROCESSING/READY/FAILED (§14).

## E. What should remain separate

- M2P's **extraction** (FFmpeg) — distinct from MeTube's download-only model.
- M2P's **quota enforcement** — backend-authoritative, never trusted from client.
- M2P's **auth layer** — pluggable provider abstraction (§20).
- M2P's **cleanup scheduler** — TTL-based deletion (§30).

## F. API integration notes

- MeTube's **socket.io progress** model informs M2P's SSE/WS job-progress
  design (§08). M2P may use SSE for simplicity.
- MeTube's **format presets** map cleanly to M2P's VIDEO (Compatible/High
  Quality) and AUDIO (MP3/Original) presets (§11).
- MeTube's **download engine** can be wrapped by M2P's `DownloadService`;
  M2P adds a separate `ExtractionService` for FFmpeg.

## G. Phase 1 implementation plan (Foundation)

Per §34, Phase 1 only — **no media pipeline yet**.

1. **Project scaffold**
   - `apps/web/` — React + TS + Vite, responsive shell, M2P branding (use
     `M2P Brand/Logos/SVG/Asset 2.svg`).
   - `services/api/` — Python 3.13 backend (FastAPI preferred for clean REST +
     auto docs; aiohttp is the MeTube-compatible alternative).
   - `packages/shared-types/` — Zod-validated types shared between frontend and
     backend.
   - `infra/docker/` — `docker-compose.yml` with `m2p-web`, `m2p-api`,
     `m2p-worker` (worker stub for Phase 1).
2. **Frontend**
   - Landing state (§27): M2P title, tagline, URL input, INSPECT button.
   - Responsive layout (mobile-first, §22).
   - PWA manifest + service worker shell (§25).
3. **Backend skeleton**
   - `POST /api/v1/media/inspect` stub (returns placeholder metadata).
   - Health/version endpoints.
   - Config via environment (§17 pattern).
4. **Dev environment**
   - `docker-compose.yml` for local dev.
   - README with `npm run dev` / `uv run` instructions.

**STOP** — do not implement Phase 2 (metadata) until Phase 1 is approved and
verified.

## H. HEVC / resolution requirement (from task)

> "Use new format hvec 265 for better performance, ask user the resolution
> needed starting at 720p if available up to the max video quality offered by
> the source."

MeTube's `dl_formats.py` already supports `h265` codec selection and
`[height<=QUALITY]` resolution capping. M2P will:
- Add an `h265` codec option to the VIDEO presets.
- Surface a resolution selector (720p → max available) in the source card.
- Default to H.264/MP4 "Compatible" for broadest playback; offer H.265 as
  "High Quality" (§11).

## I. Audio-only & transcripts (registered users)

Per user feedback, registered users get two additional extraction modes beyond
video clips:

- **MP3-only (audio extraction)** — yt-dlp + `FFmpegExtractAudio` postprocessor
  (MeTube's `dl_formats.py` already implements this for `download_type == "audio"`).
- **Transcripts-only** — subtitle extraction as SRT/VTT/TXT via
  `FFmpegSubtitlesConvertor` (MeTube implements this for `download_type ==
  "captions"`).

These map to M2P's §11 AUDIO presets (MP3 / Original) and the subtitles feature.
They are **registered-user-only** (§02) and subject to quota. Guests keep the
20-second video clip limit only.

## J. Auth integration — LaGrieta ecosystem

Registered users come from the **LaGrieta** main project (`C:\dev\lagrieta`),
not a new M2P user database. Inspected `docker-compose.yml` + `.env.example`:

| Provider | Role | How M2P consumes it |
|---|---|---|
| **Ghost CMS** (`ghost:6-alpine`, SQLite dev / MySQL prod) | Canonical member identity | Ghost Admin API (`GHOST_ADMIN_API_KEY`) to resolve/validate a member session → role `user` |
| **MedusaJS** (`medusa` service, Postgres+Redis) | Commerce customers | Medusa already bridges to Ghost via `src/lib/ghost-admin.ts` (ghost-session middleware) — so a Medusa customer JWT resolves to a Ghost member |
| **Supabase Auth** (`SUPABASE_JWT_SECRET`, `SUPABASE_URL`) | Alternative JWT auth | Validate `SUPABASE_JWT_SECRET`-signed JWTs |

**Design (§20 — replaceable provider):** M2P's `AuthProvider` abstraction
accepts a bearer token (Ghost session / Medusa JWT / Supabase JWT), validates it
against the configured provider, and returns a `Session { role, user_id, ... }`.
Ghost is the default/primary provider; the others are pluggable. This keeps M2P
from being tightly coupled to one vendor while reusing the existing LaGrieta
identity. Auth is **Phase 4** — not needed for Phase 1.

## K. Deployment recommendation (low traffic)

Per user: ~3–5 downloads/day initially, daily limits, b1t$ for resource-heavy ops.

**Recommended system:** A single Docker Compose stack on a modest VPS.

| Component | Spec | Rationale |
|---|---|---|
| Host | 2 vCPU, 4 GB RAM (scale to 4 vCPU/8 GB) | Low traffic; media processing is bursty |
| `m2p-web` | nginx serving static React build | Lightweight |
| `m2p-api` | Python 3.13 (FastAPI) | REST + SSE |
| `m2p-worker` | Python 3.13 + yt-dlp + ffmpeg | Isolated media processing |
| Storage | single shared `/data` volume | temp/users/clips/metadata/thumbnails |
| DB | **none** (JSON files) | §31: no PostgreSQL/Redis for MVP |
| Queue | in-process + JSON persistence | §31: simplest persistence |
| Proxy | existing LaGrieta nginx | §32 |

Concurrency (configurable, §18):
```
MAX_CONCURRENT_DOWNLOADS=2
MAX_CONCURRENT_EXTRACTIONS=2
```
This keeps the server responsive during bursts. No Redis/PostgreSQL needed until
traffic justifies it (§31).

## L. b1t$ credit system (registered users)

Per user: resource-intensive operations (full video download, transcript, HEVC
encoding) consume **b1t$** from the user's balance. This is a quota/credit
system, **not** a subscription/billing system (§01 excludes billing from MVP).

**Design:**
- Each registered user has a `b1t$` balance (stored in M2P's metadata store,
  keyed to their Ghost/Medusa user ID).
- Operations cost b1t$ based on resource consumption:
  - **Guest:** 20s clip = free (hard 20s limit, §10). No b1t$.
  - **Registered free tier:** N extractions/day (configurable, e.g. 3) at no
    cost — covers short clips only.
  - **Full source download:** cost = `f(file_size)` — large files consume more.
  - **Transcript extraction:** cost = `f(duration)` — CPU-bound.
  - **HEVC/H.265 encoding:** cost = `f(duration)` with a higher multiplier —
    CPU-intensive.
- b1t$ can be **earned** (daily login/activity bonus) or **purchased** later
  (pricing TBD — §01 excludes billing from MVP).
- **Backend-authoritative:** the quota/credit check happens server-side in
  `QuotaService` before any job is queued. The frontend never trusts client-side
  limits (§10, §17).
- Daily limits are a separate configurable cap (§17) layered on top of b1t$.

This maps to §17 (configurable quotas) and §02 (registered-user capabilities).
b1t$ is **Phase 4** (auth + quotas), not Phase 1.


