# Meter

AI spend tracker — tells a company what it spends on AI, who's spending it,
and whether that spend is producing real work or slop.

**Status:** early prototype. `backend/` is a runnable FastAPI + SQLite
reference implementation of the tracking pipeline; `frontend/` is the
dashboard UI. Product name is a placeholder.

## What's here

```
backend/    FastAPI service: usage/outcome/quality-signal ingestion,
            identity resolution, Tier-1/Tier-2 scoring, REST API.
            See backend/README.md for the full architecture writeup.
frontend/   Sidebar dashboard (Overview, People, Teams & Roles, Alerts,
            Integrations), split into index.html + styles.css + app.js +
            fallback-data.js. Calls the backend API at localhost:8000 and
            falls back to embedded demo data if it's not running.
```

## Quickstart

```bash
cd backend
pip install -r requirements.txt
python seed.py                        # fabricates a month of sample activity, scores it
uvicorn app.main:app --reload --port 8000
```

Then open `frontend/index.html` in a browser. The sidebar badge shows
whether it's reading from the live API or the embedded fallback.

Run the backend test suite with `make test` (or `pytest`) from `backend/`.

## Running with Docker

```bash
docker compose up --build
```

- **Frontend:** http://localhost:8080 (served by nginx — not `file://`, so it
  reaches the backend without the browser-security quirks of opening the file
  directly)
- **Backend API:** http://localhost:8000 — `curl http://localhost:8000/api/overview`

First boot seeds a month of sample data automatically (the backend container
runs `seed.py` once, only if its database volume is empty). The seeded data
lives in the `meter-db` named volume, so `docker compose down` and `up` again
picks up right where you left off; `docker compose down -v` wipes it for a
clean re-seed.

Two things to change before this ever points at real data: `METER_CORS_ORIGINS`
on the backend service (wide open by default — see `docker-compose.yml`) and
`METER_DATABASE_URL` if you're swapping SQLite for Postgres. See
[`backend/README.md`](backend/README.md) for the full config surface.

## How it works

Three independent ingestion paths (spend, outcomes, quality signals) resolve
every event to a person through an identity-mapping table, then a nightly
job scores each person's spend against a value-per-dollar signal (Tier 1:
correlated against outcomes like PRs merged or tickets closed) and a slop
risk score (Tier 2: reverts, heavy rewrites, regeneration loops). See
[`backend/README.md`](backend/README.md) for the full data model, API
contract, and what's stubbed vs. implemented.

## Branches

- `main` — stable
- `develop` — active development
