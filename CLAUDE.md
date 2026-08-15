# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Merit is an AI spend tracker: it tells a company what it spends on AI, who's
spending it, and whether that spend is producing real work or slop. Early
prototype status. Two parts:

- `backend/` — a runnable FastAPI + SQLite reference implementation of the
  tracking/scoring pipeline. This is where almost all the logic lives.
- `frontend/` — a Vite + React dashboard that reads from the backend API,
  with an embedded fallback dataset so it renders even when the API isn't
  running.

Branches: `main` (stable), `Develop` (active development).

## Commands

### Backend (run from `backend/`)

```bash
make install   # pip install -r requirements.txt -r requirements-dev.txt
make seed      # python seed.py — fabricates 6 months of sample data, scores it
make github-sync  # python github_sync.py — pulls merged PRs/CI status from MERIT_GITHUB_OWNER/REPO
make run       # uvicorn app.main:app --reload --port 8000
make test      # pytest
make lint      # ruff check .
make fmt       # ruff check --select I --fix . && ruff format .
make clean     # remove merit.db and caches
```

Run a single test file or test: `pytest tests/test_scoring.py`,
`pytest tests/test_scoring.py::test_name -v`.

Tests never touch `merit.db` — `tests/conftest.py` points `MERIT_DATABASE_URL`
at a throwaway temp SQLite file *before* any `app` module is imported (the
engine binds to the URL at import time), and rebuilds the schema fresh for
every test via an autouse fixture.

