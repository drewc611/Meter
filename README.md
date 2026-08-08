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
