# M2P — Media Server 2 Peer

> **SOURCE → DOWNLOAD → PREVIEW → EXTRACT → DELIVER**
>
> The shortest path from media you found to the piece of media you actually need.

M2P is a fast, clean, cross-platform media acquisition and extraction tool.
Paste a URL, inspect the source, select a segment, and extract exactly what you
need — then take it to your preferred editing workflow.

**Not** a video editor, NLE, effects system, or social network.

## Quick start

### Prerequisites

- Node.js 22+
- Python 3.13+
- Docker + Docker Compose (for local dev and production)
- yt-dlp and FFmpeg (installed in the Docker images automatically)

### Development

```bash
# Frontend (React + Vite)
cd apps/web
npm install
npm run dev

# Backend (FastAPI)
cd services/api
pip install -r requirements.txt
uvicorn main:app --reload

# Or with Docker Compose (all services)
docker compose up --build
```

### Production

```bash
docker compose -f docker-compose.yml up --build -d
```

## Project structure

```
m2p/
├── apps/
│   └── web/              # React + TS + Vite frontend
├── services/
│   ├── api/              # FastAPI backend
│   └── worker/           # Media processing worker (Phase 5)
├── packages/
│   └── shared-types/     # Zod schemas shared frontend/backend
├── infra/
│   ├── docker/           # Dockerfiles
│   └── nginx/            # Reverse proxy config
├── docs/
│   └── ARCHITECTURE.md   # Architecture assessment
├── M2P Brand/            # Logo assets
├── docker-compose.yml
└── README.md
```

## Phases

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Architecture assessment | ✅ Complete |
| 1 | Foundation (scaffold, landing, PWA, Docker) | 🔄 In progress |
| 2 | Metadata (yt-dlp inspect, source card) | ⬜ Pending |
| 3 | Guest extraction (20s limit, FFmpeg) | ⬜ Pending |
| 4 | Registered users (auth, download, history, quotas) | ⬜ Pending |
| 5 | Production (queue, worker, observability, admin) | ⬜ Pending |
| 6 | Cross-platform (PWA, Tauri, Capacitor) | ⬜ Pending |

## License

M2P is part of the LaGrieta ecosystem. See [BLUEPRINT.md](docs/ARCHITECTURE.md)
for the full technical specification.

Backend reuses components from [MeTube](https://github.com/alexta69/metube)
(AGPL-3.0) under clean service interfaces — see `docs/ARCHITECTURE.md` §C.
