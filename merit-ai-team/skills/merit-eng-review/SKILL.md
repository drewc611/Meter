---
name: merit-eng-review
description: >
  Reviews Merit AC's code and API design — the public API contract, the frontend
  bundle, scoring-logic correctness, and accumulating tech debt. Use when Andrew
  says "code review", "review the API", "eng review", "what's the tech debt",
  "review this PR", or when the weekly engineering scheduled task fires. Works
  against a connected repo when one is available, and against the public
  artifacts when it isn't.
metadata:
  version: "0.1.0"
---

# Merit AC engineering review

Read `merit-context` and `merit-goal` first. (This version does its own file
collection, bundle inspection, and scoring directly — the
`merit-executor`/`merit-probe`/`merit-analyst` tier-routing skills referenced
in earlier drafts of this file aren't part of this plugin; see the note in
`merit-context`. Every finding and every severity rating gets your own
judgment, not a delegated pass.)

## Establish what you can actually see

Check, in order:

1. The connected repo (`drewc611/Meter` in this environment). Best case —
   review real code directly with Read/Grep.
2. A different GitHub repo Andrew has named, if that's what's in scope this
   run.
3. Neither reachable. Fall back to public artifacts: `/openapi.json`, the
   shipped JS bundle, and rendered app behavior.

State which mode you are in at the top of the review. A bundle-only review
cannot comment on test coverage or server code, and should not pretend to.

## What to review, in priority order

### 1. API contract

Read `/openapi.json` (or `backend/app/routers/*.py` + `schemas.py` directly,
when the repo is available) and judge the design, not just the shape.

- Do the `/ingest/*` endpoints validate `occurred_at` and reject future
  timestamps? A bad clock silently corrupts period aggregation.
- Is `external_id` enforced unique per `source_system`? Without it, a retried
  webhook double-counts spend, and double-counted spend is the one bug that
  destroys trust in the entire product.
- Are `/admin/*` endpoints role-gated? `notify-waitlist` sends mail;
  `recompute-scores` is expensive and probably synchronous.
- Does `/api/people` paginate? `PersonOut` per person across a real enterprise
  tenant is a large payload.
- Are money fields floats or integers? Float dollars accumulate error across
  thousands of usage events. Cents-as-integers or `Decimal` is the fix.
- Is there tenant scoping on every read endpoint, derived from the token
  rather than a query parameter? (Verified already fixed in this repo via the
  `Organization`/`org_id` multi-tenant work — re-check it holds rather than
  re-deriving it from scratch.)

### 2. Scoring correctness

This is Merit AC's product, so bugs here are existential.

- Division by zero when a person has outcomes but zero spend.
- How negative `value_per_dollar` is derived and bounded — the demo shows
  values like `-0.45×`, so the formula admits negatives. Confirm that is
  intentional and explainable to a customer.
- Attribution of tool-level performance. The product itself says the split is
  proportional to spend and is not a causal claim. Check the code matches that
  claim, because the copy is a promise.
- Idempotency of `recompute-scores`. Running it twice must produce the same
  result.
- Timezone handling in period boundaries.

### 3. Frontend

- Bundle size and whether route-level code splitting exists (as of 2026-08-15
  there is a single `main-*.js` chunk, ~235KB).
- Error and empty states when the API is unreachable. The current build
  degrades to a labeled `DEMO DATA · API offline` mode, which is good — confirm
  that stays true.
- Accessibility on the data-dense views: the People table, the scatter plot,
  and the color-coded slop risk. Color alone carrying meaning is the likely
  failure.
- Any secret, key, or internal hostname in the bundle. As of 2026-08-15 the
  bundle contained a `http://localhost:8000` dev fallback — harmless, but check
  nothing worse joined it.

### 4. Content-site surface (added 2026-08-21)

Once `/architecture`, `/setup/*`, `/guides`, `/prompts`, and `/challenge`
exist, review them with the same rigor as the product:

- Are they static/prerendered pages, or riding the same client-rendered SPA
  that already 404s on every non-root path? Building them static from the
  start avoids re-inheriting the SPA-fallback bug rather than fixing it later.
- If `/challenge` ever accepts a submission (email signup, payment) — the same
  injection, auth, and validation questions apply as to `/ingest/*`. A content
  page is not exempt from the review just because it isn't the core product.
- No ingest-token-style unrevocable credential pattern repeated for challenge
  access — if a challenge unlock produces any kind of access token, it needs a
  rotation/revocation path from day one, not bolted on after a partner holds
  one, which is exactly the mistake already logged against the product's
  ingest token.

### 5. Tests and tech debt

Only with repo access. Look for: tests covering the scoring math specifically,
migration strategy, pinned dependency versions, and whether CI runs on PRs.

### 6. Autonomous news pipeline (added 2026-08-22)

The `/news` arm publishes with no human review gate — the Judge-tier pass
and the article's own `corrections` trail are the entire safety mechanism
(see `merit-ai-team/docs/merit-news-goal.md` and `merit-growth`'s SKILL.md).
That makes the correction/retraction mechanism a **build requirement for
this pipeline, not an afterthought bolted on after the first published
error**. Treat any change to the news pipeline's code or automation as
incomplete, not just improvable, if it ships without all of the following
already working:

- Every entry in `frontend/src/content/data/news.js` supports a
  `corrections` array, and `NewsArticle.jsx` renders it visibly on the
  article whenever it's non-empty — not hidden behind a click, not a
  silent diff to the original body text.
- The automation that publishes has a real, exercised path for *appending*
  a correction to an already-published article (a dated entry, a note),
  distinct from and never substituting for editing the original claim in
  place. If that path only exists in a doc and has never actually been
  run end-to-end, say so as a gap, the same way a missing test is a gap.
- The Judge-tier pass genuinely blocks publication on failure — verify
  this by reading `merit-ai-team/docs/merit-news-judge-log.md` for actual
  `rejected` entries, not just checking the code path exists. A judge
  pass that has never once rejected anything is itself worth flagging
  (per `merit-goal`'s scoring note on this), not assumed clean.
- No credential, token, or merge capability the pipeline uses to publish
  autonomously is broader than it needs — same rotation/revocation
  discipline already required of the ingest token and any `/challenge`
  access token.

A pipeline that skips any of these is not "mostly done" — flag it at the
same severity as a scoring-correctness bug, because the entire point of
building the corrections trail first was to not treat it as a nice-to-have
added after something already went out wrong.

## How to report

Findings ranked by severity, most severe first. Each one gets: what is wrong,
the concrete scenario where it produces a wrong number or an outage, and the
fix. Skip findings you cannot make concrete — a review that lists twelve vague
concerns is worse than one that lists three real ones.

Do not fix anything without asking. Propose, then wait.

Append to `merit-ai-team/docs/merit-eng-log.md` (plain file, not a project
tool — see `merit-context`):

```markdown
## 2026-08-15 — <mode: repo | bundle-only>

**Confirmed**
| Finding | Severity | Where |

**Carried over**
| Finding | Age |

**Closed since last run**

**Goal:** <outcome> · <days left> · <on track | slipping | off>
```
