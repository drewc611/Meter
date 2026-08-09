# Merit backend — reference implementation

This is a working implementation of the tracking pipeline described in the
Merit product spec (§6–§8): how AI spend actually gets attributed to a
person, how "value produced" and "slop risk" get computed, and what the
dashboard reads. It's built to be run, not just read — see **Quickstart**.

## Architecture in one paragraph

Three independent ingestion paths write into three separate tables — spend
(`UsageEvent`, from an LLM proxy or provider billing), outcomes (`OutcomeEvent`,
from GitHub/Jira/HubSpot webhooks — PRs merged, tickets closed, deals moved),
and quality proxies (`QualitySignal` — reverts, heavy rewrites, regeneration
loops). Every event is attributed to a canonical `Identity` through
`IdentityMapping`, which resolves an external id (an API key, a GitHub login)
to a real person — this is populated from SSO/SCIM and is the one table that,
if wrong, makes every number downstream wrong. A nightly job
(`scoring.recompute_all`) reads all three tables for a period and writes one
`PersonScore` row per person: spend, a value-per-dollar multiplier normalized
to the company median, and a 0–100 slop risk score. The dashboard and the
`/api/*` endpoints only ever read `PersonScore` — never raw events — so page
loads stay fast regardless of how much history is underneath.

```
  LLM proxy / billing ──┐
  (proxy_example.py)    ├─► /ingest/usage ─────► UsageEvent ──┐
                         │                                     │
  GitHub/Jira/HubSpot ───┼─► /ingest/outcome ───► OutcomeEvent ┼─► scoring.recompute_all()
  webhooks               │                                     │        (nightly)
                         └─► /ingest/quality-signal ─► QualitySignal ┘        │
                                                                              ▼
  Okta/Entra SCIM ──────────► IdentityMapping                          PersonScore
                                     │                                       │
                                     ▼                                       ▼
                                 Identity  ◄───────────────────────  /api/overview
                                                                      /api/people
                                                                      /api/teams
                                                                      /api/roles
```

## Why three tiers, and where each lives in the code

- **Tier 1 (usage × outcome)** — `services/scoring.py` (`raw_value_from_totals`
  / `normalize_value_scores`). Correlates spend against `OUTCOME_VALUE_WEIGHTS`
  (constants.py) — PRs merged count positive, PRs reverted count sharply negative.
  Normalized to the company median so the dashboard shows "1.4x" rather than a
  raw, uninterpretable ratio.
- **Tier 2 (quality proxies)** — `services/scoring.py` (`raw_slop_from_severities`).
  Built from `QUALITY_SIGNAL_WEIGHTS` (constants.py): reverted code, heavily-rewritten
  drafts, regeneration loops, reopened tickets. `services/ingest.ingest_outcome_event`
  also shows the auto-derivation path — a reverted PR is both a negative Tier-1
  outcome *and* a Tier-2 quality signal from the same webhook payload.
- **Tier 3 (sampled grading)** — `models.RubricGrade` + `services/scoring.calibrate_weights`
  (stubbed — see the docstring for what it would do once there's enough grading
  volume to calibrate against). Not run automatically; a human or an LLM grader
  writes to this table directly.

## Quickstart

```bash
pip install -r requirements.txt
python seed.py                              # fabricates 6 months of activity for 20 people, scores it
uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/api/overview | python3 -m json.tool
```

Or use the Makefile: `make install`, `make seed`, `make run`, `make test`, `make lint`, `make fmt`.

