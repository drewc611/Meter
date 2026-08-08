# Meter backend — reference implementation

This is a working implementation of the tracking pipeline described in the
Meter product spec (§6–§8): how AI spend actually gets attributed to a
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

- **Tier 1 (usage × outcome)** — `scoring.raw_value_score` / `normalize_value_scores`.
  Correlates spend against `OUTCOME_VALUE_WEIGHTS` (models.py) — PRs merged count
  positive, PRs reverted count sharply negative. Normalized to the company median
  so the dashboard shows "1.4x" rather than a raw, uninterpretable ratio.
- **Tier 2 (quality proxies)** — `scoring.raw_slop_risk`. Built from
  `QUALITY_SIGNAL_WEIGHTS` (models.py): reverted code, heavily-rewritten drafts,
  regeneration loops, reopened tickets. `ingest.ingest_outcome_event` also shows
  the auto-derivation path — a reverted PR is both a negative Tier-1 outcome
  *and* a Tier-2 quality signal from the same webhook payload.
- **Tier 3 (sampled grading)** — `models.RubricGrade` + `scoring.calibrate_weights`
  (stubbed — see the docstring for what it would do once there's enough grading
  volume to calibrate against). Not run automatically; a human or an LLM grader
  writes to this table directly.

## Quickstart

```bash
pip install -r requirements.txt
python seed.py                              # fabricates a month of activity for 20 people, scores it
uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/api/overview | python3 -m json.tool
```

Then open `../frontend/index.html` in a browser — it tries `http://localhost:8000`
first and falls back to an embedded snapshot if the API isn't reachable, so it
works either way. The sidebar badge tells you which mode it's in.

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

All ingestion endpoints return **422** if the external id has no
`IdentityMapping` yet — that's deliberate (§5.5 of the spec: an unmapped id is
a shadow-AI candidate, not a silently dropped event).

## Files

- `app/models.py` — the data model (§7 of the spec), plus the two weight
  tables (`OUTCOME_VALUE_WEIGHTS`, `QUALITY_SIGNAL_WEIGHTS`) a real deployment
  would tune per company.
- `app/ingest.py` — identity resolution + the three ingestion functions.
- `app/scoring.py` — Tier 1/2 formulas and the nightly job. Deliberately
  simple rather than clever — this is the part a buyer's data team will read.
- `app/api.py` — read-side aggregation, segmentation (fund/coach/learn/monitor),
  and the recoverable-spend estimate. The recovery percentages are labeled
  heuristics in the code — a real deployment calibrates them against actual
  re-tier outcomes over a few quarters.
- `app/main.py` — FastAPI wiring.
- `seed.py` — fabricates realistic sample data across four behavioral profiles
  (star / risky / steady / quiet) so the demo shows a real spread rather than
  one canned number.
- `proxy_example.py` — reference-only: how spend attribution actually happens
  in production, via a thin proxy in front of the Anthropic/OpenAI API. Not
  wired into the running demo.

## What's stubbed, on purpose

- **Tier 3 calibration** (`scoring.calibrate_weights`) — needs real
  `RubricGrade` volume to be worth building; not faked here.
- **Shadow-AI detection** (§5.5 of the spec) — the recoverable-spend estimate
  includes a placeholder line for it, clearly labeled as an estimate, but the
  actual detection (reconciling sanctioned spend against observed AI activity)
  isn't implemented.
- **The scheduler** — `/admin/recompute-scores` is the job's entry point; wiring
  it to cron/Airflow/a queue is a deployment decision, not a code one.
