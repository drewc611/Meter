# Merit AC content log

Maintained by `merit-growth`. Every prompt or guide drafted, its path, and its
status (drafted / judge-passed / shipped). This is the only legitimate source
for the content goal's progress count — never estimate it from memory.

## Log

### 2026-08-21

**Shipped this run:**
- `/architecture` — real content, adapted from the repo's own `ARCHITECTURE.md`. Status: shipped.
- `/setup/python` — real, working proxy pattern adapted from `backend/proxy_example.py`. Status: shipped.
- `/setup/node` — same contract as Python, real API fields. Status: shipped.
- `/setup/react` — honest architectural guidance (ingestion belongs server-side, not in the browser bundle). Status: shipped.
- `/setup/tensorflow-pyro` — honestly labeled as a pattern, not a maintained connector; no dedicated integration exists. Status: shipped.
- `/guides`, `/prompts`, `/challenge` — honest index/landing stubs. No articles, no prompts, no checkout — none exist yet, and none were fabricated to fill the space. Status: shipped (as stubs).

**Not done, still open:**
- All 3+ launch guide articles — 0 drafted.
- All 30 daily prompts (including day 3, the one referenced as an existing template in the original handoff — its actual content was never pasted into any session, so it doesn't exist either). 0 drafted.
- `/challenge` checkout copy — blocked on the fee-mechanism decision.

**Goal:** content goal is still PROPOSED (see `merit-content-goal.md`) — this run shipped site skeleton and real setup docs, not progress against a metric that doesn't exist yet.

### 2026-09-04

**Shipped this run:** 130 new composed prompts added to `/architecture`'s
prompt sections, in three batches:

- 20 prompts, 4 new categories (research, ops, writing, learning) — PR #75.
- 20 more prompts, 4 more categories (sales, data, hiring, legal) — PR #82.
  Section now 48 prompts across 10 categories.
- 90 prompts, a new §10 "Advanced multi-stage prompts" — 15 categories of
  6, each combining 3-5 named patterns in a multi-phase brief rather than
  a single sentence, a genuine step up in complexity from the existing
  48, not just more volume — PR #84.

Every `combines` id across all 138 entries (48 + 90) was checked against
the file's actual defined pattern ids before shipping — zero invalid
references. All three PRs verified via `npm run build` (prerender) and
root ESLint before merge.

**Status:** shipped, live.

**Goal:** still counts against the content/challenge goal per
`merit-content-goal.md` — the Payment Link that goal's real measure
depends on is still the open item, unaffected by prompt volume. See the
2026-09-04 CEO brief in `merit-exec-brief.md`.
