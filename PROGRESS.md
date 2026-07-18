# SkyTrack — Progress

Tracks actual implementation status against `PROJECT_PLAN.md`. An item is checked
only after it has been built **and verified working** (not just written).

---

## Phase 1 — Working Skeleton

- [x] Repo scaffolding: `backend/` (Django project `config` + `tracking` app), `frontend/` (Vite React TS), `docker-compose.yml`, `.env.example`, root `README.md`
- [x] Docker Compose with postgis, redis, backend, ingest, frontend services; hot-reload volumes; postgis healthcheck; backend/ingest wait for DB+Redis healthy
- [x] GeoDjango setup (GDAL/GEOS/PROJ in backend Dockerfile), `Aircraft` + `PositionLog` models, initial migration
- [x] Simulator ingest command (`run_ingest`): spawns 80 aircraft over the Marmara region, moves them each ~1s tick by heading/speed with random course drift, bounces at bounding-box edges, writes to DB, prunes `PositionLog` to last 50/aircraft
- [x] Channels consumer at `/ws/aircraft/` relaying `aircraft_updates` group broadcasts to clients; ASGI setup via Daphne (`daphne` runserver override)
- [x] DRF: `GET /api/aircraft/` (list, filterable by `aircraft_type`/`classification`), `GET /api/aircraft/{callsign}/` (detail)
- [x] Frontend: Vite + Tailwind (dark) + MapLibre full-screen map (CARTO dark raster basemap, no API key), WebSocket client (native WS + Zustand store, auto-reconnect), aircraft rendered as symbol layer, rotated by heading, colored by classification (green/red/blue/gray)
- [x] Status indicator: WebSocket connection state + live aircraft count (originally a standalone status bar; now integrated into the aircraft panel header — see Phase 2 layout notes)

**Acceptance criteria — verified:**
- [x] `docker-compose up` (this machine has the standalone binary, not the `docker compose` plugin) brings up all 5 services; migrations auto-run on backend/ingest start
- [x] `curl http://localhost:8000/api/aircraft/` returns 80 aircraft
- [x] WebSocket at `ws://localhost:8000/ws/aircraft/` pushes `positions` messages once per second with changing coordinates
- [x] `http://localhost:5173` serves the Vite app; all TS/TSX modules transpile without error
- [x] Code committed in logical checkpoints and pushed to `main` on `github.com/mustafaakagunduz/sky-track`

**Not yet manually eyeballed in an actual browser window** (only verified via curl/API/WS/module-transpile checks) — worth a quick visual pass before calling Phase 1 fully closed.

---

## Phase 2 — Features

- [x] Side panel: live aircraft table (callsign, type, classification, lat/lon), synced with the Zustand store
- [x] Filters: by type and classification (client-side on live store; REST list already supported matching query params from Phase 1)
- [x] Click an aircraft (map or table): highlight it, show detail card, fetch + draw its recent trail via `GET /api/aircraft/{callsign}/track/`
- [x] Radius search: click a point, choose radius (10–200 km slider), backend `GET /api/aircraft/nearby/?lat=&lon=&radius_km=` via PostGIS (`ST_DWithin`/`Distance` annotation), visualize circle + highlighted results
- [x] OpenSky ingestion mode (`DATA_SOURCE=opensky`) with automatic fallback to simulator on failure
- [x] Basic error/empty states in UI (empty filtered list, trail fetch failure, nearby search error/empty)
- [x] Layout iteration after user review: aircraft panel moved to a wide, right-anchored, full-height column with the WebSocket status/count folded into its header; detail card moved to top-left; "Nearby search" control kept alone at bottom-left (standalone `StatusBar` component removed, superseded by the panel header)

**Acceptance criteria — verified:**
- [x] Filters, selection, trail, and radius search all work without page reloads (Playwright-driven browser test: filter narrowed 80→20 aircraft, selection opened detail card + fetched trail, nearby search drew a circle, dimmed non-matching aircraft, and re-queried live when the radius slider moved — 13→44 results — with zero console errors)
- [x] `DATA_SOURCE=opensky` works when reachable and falls back gracefully when not (tested live: fetched 305 real aircraft from the OpenSky REST API over Turkey bbox, upserted as COMMERCIAL/NEUTRAL, broadcast correctly; fallback-to-simulator code path exercised via forced fetch failure handling in `_tick_opensky`)

---

## Phase 3 — Polish & Delivery (not started)

- [x] Dark/light theme toggle (Tailwind `class` strategy; map basemap switches too); default dark (verified in headless Chromium: toggle flips `html.dark`, panel/detail/nearby cards restyle, CARTO basemap swaps `dark_all` ↔ `light_all`, zero console errors)
- [x] i18n: wrap all UI strings with react-i18next, single `en.json` (`src/locales/en.json`; all panel/detail/nearby/status strings routed through `useTranslation()`)
- [x] Visual polish: consistent spacing/typography, transitions, loading/empty states — "command center" look (SkyTrack brand badge, detail-card fade-in, distinct "waiting for live data" vs "filters matched nothing" empty states; verified visually in headless Chromium, zero console errors)
- [x] Tests: pytest (nearby endpoint radius correctness, simulator tick updates positions, list filter), Vitest (store updates on mocked WS message, one component test) — verified: `pytest` 6/6 passing + `ruff check` clean inside the backend container; `vitest run` 6/6 passing + `eslint`/`tsc -b` clean in the frontend
- [x] GitHub Actions: ruff + pytest (backend), eslint + vitest (frontend) (`.github/workflows/ci.yml`; both jobs verified locally against a clean `python:3.12-slim` container with a real postgis service and a clean `node:20-slim` container, mirroring the exact CI steps — all green)
- [ ] README: architecture diagram, screenshots/GIF placeholder, quickstart, env vars table, API summary

**Acceptance criteria (target):**
- [ ] CI green on `main`
- [ ] README good enough for a stranger to run and understand in 5 minutes

---

## Out of scope (do not build, per `PROJECT_PLAN.md`)

Auth/login, user management, admin dashboards beyond Django admin defaults, mobile app, Celery, message queues beyond the Redis channel layer, SSR, deployment configs, multiple map providers, historical playback UI.