Then open `../frontend/dashboard.html` in a browser — it tries `http://localhost:8000`
first and falls back to an embedded snapshot if the API isn't reachable, so it
works either way. The sidebar badge tells you which mode it's in.
(`../frontend/index.html` is a separate "coming soon" placeholder, currently
what's actually deployed to the public production site — see `../DEPLOY.md`.)

Or run the whole stack in Docker instead — see [the root README](../README.md#running-with-docker)
(`docker compose up --build` from the repo root). `Dockerfile` here builds this
service; `entrypoint.sh` seeds an empty `/data` volume on first boot only.

## Tests & tooling

```bash
pip install -r requirements.txt -r requirements-dev.txt
make test     # pytest — pure scoring math, ingestion, analytics, and full API round-trips
make lint     # ruff check
make fmt      # ruff format + import sort
```

Tests point the app at a throwaway SQLite database (a temp path set in
`tests/conftest.py` before any `app` module imports), so `make test` never
touches your `merit.db`. Ruff/pytest config lives in `pyproject.toml`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/ingest/usage` | Record one AI usage event (see `schemas.UsageEventIn`) |
| POST | `/ingest/outcome` | Record a PR merge, ticket close, deal advance, etc. |
| POST | `/ingest/quality-signal` | Record a revert, rewrite, regeneration loop, etc. |
| POST | `/admin/identity-mapping` | Wire a new external id to an existing person |
| POST | `/admin/recompute-scores` | Trigger the nightly scoring job on demand |
| GET | `/api/overview` | Everything the Overview page needs, one call |
| GET | `/api/people` | Full person list with segment + recommendation |
| GET | `/api/teams` / `/api/roles` | Spend/value/slop rolled up above the individual |
| GET | `/api/trends?months=6` | Spend/value/slop across the trailing N months (default 6, max 24) |
| GET | `/api/tool-breakdown` | Current-period spend by (tool, model) |
| GET | `/api/adoption` | Active vs. provisioned seats, current period, overall and by tier |
| POST | `/waitlist` | Pre-launch signup from the coming-soon page. The one endpoint not gated by `MERIT_API_KEY` — see `ARCHITECTURE.md` |

All ingestion endpoints return **422** if the external id has no
`IdentityMapping` yet — that's deliberate (§5.5 of the spec: an unmapped id is
a shadow-AI candidate, not a silently dropped event).

Every endpoint above except `/healthz` sits behind `dependencies.require_api_key`
— a no-op until the `MERIT_API_KEY` environment variable is set, at which
point every request needs `Authorization: Bearer <key>` or gets a **401**.
Unset by default so local dev, `docker compose`, and the test suite stay
exactly as open as before; see [`DEPLOY.md`](../DEPLOY.md)'s go-live
checklist for turning it on in production, and
[`ARCHITECTURE.md`](../ARCHITECTURE.md) for why this is a single shared
secret rather than per-user auth.

## Files

```
app/
  main.py            FastAPI app factory (create_app) — mounts the routers, CORS from config
  config.py          infra settings (database URL, CORS origins) read from the environment
  constants.py       tunable business constants: the two weight tables + segment/recovery knobs
  time_utils.py      single naive-UTC clock (utcnow) shared everywhere
  database.py        engine, session factory, declarative Base, init_db()
  dependencies.py    FastAPI request-scoped session (get_db)
  models.py          the data model (§7 of the spec)
  schemas.py         Pydantic request/response contract
  periods.py         calendar-month [start, end) math + recent_periods() for trend windows, shared by API and seed
  services/
    ingest.py        identity resolution + the three ingestion functions
    scoring.py       Tier 1/2 formulas (pure math) + the nightly job (bulk queries)
    analytics.py     read-side aggregation, segmentation, recoverable-spend estimate, trends/tool/adoption metrics
  routers/
    ingestion.py     /ingest/*      admin.py  /admin/*
    dashboard.py     /api/*         health.py /healthz
tests/               pytest suite (periods, scoring, ingest, analytics, full API)
seed.py              fabricates a month of sample data (+ 5 lighter-weight backfill months) across four behavioral profiles
proxy_example.py     reference-only usage-attributing LLM proxy (not wired into the demo)
```

- `constants.py` holds `OUTCOME_VALUE_WEIGHTS` / `QUALITY_SIGNAL_WEIGHTS` and the
  segment/recommendation thresholds and recovery coefficients — one place to
  tune per company.
- `services/scoring.py` keeps the math in pure functions (trivially unit-tested)
  and does the whole population in three aggregate queries, so the nightly job
  stays flat as the event tables grow. Deliberately simple — this is the part a
  buyer's data team will read.
- `services/analytics.py` recovery percentages are labeled heuristics in the
  code — a real deployment calibrates them against actual re-tier outcomes.
  Almost every function here reads only `PersonScore`; `get_tool_breakdown()`
  and `get_adoption()` are a deliberate, documented exception — tool/model and
  active-user counts aren't attributes `PersonScore` carries, so those two
  query `UsageEvent` directly, but scoped to a single `[start, end)` period
  (the same bounded pattern `scoring.py`'s own nightly aggregates use), not an
  unbounded scan.
- `seed.py` uses the four behavioral profiles (star / risky / steady / quiet) so
  the demo shows a real spread rather than one canned number, plus a lighter
  backfill across the preceding 5 months so `/api/trends` has real history.

## What's stubbed, on purpose

- **Tier 3 calibration** (`scoring.calibrate_weights`) — needs real
  `RubricGrade` volume to be worth building; not faked here.
- **Shadow-AI detection** (§5.5 of the spec) — the recoverable-spend estimate
  includes a placeholder line for it, clearly labeled as an estimate, but the
  actual detection (reconciling sanctioned spend against observed AI activity)
  isn't implemented.
- **The scheduler** — `/admin/recompute-scores` is the job's entry point; wiring
  it to cron/Airflow/a queue is a deployment decision, not a code one.
