# SkyTrack — Real-Time Aircraft Tracking Platform

A portfolio project: a fullstack, real-time geospatial application. Live aircraft positions are ingested (simulator or OpenSky API), stored in PostGIS, broadcast over WebSockets, and rendered on a MapLibre map with a React/TypeScript UI.

**Guiding principles (read carefully):**
- KISS. This is a portfolio project, not a product. Prefer the simplest working solution. No auth, no user accounts, no microservices, no Celery, no Kubernetes.
- **Work on ONE phase at a time. After completing a phase, STOP.** Do not start the next phase until the user explicitly says so (e.g. "start Phase 2"). After finishing a phase, summarize what was built and how to verify the acceptance criteria, then wait for the user's approval.
- Every phase must end with a **fully working system** (`docker compose up` → everything runs).
- Clean, readable, idiomatic code with a clear folder structure. Meaningful commit messages.
- UI language: English only, but wired through i18next so adding languages later is trivial.

---

## Tech Stack (fixed — do not substitute)

| Layer | Technology |
|---|---|
| Backend | Python 3.12, Django 5, Django REST Framework, GeoDjango |
| Realtime | Django Channels + Redis (channel layer) |
| Database | PostgreSQL 16 + PostGIS (image: `postgis/postgis:16-3.4`) |
| Frontend | React 18, TypeScript, Vite |
| Map | MapLibre GL JS |
| Styling | Tailwind CSS (dark mode via `class` strategy) |
| i18n | react-i18next (en.json only for now) |
| State | Zustand |
| Testing | pytest + pytest-django (backend), Vitest (frontend) |
| Infra | Docker Compose (backend, frontend, postgis, redis), hot-reload in dev |
| CI | GitHub Actions (lint + tests) |

---

## Data Model

**Aircraft**
- `callsign` (str, unique, e.g. "FJ4664")
- `aircraft_type` (choices: MILITARY, COMMERCIAL, DRONE, UNKNOWN)
- `classification` (choices: FRIENDLY, HOSTILE, NEUTRAL, UNKNOWN)
- `position` (PointField, SRID 4326)
- `altitude` (float, meters), `heading` (float, degrees), `speed` (float, m/s)
- `source` (choices: SIMULATOR, OPENSKY)
- `updated_at` (auto)

**PositionLog** (history, lightweight)
- FK → Aircraft, `position` (PointField), `altitude`, `timestamp`
- Keep only the last N (e.g. 50) entries per aircraft; prune on write.

---

## API Contract

REST (DRF, `/api/`):
- `GET /api/aircraft/` — list, filterable by `aircraft_type`, `classification` (query params)
- `GET /api/aircraft/{callsign}/` — detail
- `GET /api/aircraft/{callsign}/track/` — recent PositionLog entries (for trail rendering)
- `GET /api/aircraft/nearby/?lat=..&lon=..&radius_km=..` — **PostGIS showcase**: aircraft within radius, ordered by distance, distance included in response (use `ST_DWithin` / GeoDjango `distance_lte` + `Distance` annotation)

WebSocket (Channels, `/ws/aircraft/`):
- Server pushes batched position updates every ~1s:
  `{"type": "positions", "aircraft": [{callsign, lat, lon, altitude, heading, speed, aircraft_type, classification}, ...]}`

---

## Data Ingestion

Two sources, selected by env var `DATA_SOURCE=simulator|opensky` (default: `simulator`):

1. **Simulator** (Phase 1): a Django management command (`python manage.py run_ingest`) running a loop: generates ~60–100 aircraft around the Marmara region (roughly lat 40.0–41.8, lon 27.5–30.0), moves them each tick according to heading/speed with small random course changes, writes to DB, broadcasts via channel layer. Runs as its own service in docker-compose (same image as backend, different command).
2. **OpenSky** (Phase 2): same loop shape, but fetches real states from OpenSky REST API (bounding box over Turkey), normalizes → upserts → broadcasts. On any failure (rate limit, network), log a warning and **fall back to simulator mode automatically**. Type/classification for OpenSky aircraft: derive something simple (e.g. all COMMERCIAL/NEUTRAL) — do not over-engineer.

