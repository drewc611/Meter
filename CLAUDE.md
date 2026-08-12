# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Merit is an AI spend tracker: it tells a company what it spends on AI, who's
spending it, and whether that spend is producing real work or slop. Early
prototype status. Two parts:

- `backend/` — a runnable FastAPI + SQLite reference implementation of the
  tracking/scoring pipeline. This is where almost all the logic lives.
- `frontend/` — a static (no build step) dashboard that reads from the
  backend API, with an embedded fallback dataset so it renders even when the
  API isn't running.

Branches: `main` (stable), `develop` (active development).

## Commands

### Backend (run from `backend/`)

```bash
make install   # pip install -r requirements.txt -r requirements-dev.txt
make seed      # python seed.py — fabricates 6 months of sample data, scores it
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

### Frontend

No build step, no package.json — `frontend/app.js` is a plain non-module
script by design, so `index.html` (the actual app) can be opened directly
over `file://`. Just open `frontend/index.html` in a browser, or serve it
(Docker/nginx does this in the compose stack). It tries `http://localhost:8000`
first and falls back to `fallback-data.js`'s embedded snapshot if the API is
unreachable (900ms timeout) — the sidebar badge shows which mode it's in.
This is what's deployed at the production site root as of the go-live
cutover (see DEPLOY.md). `frontend/coming-soon.html` is the old pre-launch
placeholder — kept around for its waitlist form and ROI calculator, still
reachable at that path, just no longer served at `/`.

CI lints frontend JS with ESLint (`.eslintrc.js`, `eslint:recommended`) via
`.github/workflows/eslint.yml`; there's no local lint script, run
`npx eslint . --config .eslintrc.js --ext .js,.jsx,.ts,.tsx` if needed.

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
one canonical `Identity`. If this mapping is wrong, every number downstream
is wrong. All ingestion endpoints return **422** if the external id has no
mapping yet — deliberate, since an unmapped id is a shadow-AI candidate, not
something to silently drop (see product spec §5.5).

### The three tiers, and where each lives

- **Tier 1 (usage × outcome)** — `services/scoring.py`
  (`raw_value_from_totals` / `normalize_value_scores`). Correlates spend
  against `OUTCOME_VALUE_WEIGHTS` in `constants.py` — `pr_merged` counts
  positive, `pr_reverted` counts sharply negative. Normalized to the
  company median so the dashboard shows "1.4x" instead of a raw ratio.
- **Tier 2 (quality proxies)** — `services/scoring.py`
  (`raw_slop_from_severities`), built from `QUALITY_SIGNAL_WEIGHTS` in
  `constants.py` (reverts, heavy rewrites, regeneration loops, reopened
  tickets). `services/ingest.ingest_outcome_event` shows the auto-derivation
  path: a reverted PR is simultaneously a negative Tier-1 outcome *and* a
  Tier-2 quality signal from the same webhook payload.
- **Tier 3 (sampled grading)** — `models.RubricGrade` +
  `services/scoring.calibrate_weights`. Stubbed on purpose (see "What's
  stubbed" below); not run automatically, a human or LLM grader writes to
  `RubricGrade` directly.

### Backend module map (`backend/app/`)

```
main.py            FastAPI app factory (create_app) — mounts routers, CORS from config
config.py          infra settings (database URL, CORS origins) read from env
constants.py       tunable business constants: weight tables + segment/recovery knobs
time_utils.py      single naive-UTC clock (utcnow), used everywhere instead of datetime.utcnow()
database.py        engine, session factory, declarative Base, init_db()
dependencies.py    FastAPI request-scoped session (get_db); require_api_key (/ingest/* service token);
                   get_current_user (/api/* + /admin/* real per-user login, see services/auth.py)
models.py          data model (§7 of the product spec) + DashboardUser (login, separate from Identity)
schemas.py         Pydantic request/response contract
periods.py         calendar-month [start, end) math + recent_periods() for trend windows, shared by API and seed.py
services/
  ingest.py        identity resolution + the three ingestion functions
  scoring.py       Tier 1/2 formulas (pure math) + the nightly job (bulk queries)
  analytics.py     read-side aggregation, segmentation, recoverable-spend estimate, trends/tool/adoption metrics
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

| Method | Path | Purpose |
|---|---|---|
| POST | `/ingest/usage` | Record one AI usage event (`schemas.UsageEventIn`) |
| POST | `/ingest/outcome` | Record a PR merge, ticket close, deal advance, etc. |
| POST | `/ingest/quality-signal` | Record a revert, rewrite, regeneration loop, etc. |
| POST | `/admin/identity-mapping` | Wire a new external id to an existing person |
| POST | `/admin/recompute-scores` | Trigger the nightly scoring job on demand |
| GET | `/api/overview` | Everything the Overview page needs, one call |
| GET | `/api/people` | Full person list with segment + recommendation |
| GET | `/api/teams` / `/api/roles` | Spend/value/slop rolled up above the individual |
| GET | `/api/trends?months=6` | Spend/value/slop across the trailing N months (default 6, max 24) |
| GET | `/api/tool-breakdown` | Current-period spend by (tool, model) |
| GET | `/api/tool-performance` | Current-period value/$ and slop risk per tool (spend-weighted, not causal) |
| GET | `/api/spend-forecast?months=6` | Linear trend projection of next period's spend |
| GET | `/api/adoption` | Active vs. provisioned seats, current period, overall and by tier |
| POST | `/admin/notify-waitlist?dry_run=false` | One-off "the site is live" email to unnotified waitlist signups |
| POST | `/auth/signup` / `/auth/login` | Real per-user dashboard login — email + bcrypt-hashed password |
| GET | `/auth/google/login` / `/auth/google/callback` | "Sign in with Google" OAuth flow |
| GET | `/auth/me` | The logged-in user, given a valid token |
| POST | `/waitlist` | Pre-launch signup from the coming-soon page — ungated, same as `/auth/*` |

### What's stubbed, on purpose

- **Tier 3 calibration** (`scoring.calibrate_weights`) — needs real
  `RubricGrade` volume to be worth building.
- **Shadow-AI detection** (§5.5 of the spec) — the recoverable-spend estimate
  in `analytics.py` includes a placeholder line for it, clearly labeled as
  an estimate; actual detection (reconciling sanctioned spend against
  observed AI activity) isn't implemented.
- **The scheduler** — `/admin/recompute-scores` is the job's entry point;
  wiring it to cron/Airflow/a queue is left as a deployment decision.

Don't try to "complete" these without checking with the user first — they're
intentionally out of scope for the reference implementation.
