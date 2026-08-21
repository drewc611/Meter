# Merit backend — reference implementation

This is a working implementation of the tracking pipeline described in the
Merit product spec (§6–§8): how AI spend actually gets attributed to a
person, how "value produced" and "slop risk" get computed, and what the
dashboard reads. It's built to be run, not just read — see **Quickstart**.

## Architecture in one paragraph

Every `Team`, `Identity`, `DashboardUser`, and `PersonScore` row belongs to
exactly one `Organization` — the tenant boundary. A company deployment has one
`Organization` shared by everyone who signs up with the right
`MERIT_SIGNUP_CODE`; an individual signing up on a public deployment (no code
set) gets a brand-new one of their own, fully isolated from every other
tenant's data. Within an org, three independent ingestion paths write into
three separate tables — spend (`UsageEvent`, from an LLM proxy or provider
billing), outcomes (`OutcomeEvent`, from GitHub/Jira/HubSpot webhooks — PRs
merged, tickets closed, deals moved), and quality proxies (`QualitySignal` —
reverts, heavy rewrites, regeneration loops). Every event is attributed to a
canonical `Identity` through `IdentityMapping`, which resolves an external id
(an API key, a GitHub login) — scoped to the calling org — to a real person;
this is populated from SSO/SCIM and is the one table that, if wrong, makes
every number downstream wrong. A nightly job (`scoring.recompute_all`) reads
all three tables for one org's period and writes one `PersonScore` row per
person: spend, a value-per-dollar multiplier normalized to that org's own
median, and a 0–100 slop risk score. The dashboard and the `/api/*` endpoints
only ever read `PersonScore` — never raw events — so page loads stay fast
regardless of how much history is underneath, and every query is scoped to
the caller's own `org_id`.

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

