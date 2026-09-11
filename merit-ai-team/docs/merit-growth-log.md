# Merit AC growth log

Maintained by `merit-growth`. Positioning, outreach, and SEO work — dated
entries, append-only.

## Log

### 2026-09-11

**Shipped since last run (2026-09-08):** Two PRs, one of them the biggest
unplanned launch this arm has seen:

- **PR #104 — the `/skills` library.** 22 role-specific entries
  (`frontend/src/content/entries/skills/*.md`), engineering through
  leadership/ops, each shipping three real installable artifacts per role
  (Claude Skill, GitHub Copilot chat mode, ChatGPT Custom GPT config) under
  `frontend/public/skills/<role>/`, plus a companion Claude Code plugin
  marketplace at `skills-marketplace/` (`/plugin marketplace add
  drewc611/Meter --path skills-marketplace`). Same PR also landed 55 more
  `/news` articles across three batches (Sept 2-11).
- **PR #105 — security audit, ten fixes.** Mostly outside this arm's remit,
  but two items touch growth directly: `/waitlist` now rate-limited (20
  joins/hour per IP, keyed on `Fly-Client-IP`) — irrelevant at current
  traffic but worth remembering before any real launch-day spike; and a
  real tenant-boundary bug fix (a company-plan signup could land inside an
  individual's personal org if that org happened to be the oldest row) —
  relevant because it's exactly the kind of bug a first design partner's
  signup would have hit.

**`/skills` evaluation (this run's primary job):**

- **Not orphaned.** Verified directly — it's in the top nav
  (`ContentLayout.jsx`: `{ key: "skills", href: "/skills", label: "Skills" }`)
  and on the homepage (`Home.jsx`: "Skills library — A real Claude Skill,
  Copilot chat mode, and ChatGPT GPT for every role"). Sitemap coverage is
  automatic per the 2026-09-08 fix — every prerendered page, `/skills` and
  all 22 `/skills/<role>` pages included, is in `sitemap.xml` by
  construction (`prerender-content.mjs`), so this isn't a repeat of the
  "invisible to crawlers" problem.
- **Fits the hub-for-AI repositioning structurally**, but the page itself
  doesn't say why Merit AC — an AI spend/value tracker — built it.
  `SkillsDirectory.jsx` is a clean, honest reference page (install
  instructions, no fabricated capabilities) but has zero copy connecting it
  to the product and zero link back to `/app` or `/methodology`. A visitor
  who lands here via search has no reason to learn Merit AC also does spend
  tracking. That's a real gap, not a nice-to-have — the whole point of the
  hub strategy is that free utility content earns the visit and the product
  earns the conversion; right now `/skills` only does the first half.
- **Concrete SEO/distribution angle: a developer-community launch post.**
  This is exactly the kind of asset (free, installable, dev-tool-adjacent,
  no signup wall) that a Show HN / dev-Twitter post drives real traffic and
  backlinks for, and the plugin marketplace specifically needs an
  external-facing announcement to get discovered at all — nobody finds a
  GitHub subfolder marketplace by search. Drafted below as this run's
  deliverable.

**Competitive scan (AI spend management / AI ROI / LLM cost attribution /
FinOps-for-AI):** The category is still cost-visibility, not value
attribution — Amnic's own "8 Best FinOps Tools for AI Cost Management"
roundup names Amnic, Vantage, CloudZero, Finout, Pointfive, Cloudgov,
Cloudchipr, and Apptio Cloudability; every one of them tracks token/GPU
spend by team or workload, none does Merit AC's value-per-dollar +
slop-risk + person-level framing. New this scan: Braintrust (an
eval/observability company) is now publishing its own "how to track LLM
costs" playbook content — not a product competitor yet, but a content-SEO
one for the "LLM cost attribution" term specifically, worth knowing if
that's the term the founder eventually picks. FinOps Foundation's "AI
Value" topic area (flagged 09-08) is still there and still the strongest
signal that the industry is drifting toward Merit AC's actual framing.
Category-naming recommendation is now three runs old with nothing decided
— repeating it because the gap between "the industry validates this
framing" and "Merit AC owns the search term for it" is the whole risk.

**Deliverable this run — Show HN-style launch post** for `/skills` + the
plugin marketplace (not yet posted — needs the founder's go-ahead, this is
copy, not a submission):

> **Show HN: 22 real Claude Skills / Copilot chat modes / ChatGPT GPTs, one per job function**
>
> We build an AI spend and value tracker — the pitch is telling a company
> whether its AI spend is producing real work or slop. Building that meant
> writing a lot of role-specific AI tooling internally, so we turned it
> into a public library: 22 roles, backend engineer through CEO, each
> shipped as three actual installable artifacts — a Claude Skill
> (`SKILL.md`), a GitHub Copilot custom chat mode, and a ChatGPT Custom GPT
> config. Not prompt text to retype — files built to each platform's real
> spec.
>
> Free at usemeritai.com/skills. If you use Claude Code there's also a
> plugin marketplace, so you can install any of them directly:
> `/plugin marketplace add drewc611/Meter --path skills-marketplace`
>
> Feedback on any one role's skill — what it gets wrong, what's missing —
> is genuinely useful. These came out of our own team's workflows, not a
> generic prompt-engineering pass, and we'll keep them current the same way
> we keep the rest of the site honest: dated, checkable, nothing claimed
> that isn't true yet.

**Recommended next:** Get sign-off to post the launch draft above (HN plus
wherever else makes sense), and add a short "why we built this" paragraph
plus an `/app` and `/methodology` cross-link to `SkillsDirectory.jsx` —
copy-only, doesn't touch `ContentLayout.jsx`'s no-client-JS contract, so it
doesn't need the site-interactivity sign-off, just the founder's OK on the
words. Category naming still needs a decision. The Stripe Payment Link is
still the single blocker on the content goal's real measure, unchanged
across four straight runs now.

**News arm — verified against PR #104's claim:** 110 articles confirmed
live (`frontend/src/content/entries/news/*.md` count matches the claimed
total exactly). `merit-news-judge-log.md` verdicts across its full history:
109 published, 16 rejected — the Judge pass is still saying no (up from 6
rejected of 54 total as of 09-08), so the rubber-stamp concern stays
resolved, not just assumed clean. Zero articles carry a non-empty
`corrections` field — same standing watch item as 09-08, still can't tell
"nothing's been wrong" from "the correction path has never been exercised."
Not a regression, just still open.

**Outreach status:** No waitlist volume available this session — same
`/admin/*` restriction as every prior run. No named-company list this run;
priority was the `/skills` evaluation per this run's brief.

**Goal:** 30-day challenge run with paid conversions · 40 days left (of 60,
from 2026-08-22) · content volume keeps growing (`/skills` is a genuinely
new content type, not just more of the same), but the goal's real measure
is still zero — unchanged, still entirely blocked on the Payment Link.

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
