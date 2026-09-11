# Merit AC growth log

Maintained by `merit-growth`. Positioning, outreach, and SEO work — dated
entries, append-only.

## Log

### 2026-09-08

**Shipped since last run (2026-09-04):** A large amount landed without a
matching growth-log entry — catching up rather than re-describing it delta
by delta:
- 22 new guide-shaped articles: 3 to `/guides` (AI evaluation methods, RAG
  failure modes, context engineering — PR #95), 10 to the new
  `/cloud-architecture` section, and 6 to the new `/claude-architecture`
  section (PR #96) — both new sections split out of what used to be
  overloaded onto `/architecture`.
- `/guides` and `/prompts` reorganized out from under `/architecture` into
  their own top-level sections (PR #93), and the whole guides/news/models/
  glossary stack moved to a markdown-driven content system — one `.md` file
  per entry instead of hand-edited JS data arrays (PR #98).
- News: 25 more articles published since the 09-04 log's count of 23 (49
  total now live) — see `merit-eng-log.md`'s 2026-09-08 entry for the
  Judge-pass rejection-rate finding (6/54, resolving the earlier "is this a
  rubber stamp" concern).
- Operator OS shipped as a full standalone product in this repo (PR #99,
  #100) — 35 tools, 8 adapters, 4 plugins, 8 workspaces, 43 commands — plus
  its own spotlight page at `/operator-os`, now linked from the homepage
  and nav. Not tracked against this goal or the design-partner goal; it's a
  separate product per `CLAUDE.md`.
- A full visual redesign (Stripe-system-inspired light theme) shipped and
  was then reverted back to a dark theme the same week (PR #100, #101) —
  net effect on this goal: none, the content itself is unchanged, only the
  chrome around it.
- Mobile nav and `/community` FAQ fixes (PR #90).

**Sitemap was actively wrong for ~2.5 weeks** while most of the above
shipped — see `merit-infra-log.md`'s 2026-09-08 entry. Fixed this run
(generated from the build's own page list now, can't drift again), but
worth naming here too: none of the 22 new guides, the 25 new news articles,
or `/operator-os` were reachable through the sitemap until today, which
directly undercuts this arm's own standing #1 priority ("the site is
invisible to crawlers").

**Competitive movement:** 1Password launched "AI Spend and Consumption
Management" on 2026-07-14 — a dashboard consolidating token consumption
across Anthropic/OpenAI/Cursor. Adjacent, not identical: it reads as
cost/consumption visibility, not Merit AC's value-per-dollar + slop-risk
framing, but it's a trusted, widely-installed brand entering spend-adjacent
territory, worth watching. Separately, the FinOps Foundation now has a
standing "AI Value" topic area — the industry's own standards body moving
from "what did it cost" toward "did it produce value," which validates
Merit AC's positioning but also means the category is getting more
crowded/legitimized by others. Reinforces the standing, still-undecided
"category naming" recommendation — the longer that sits open, the more
likely someone else's term wins the search traffic.

**Deliverable this run — site interactivity proposals** (the founder's
2026-09-05 ask, open since then with nothing shipped or even proposed
against it — see `merit-content-goal.md`'s sub-goal table). Per this
skill's own instruction, proposing rather than building blind. All three
fit the two allowed shapes (CSS-only, or one scoped inline `<script>` —
`ContentLayout.jsx` ships no client JS site-wide):

1. **Challenge day-tracker checklist** (isolated `<script>`, scoped to
   `Challenge.jsx`/`PromptDay.jsx` only). A checkbox per day, state in
   `localStorage`, no server round-trip. Ranked first because it's the one
   proposal that plausibly moves this goal's actual measure — a visitor who
   can see "12 of 30 done" has a reason to come back and finish, and
   finishing is the precondition for ever reaching the paid-track CTA at
   day 30.
2. **`/models` and `/glossary` live filter** (isolated `<script>`, scoped
   to `ModelsDirectory.jsx`/`Glossary.jsx`). A text input that shows/hides
   entries by substring match against name/category, pure DOM, no
   framework. Ranked second: real usability need now that these lists run
   15 and 30 entries and will keep growing, but doesn't touch the
   goal-critical funnel the way #1 does.
3. **Reading-progress bar on guide pages** (CSS-only, `scroll-timeline`/
   `animation-timeline`). A thin top bar tracking scroll position on
   `GuidePage.jsx`. Ranked third — pure delight, no goal contribution,
   cheapest to build and revert if it doesn't land well.

Recommend: build #1 first and only, see if it's used, then decide on #2.
#3 is a "if there's spare time" item, not a priority.

**Recommended next:** Build proposal #1 (needs the founder's go-ahead per
the site-interactivity constraint, not something to slip in quietly), and
finally create the Stripe Payment Link — still open, still the single
blocker on this goal's real measure, unchanged from every prior brief.

**Outreach status:** No waitlist volume available from this session —
`/admin/*` is off-limits to every merit-* skill by design (read-only public
probes only), same limitation as every prior run. The founder is the only
one who can pull `GET /admin/waitlist` counts.

**Goal:** 30-day challenge run with paid conversions · 60 days from
2026-08-22, so 43 days left · content volume is not slipping (22 more guide
articles, 25 more news articles since 09-04), but the goal's actual measure
is still zero — unchanged since the goal was set, entirely blocked on the
Payment Link.

### 2026-09-04 — /news volume, first entry in this file

First entry — real content/growth work has been landing all session
(this file and `merit-content-log.md` are the log this team's own skills
require, and neither was kept current). Catching up here rather than
starting a delta against nothing; see `merit-content-log.md` for the
prompt-side count.

Four autonomous-pipeline-style news runs today, each independently
re-verifying its candidates via direct primary-source fetches before
publishing, none forced through on a thin source:

- Round 1: 6 of 6 candidates published (PR #76).
- Round 2 ("wilder" stories, explicitly hunting past the biggest
  corporate announcements): 3 of 3 published (PR #83).
- Round 3: 6 of 6 published (PR #85).
- Round 4 (widest net yet — more labs, more countries, more industries):
  8 of 8 published (PR #86).

23 published, 0 rejected across all four rounds — flagged in the
2026-09-04 CEO brief as the number that needs the news goal's new
accuracy-paired measure (see `merit-news-goal.md`) to actually mean
something, rather than reading as unscrutinized volume.