Then, in `../frontend`: `npm install && npm run dev` (see
[`frontend/README.md`](../frontend/README.md)). It tries
`http://localhost:8000` first and falls back to an embedded snapshot if the
API isn't reachable, so it works either way — the sidebar badge tells you
which mode it's in. In production it's deployed at `/app`, not the site
root (that's a separate marketing/content landing page) — see
`../DEPLOY.md`.

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
| POST | `/admin/identity-mapping` | Wire a new external id to an existing person (scoped to the caller's org) |
| POST | `/admin/recompute-scores` | Trigger the nightly scoring job for the caller's own org on demand |
| GET | `/admin/org` | The caller's own `Organization`, including its `ingest_token` — how a self-signed-up individual discovers the credential for `personal.py` or a proxy |
| POST | `/admin/notify-waitlist?dry_run=false` | One-off "the site is live" email to every unnotified waitlist signup — see [Outbound email](#outbound-email) below |
| GET | `/api/overview` | Everything the Overview page needs, one call |
| GET | `/api/people` | Full person list with segment + recommendation |
| GET | `/api/teams` / `/api/roles` | Spend/value/slop rolled up above the individual |
| GET | `/api/trends?months=6` | Spend/value/slop across the trailing N months (default 6, max 24) |
| GET | `/api/tool-breakdown` | Current-period spend by (tool, model) |
| GET | `/api/tool-performance` | Current-period value/$ and slop risk per tool (spend-weighted rollup, not causal attribution) |
| GET | `/api/spend-forecast?months=6` | Next period's spend, projected via `services.forecasting` (a cross-validated ridge regression, with a confidence range) once there are 4+ non-zero periods, falling back to a plain linear trend at 3; `available:false` below that |
| GET | `/api/adoption` | Active vs. provisioned seats, current period, overall and by tier |
| POST | `/auth/signup` | Create a dashboard account (email + password) |
| POST | `/auth/login` | Password login, returns a JWT |
| GET | `/auth/google/login` | Redirects to Google's consent screen ("Sign in with Google") |
| GET | `/auth/google/callback` | Google's redirect target — exchanges the code, redirects to the frontend with a token |
| GET | `/auth/me` | The logged-in user, given a valid token |
| POST | `/waitlist` | Pre-launch signup from the coming-soon page. Ungated, same as `/auth/*` — an anonymous visitor has no token yet by definition |

All ingestion endpoints return **422** if the external id has no
`IdentityMapping` yet — that's deliberate (§5.5 of the spec: an unmapped id is
a shadow-AI candidate, not a silently dropped event).

Two independent auth layers, covering two different kinds of caller:

- **`/ingest/*`** sits behind `dependencies.require_api_key`, which resolves
  *which Organization* a request writes into — a service token for machines
  (a proxy, a webhook, `personal.py`), not a human login. Each org has its
  own `ingest_token` (see `GET /admin/org`), replacing the single global
  secret every caller used to share. A bearer token that matches an org's
  `ingest_token` resolves to it; no token at all still works, but only while
  it's unambiguous — `MERIT_API_KEY` unset and at most one `Organization` in
  the whole database. The moment a second org exists, an unauthenticated
  write becomes ambiguous and gets a **401** with no operator action
  required — that's what actually makes multi-tenancy safe by default.
- **`/api/*` and `/admin/*`** sit behind `dependencies.get_current_user` — a
  real per-user login (password or Google, via `/auth/*` above), backed by
  a signed JWT. A no-op until `MERIT_JWT_SECRET` is set, at which point
  every request needs a valid `Authorization: Bearer <token>` from
  `/auth/login`, `/auth/signup`, or the Google callback, or it gets a
  **401**. `/admin/*` additionally requires `is_admin` on that user
  (`dependencies.require_admin`) — a **403** for a logged-in non-admin.
  Every `/api/*`/`/admin/*` handler scopes its query to `user.org_id`
  (`dependencies.resolve_org_id`, with the same "unambiguous below two
  orgs" fallback as above when login is off).

Both default to unset/open, so local dev, `docker compose`, and the test
suite stay exactly as open as before; see [`DEPLOY.md`](../DEPLOY.md#turning-on-dashboard-login)
for turning them on in production. `/healthz` and `/waitlist` are always
open — Fly's health check and an anonymous visitor signing up both have no
token by definition.

### Signup and Organization creation

`POST /auth/signup` (and the Google-callback new-account path) decide which
`Organization` a signup lands in based on `MERIT_SIGNUP_CODE`:

- **Unset** — the public, free-personal-use posture. Every signup gets a
  brand-new isolated `Organization` and is its sole admin, plus a default
  `Team`("Personal") and `Identity` mapped under `source_system="manual",
  external_id=<their email>` — so `POST /ingest/usage` works immediately,
  no separate `/admin/identity-mapping` step.
- **Set** — a company deployment gated to one shared org. Signups with the
  matching code join that one org; the first signup is its admin, and
  `MERIT_ADMIN_EMAILS` (comma-separated) grants it to specific emails after
  that — the same bootstrap this had before multi-tenancy, just scoped to
  the org's own user count instead of the whole deployment.

## Login

`/auth/signup` and `/auth/login` are plain email + bcrypt-hashed password.
`/auth/google/login` redirects to Google's OAuth consent screen; the
callback verifies the returned ID token against Google's public keys
(not just decodes it), finds-or-creates a `DashboardUser` by Google's
stable per-account id, and redirects back to the frontend with a Merit
session token attached. A user can have a password, a linked Google
account, or both on the same row — `services/auth.py` links by email on
first Google login if a password account with that email already exists.

Sessions are stateless signed JWTs (`pyjwt`, `MERIT_JWT_SECRET`), 14-day
expiry, no server-side session table — rotating the secret invalidates
every issued session at once if that's ever needed.

Env vars:

```bash
MERIT_JWT_SECRET=...              # required to turn login on at all -- openssl rand -hex 32
GOOGLE_CLIENT_ID=...               # optional -- omit and "Sign in with Google" just won't work
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api.usemeritai.com/auth/google/callback
MERIT_FRONTEND_URL=https://usemeritai.com   # /auth/google/callback appends /app?token=... to this
MERIT_SIGNUP_CODE=...              # optional -- gates *new* account creation (password or Google) so
                                    # not anyone who finds the URL can sign up and see your spend data
MERIT_ADMIN_EMAILS=...              # optional, comma-separated -- these emails get is_admin (required
                                    # for /admin/*) on signup. The first-ever DashboardUser on a
                                    # deployment always gets is_admin regardless of this var, so a
                                    # fresh deploy isn't locked out of its own admin actions.
```

See [`DEPLOY.md`](../DEPLOY.md) for how to create a Google OAuth client.

## Outbound email

`/admin/notify-waitlist` sends one fixed announcement email to every
`WaitlistSignup` row that hasn't been emailed yet (`notified_at IS NULL`) —
it's a one-off "the site is live" send, not a campaign tool, and re-running
it only reaches signups that joined since the last run. It talks plain SMTP
(`services/email.py`) rather than a specific vendor's API, so any provider
works — Postmark, SES, a Workspace account, whatever's already on hand:

```bash
MERIT_SMTP_HOST=smtp.postmarkapp.com
MERIT_SMTP_PORT=587          # optional, defaults to 587 (STARTTLS)
MERIT_SMTP_USER=...          # optional if your provider allows unauthenticated relay
MERIT_SMTP_PASSWORD=...
MERIT_FROM_EMAIL=noreply@usemeritai.com
```

Unset `MERIT_SMTP_HOST`/`MERIT_FROM_EMAIL` means the endpoint returns a
**503** rather than silently pretending the send happened. Preview the
pending count without configuring email or sending anything real via
`POST /admin/notify-waitlist?dry_run=true`.

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
    forecasting.py   ML spend forecast (cross-validated ridge regression), see /api/spend-forecast above
    github_ingest.py whole-repo GitHub PR/CI sync, called by github_sync.py below
  routers/
    ingestion.py     /ingest/*      admin.py  /admin/*
    dashboard.py     /api/*         health.py /healthz
tests/               pytest suite (periods, scoring, ingest, analytics, forecasting, github_ingest, full API)
seed.py              fabricates a month of sample data (+ 5 lighter-weight backfill months) across four behavioral profiles
proxy_example.py     reference-only usage-attributing LLM proxy (not wired into the demo)
personal.py          optional: wire your own real usage/GitHub PRs into a local instance -- see its docstring
github_sync.py       whole-repo GitHub PR/CI sync for a company's own deployment -- see its docstring
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
