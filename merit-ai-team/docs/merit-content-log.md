# Merit AC content log

Maintained by `merit-growth`. Every prompt or guide drafted, its path, and its
status (drafted / judge-passed / shipped). This is the only legitimate source
for the content goal's progress count — never estimate it from memory.

## Log

### 2026-09-11

**Published this run:** none authored this run — catching up the log for
PR #104 (merged 2026-09-11), a new content type this arm hasn't logged
before:

- `/skills` — a 22-role AI skills library, one entry per role
  (`frontend/src/content/entries/skills/*.md`: backend/frontend/full-stack/
  mobile/ML-AI/cloud-platform/devops-SRE engineer, security engineer,
  QA/test engineer, data engineer, data analyst/BI, product manager,
  product designer/UX, technical program manager, engineering manager,
  CTO, CEO/founder, growth marketing manager, content marketing manager,
  brand marketing lead, customer success/solutions engineer, technical
  writer). Each role ships three real installable artifacts under
  `frontend/public/skills/<role>/` — a Claude Skill, a GitHub Copilot chat
  mode, a ChatGPT Custom GPT config — not prompt text, files built to each
  platform's actual spec. Verified linked from top nav and the homepage,
  and covered by the sitemap automatically (see `merit-growth-log.md`'s
  2026-09-11 entry for the full evaluation).
- `skills-marketplace/` — a companion Claude Code plugin marketplace,
  generated from the same `SKILL.md` files (`node
  scripts/build_marketplace.mjs`, not hand-edited), installable via
  `/plugin marketplace add drewc611/Meter --path skills-marketplace`.
- News: 55 more articles across three batches this session (Sept 2-11),
  bringing the section to 110 live — file count verified directly against
  the claim.

**Drafted, awaiting deploy:** a Show HN-style launch post for `/skills` +
the marketplace, written out in full in `merit-growth-log.md`'s 2026-09-11
entry — not yet posted, needs the founder's go-ahead.

**Stack coverage so far:** unchanged from 2026-09-08 (react/python/node/
tensorflow-pyro all covered) — this run's additions are a new content type
(`/skills`) and more `/news`, not stack-tagged prompts.

**Gap found, not yet fixed:** `SkillsDirectory.jsx` has no copy tying the
library back to Merit AC's actual product and no link to `/app` or
`/methodology` — a real visitor-facing hole in the hub-for-AI story, not
just a missing nice-to-have. Recommended fix (copy-only, no client JS) is
in the growth log; not applied this run since it wasn't this run's call to
make unprompted.

**Goal:** 30-day challenge run with paid conversions · 40 days left · a
genuinely new content type shipped, real measure still zero (Payment Link
still not created — see `merit-growth-log.md` and `merit-exec-brief.md`).

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

### 2026-09-08

**Published this run:** none authored this run — this entry catches up the
log for what shipped 2026-09-05 through 2026-09-07 without a matching
entry:
- Guides: `ai-evaluation-methods`, `rag-failure-modes`,
  `context-engineering` (PR #95).
- `/cloud-architecture` (new section, 10 entries): `choosing-a-cloud-provider`,
  `cloud-cost-optimization`, `cloud-networking-fundamentals`,
  `cloud-providers-compared`, `cloud-security-architecture-zero-trust`,
  `disaster-recovery-and-multi-region-architecture`,
  `event-driven-architecture`, `microservices-vs-monolith`,
  `multi-cloud-and-hybrid-cloud-architecture`,
  `serverless-architecture-patterns` (PR #96).
- `/claude-architecture` (new section, 6 entries):
  `building-agents-with-claude-the-agentic-loop`, `claude-and-mcp`,
  `claude-computer-use-architecture`,
  `claude-tool-use-and-function-calling`, `extended-thinking-architecture`,
  `prompt-caching-architecture` (PR #96).
- News: 25 more articles since the 09-04 count of 23 (49 total live now).

**Drafted, awaiting deploy:** none.

**Stack coverage so far:** unchanged from prompts (react/python/node/
tensorflow-pyro all covered) — this run's additions were guides/news, not
stack-tagged prompts.

**Goal:** 30-day challenge run with paid conversions · 43 days left ·
volume healthy, real measure still zero (Payment Link not created — see
`merit-growth-log.md` and `merit-exec-brief.md`).

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