Ruff config (line length 120, `E F I UP B`, `E501` ignored — formatter's job)
and pytest config live in `backend/pyproject.toml`, not separate ini files.

### Frontend (run from `frontend/`)

Vite + React app (plain `.jsx`, no TypeScript) under `src/` — see
`frontend/README.md` for the full layout. No state library beyond React
context; SVG charts are plain JSX, not string-built.

```bash
npm install
npm run dev       # Vite dev server, http://localhost:5173
npm run build     # production build -> dist/
npm run preview   # serve the dist/ build locally
```

It tries `http://localhost:8000` first and falls back to
`src/lib/fallbackData.js`'s embedded snapshot if the API is unreachable
(900ms timeout) — the sidebar badge shows which mode it's in. The built
`dist/` output is what's deployed at the production site root (see
DEPLOY.md — Cloudflare's Build command runs `npm run build`).
`frontend/coming-soon.html` is the old pre-launch placeholder, still
reachable but no longer served at `/` — see `frontend/README.md`.

`styles.css` is shared, unchanged, referenced via a plain `<link>` tag in
both HTML entries — Vite processes `<link rel="stylesheet">` tags in any
HTML entry natively, so it doesn't need to be imported via JS or turned into
CSS modules.

CI lints frontend JS with ESLint (`.eslintrc.js`, `eslint:recommended`) via
`.github/workflows/eslint.yml`; there's no local lint script, run
`npx eslint . --config .eslintrc.js --ext .js,.jsx,.ts,.tsx` from the repo
root if needed.

### Docker (whole stack, from repo root)

```bash
docker compose up --build     # first run auto-seeds 6 months of sample data
docker compose down           # stop, keep the seeded data volume (merit-db)
docker compose down -v        # stop and wipe seeded data
```

Frontend on :8080 (nginx — needed to reach the backend without file://
CORS quirks), backend API on :8000. Before pointing this at real data, change
`MERIT_CORS_ORIGINS` (wide open by default) and `MERIT_DATABASE_URL` (SQLite
by default) on the backend service.

### CI (`.github/workflows/ci.yml`)

On push to `main`/`Develop` and on PRs: `ruff check .`, `ruff format --check .`,
`pytest`, all run from `backend/` on Python 3.11.

Separately, `.github/workflows/` runs several other things — scheduled jobs
against the live Fly deployment (nightly score recompute, GitHub PR/CI sync,
dependency audit, backup-snapshot verification, stale-PR cleanup) plus
per-PR checks (Docker build validation, secret scanning, path-based
labeling) and a post-merge dashboard-screenshot refresh — see
[DEPLOY.md](DEPLOY.md#repository-automation-github-actions) for the full
list and the `FLY_API_TOKEN` secret two of them need.

## Architecture

Three independent ingestion paths write into three separate tables, all
attributed to a person through an identity-mapping table, and a nightly job
compresses everything into one scored row per person that the API/UI reads:

```
  LLM proxy / billing ──┐
  (proxy_example.py)    ├─► /ingest/usage ─────────► UsageEvent ──┐
                         │                                        │
  GitHub/Jira/HubSpot ───┼─► /ingest/outcome ───────► OutcomeEvent┼─► scoring.recompute_all()
  webhooks               │                                        │        (nightly)
                         └─► /ingest/quality-signal ─► QualitySignal┘        │
                                                                             ▼
  Okta/Entra SCIM ──────────► IdentityMapping                         PersonScore
                                     │                                       │
                                     ▼                                       ▼
                                 Identity  ◄──────────────────────  /api/overview
                                                                      /api/people
                                                                      /api/teams
                                                                      /api/roles
```

Key invariant: **the dashboard and `/api/*` endpoints only ever read
`PersonScore`, never raw events** — page loads stay fast regardless of how
much event history accumulates. `PersonScore` is materialized by the nightly
job, one row per `(identity, period)`. The one deliberate, documented
exception: `analytics.get_tool_breakdown()` and `analytics.get_adoption()`
query `UsageEvent` directly, because tool/model and active-user counts aren't
attributes `PersonScore` carries — but both stay scoped to a single
`[start, end)` period (the same bounded pattern `scoring.py`'s own nightly
aggregates already use), not an unbounded scan, so the invariant's actual
purpose (cost independent of history size) still holds.

`IdentityMapping` is the load-bearing table: every external system id (an
LLM-proxy API key, a GitHub login, a Zendesk agent id) resolves to exactly
one canonical `Identity`, scoped to the caller's `Organization`. If this
mapping is wrong, every number downstream is wrong. All ingestion endpoints
return **422** if the external id has no mapping yet — deliberate, since an
unmapped id is a shadow-AI candidate, not something to silently drop (see
product spec §5.5).

Every `Team`/`Identity`/`DashboardUser`/`PersonScore` row belongs to exactly
one `Organization` — the tenant boundary that keeps a company deployment's
data (or one individual's free-personal-use data) fully isolated from every
other's, including the per-org `ingest_token` `/ingest/*` authenticates
with. See [`backend/README.md`](backend/README.md#signup-and-organization-creation)
for how a signup lands in a new vs. shared org, and the auth section above
it for the token/session model.

### The three tiers, and where each lives

Tier 1 (usage × outcome) and Tier 2 (quality proxies) are both computed in
`services/scoring.py`, weighted by `OUTCOME_VALUE_WEIGHTS`/
`QUALITY_SIGNAL_WEIGHTS` in `constants.py`. Tier 3 (sampled grading) is
stubbed on purpose — see "What's stubbed" below. Full writeup, including
which functions do what: [`backend/README.md`](backend/README.md#why-three-tiers-and-where-each-lives-in-the-code).

### Backend module map (`backend/app/`)

```
main.py            FastAPI app factory (create_app) — mounts routers, CORS from config
config.py          infra settings (database URL, CORS origins) read from env
constants.py       tunable business constants: weight tables + segment/recovery knobs
time_utils.py      single naive-UTC clock (utcnow), used everywhere instead of datetime.utcnow()
database.py        engine, session factory, declarative Base, init_db()
dependencies.py    FastAPI request-scoped session (get_db); require_api_key (/ingest/* service token);
                   get_current_user (/api/* + /admin/* login, see services/auth.py); require_admin
                   (/admin/* additionally needs is_admin)
models.py          data model (§7 of the product spec) + DashboardUser (login, separate from Identity)
schemas.py         Pydantic request/response contract
periods.py         calendar-month [start, end) math + recent_periods() for trend windows, shared by API and seed.py
services/
  ingest.py        identity resolution + the three ingestion functions
  scoring.py       Tier 1/2 formulas (pure math) + the nightly job (bulk queries)
  analytics.py     read-side aggregation, segmentation, recoverable-spend estimate, trends/tool/adoption metrics
  forecasting.py   ML spend forecast (cross-validated ridge regression) behind /api/spend-forecast
  github_ingest.py whole-repo GitHub PR/CI sync, called by github_sync.py (repo root)
  auth.py          password hashing (bcrypt), JWT issue/verify (pyjwt), Google OAuth flow
  email.py         plain-SMTP outbound mail (/admin/notify-waitlist)
routers/
  ingestion.py     /ingest/*      admin.py    /admin/*
  dashboard.py     /api/*         auth.py     /auth/*
  waitlist.py      /waitlist      health.py   /healthz
```

`constants.py` is the single place a customer-facing "where does this number
come from" answer lives — don't scatter tunable weights/thresholds elsewhere.
`services/scoring.py` is deliberately kept as pure functions over bulk
queries (three aggregate queries for the whole population, not N+1) so the
nightly job stays flat as event tables grow — this is the code a buyer's
data team is most likely to actually read, keep it simple.

### Endpoints

`/ingest/*` (usage/outcome/quality-signal), `/admin/*` (identity-mapping,
recompute-scores, notify-waitlist — `is_admin` required), `/api/*`
(overview/people/teams/roles/trends/tool-breakdown/tool-performance/
spend-forecast/adoption), `/auth/*` (signup/login/Google OAuth/me), and
`/waitlist`. Full table with request/response shapes:
[`backend/README.md`](backend/README.md#endpoints).

### What's stubbed, on purpose

Tier 3 calibration, shadow-AI detection, and the nightly-job scheduler are
all intentionally unbuilt — see
[`backend/README.md`](backend/README.md#whats-stubbed-on-purpose) for what
each one is and why. Don't try to "complete" these without checking with
the user first.