This ingest loop is the project's "ETL" story: Extract (API/simulator) → Transform (normalize units, validate) → Load (PostGIS upsert).

---

## Phase 1 — Working Skeleton (end-to-end, ugly but alive)

Goal: `docker compose up` → open `http://localhost:5173` → see aircraft moving live on a MapLibre map.

Tasks:
1. Repo scaffolding: `backend/` (Django project + `tracking` app), `frontend/` (Vite React TS), `docker-compose.yml`, `.env.example`, root `README.md` stub.
2. Docker Compose with 4 services + ingest service; volumes for hot-reload (backend: runserver autoreload; frontend: vite dev server). PostGIS healthcheck; backend waits for DB.
3. GeoDjango setup (GDAL libs in backend Dockerfile), Aircraft + PositionLog models, migrations.
4. Simulator ingest command (as described above) broadcasting via Redis channel layer.
5. Channels consumer at `/ws/aircraft/` relaying broadcasts to clients. ASGI setup with Daphne or Uvicorn.
6. DRF: aircraft list + detail endpoints (basic).
7. Frontend: Vite + Tailwind + MapLibre full-screen map (free style, e.g. demotiles or Carto basemap), WebSocket client (native WS + Zustand store), aircraft rendered as a GeoJSON source updated on each message, rotated by heading, colored by classification (green/red/blue/gray).
8. A tiny status bar: WebSocket connection state + aircraft count.

Acceptance criteria:
- Fresh clone + `docker compose up` works with no manual steps (migrations auto-run or documented one-liner).
- Aircraft visibly move smoothly on the map; refresh reconnects cleanly.
- Code committed with sensible structure.

## Phase 2 — Features

Goal: the product's core functionality.

Tasks:
1. Side panel: live aircraft table (callsign, type, classification, lat/lon), synced with the same Zustand store.
2. Filters: by type and classification (client-side on the live store + matching query params on REST list).
3. Click an aircraft (map or table): highlight it, show detail card, fetch and draw its recent trail (`/track/` endpoint) as a line on the map.
4. **Radius search**: a "nearby" mode — user clicks a point on the map, chooses radius (e.g. slider 10–200 km), backend returns aircraft within radius via PostGIS query; visualize the circle + returned aircraft highlighted, others dimmed.
5. OpenSky ingestion mode with automatic simulator fallback (as described in Data Ingestion).
6. Basic error/empty states in UI.

Acceptance criteria:
- Filters, selection, trail, and radius search all work without page reloads.
- `DATA_SOURCE=opensky` works when the API is reachable and falls back gracefully when it is not.

## Phase 3 — Polish & Delivery

Goal: make it look professional and reviewable.

Tasks:
1. Dark/light theme toggle (Tailwind `class` strategy; map style also switches between a dark and light basemap). Default: dark.
2. i18n: wrap all UI strings with react-i18next, single `en.json`.
3. Visual polish: consistent spacing/typography, subtle transitions, decent empty/loading states. Aim for a sleek "command center" look similar to a dark ops dashboard, but tasteful.
4. Tests (small but meaningful):
   - pytest: nearby endpoint returns correct aircraft for a known fixture (inside vs outside radius); simulator tick updates positions; list filter works.
   - Vitest: Zustand store updates on a mocked WS message; a small component test.
5. GitHub Actions: one workflow — ruff + pytest (backend), eslint + vitest (frontend).
6. README: project description, architecture diagram (ASCII or mermaid), screenshots + a GIF placeholder section, quickstart (`docker compose up`), env vars table, API summary.

Acceptance criteria:
- CI green on main.
- README good enough that a stranger can run and understand the project in 5 minutes.

---

## Out of Scope (do not build)
Auth/login, user management, admin dashboards beyond Django admin defaults, mobile app, Celery, message queues beyond Redis channel layer, SSR, deployment configs (may be added later), multiple map providers, historical playback UI.
