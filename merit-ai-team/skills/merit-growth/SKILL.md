---
name: merit-growth
description: >
  Runs Merit AC's marketing and growth work — positioning, landing page copy, SEO
  and AI-answer-engine visibility, content calendar, and design-partner
  outreach. Use when the founder says "marketing", "growth", "write the landing
  page", "content plan", "SEO", "how do we get design partners", "who are our
  competitors", or when the weekly growth scheduled task fires.
metadata:
  version: "0.1.0"
---

# Merit AC growth

Read `merit-context` and `merit-goal` first. Rank everything against the goal.
(This version routes nothing to `merit-executor`/`merit-probe`/`merit-analyst`
— those skills aren't part of this plugin; see the note in `merit-context`.
Do the fact-collection and drafting work directly instead of dispatching it.)

Merit AC is pre-launch with a waitlist, so unless the goal says otherwise, growth
means one thing: get the first design partners.

## Who Merit AC sells to

The buyer is whoever owns the AI budget line and has to defend it — a CFO, a
VP Engineering, or a Head of Platform at a company past the "we bought
everyone Copilot" stage and now facing a renewal they cannot justify. The
trigger is a renewal date or a board question, not curiosity.

The user is different from the buyer. The user is an engineering manager who
wants to know which of their people are getting real leverage. Copy has to work
for both without turning into surveillance software, which is the objection
that kills this category.

## The objection to answer before all others

"This is a productivity surveillance tool and my engineers will hate it."

Merit AC's existing answer is good and should stay consistent everywhere: scores
are confidence-tiered signals, not measures; the recommendation for a
high-spend, high-slop person is *coach and re-tier*, not fire; and the headline
outcome is recovering budget without cutting a high-value user. Lead with the
budget recovery, let the person-level detail be the proof, never the pitch.

## Standing priorities

### 1. The site is invisible to crawlers

The SPA ships an empty root div and there is no sitemap. Search engines and AI
answer engines see a title and nothing else. Until that changes, no content
strategy can work. The fix is prerendering or static generation for the
marketing surface — the app itself can stay client-rendered. This is the single
highest-leverage growth item and it is an engineering task; route it through
`merit-eng-review` and keep raising it until it ships.

### 2. There is nothing to link to

No pricing page, no docs, no changelog, no methodology page. The methodology
page matters most: Merit AC is asking companies to trust a score. A public page
explaining Tier 1/2/3 confidence, how value per dollar is computed, and what
Merit AC explicitly does *not* claim would do more for credibility than any blog
post. Write that first.

### 3. Category naming

"AI spend and value" is accurate but not a search term. Decide what the founder
wants to be found for — AI cost management, AI ROI measurement, AI FinOps, AI
spend governance — and use it consistently. Bring evidence on search volume and
who already owns each term rather than picking on instinct.

## Weekly run

1. Re-check what has shipped on the marketing surface since last run.
2. Competitive scan — search for AI spend management, AI ROI, LLM cost
   attribution, and FinOps-for-AI tools. Log new entrants, funding, and
   positioning shifts. Note when a competitor takes a term Merit AC wanted.
3. One concrete deliverable. Not a plan — a written thing: a page of copy, a
   post, an outreach sequence, a methodology explainer. One finished artifact
   beats five recommendations.
4. Outreach status: waitlist volume if the founder has shared it, and a short list
   of named companies fitting the profile with a reason each.

## Content arm (added 2026-08-21)

Growth now also owns drafting for `/guides` (general "how to do AI better"
articles) and `/prompts` (one detailed daily prompt per entry, tagged by stack
— react, python, node, tensorflow-pyro). This is a **separate goal from the
design-partner one** — read `merit-ai-team/docs/merit-content-goal.md` and
rank this work against it, not against the 10-partner measure.

Every prompt post follows the shape already established: the prompt itself,
why it's built that way (what it deliberately asks for and why), and what to
do with the answer. Same standing rules as everything else external-facing —
no invented stats, one Judge-tier adversarial pass before anything publishes,
sources verified against primary material.

Whether `/guides` and `/prompts` should funnel into `/setup/*` (product
signups) or serve a separate audience is still undecided as of 2026-08-21.
Don't default either way in copy — flag it as open if it affects a specific
CTA decision.

Also owns `/models` (an AI model/tool directory) and `/glossary` (AI term
definitions), added 2026-08-23 as part of the founder's confirmed repositioning
of the whole site as an AI hub — see `merit-ai-team/docs/merit-content-goal.md`'s
2026-08-23 entry for the full decision. Unlike `/news`, these two are
**one-time-authored-then-periodically-revisited**, not continuously
published — there's no scheduled Routine for them. The discipline that
matters here: every `/models` entry carries a `verifiedDate` and a real
source, and this space moves fast enough (pricing changes, deprecations,
whole products getting discontinued) that a stale, unverified entry is
worse than no entry at all. Spot-check entries periodically rather than
trusting an old `verifiedDate` indefinitely — bump the date on re-verify,
and if a fact can't be confirmed anymore, cut the field or the entry rather
than leave a guess standing. `/glossary` definitions carry a lower sourcing
burden (standard field terminology, not a fast-changing fact) but still get
written carefully — a few entries (rework tax, shadow AI, slop, recoverable
spend, confidence tier) are this site's own product terms and must match
what the product's own code/docs actually mean, not a looser marketing
gloss.

The `/challenge` fee mechanism (Stripe vs. manual) is also undecided. Don't
draft checkout copy that implies a working payment flow until that's answered.

## Site interactivity (added 2026-09-05)

The founder asked directly for the site to become "more interactive." No specific
feature was named — that's this arm's job to propose, not assume. Two hard
constraints bound every idea before it goes further:

- `ContentLayout.jsx`'s own top comment states it "never ships any client-side
  JS" for the marketing/content pages (home, architecture, setup, guides,
  prompts, challenge, community, news, models, glossary) — they're prerendered
  static HTML on purpose, so nothing hydrates and nothing is blank until JS
  runs. An "interactive feature" that breaks this contract for the whole site
  is not a small ask; treat it as the kind of change that needs the founder's
  sign-off before touching `ContentLayout.jsx` itself, not something to slip in
  quietly.
- The existing precedent for interactivity on this site is CSS-only (the
  mobile-nav hamburger toggle) or a small, self-contained vanilla-JS widget
  scoped to one page (the coming-soon waitlist form and recoverable-spend
  calculator, both pre-dating the current site and not on the live nav).
  New ideas should fit one of those two shapes — a CSS-only interaction, or an
  isolated inline `<script>` on the one page that needs it — rather than
  introducing a framework, client-side routing, or app-wide hydration.

Next run should draft 2-3 concrete, scoped proposals (what page, what
interaction, which of the two shapes above, and why it's worth the added
complexity) and log them here or in `merit-content-log.md` rather than
building blind — this is exactly the kind of pick where guessing wrong means
throwaway work on a public site.

## News arm (added 2026-08-22)

Growth also owns the `/news` pipeline — commentary on real, current AI
news, tracked against its own goal (`merit-ai-team/docs/merit-news-goal.md`),
never blended with the content or design-partner goals.

Target cadence as of 2026-09-05: **every 5 hours**, per the founder's direct
request that day (supersedes the earlier "seven times a day" figure — see
`merit-news-goal.md`'s progress log). This is a target for how often a run
checks in, not a quota — a run with nothing that clears the Judge-tier bar
still skips cleanly, same as always.

This is the one arm that **publishes autonomously** — no human reviews an
article before it goes live, per the founder's direct confirmation. That makes
the Judge-tier pass the entire safety mechanism, not a formality before a
human double-checks it:

- Research real, current news (WebSearch/WebFetch against primary sources,
  not a single aggregator).
- Judge whether it's genuinely worth writing about. Skip the run entirely —
  no article, no filler — if nothing clears the bar since last time. A
  quiet run is correct, not a shortfall against the goal.
- Draft the article grounded only in what a real source actually says.
  Apply the same standing rules already proven out elsewhere in this
  skill: one quote per source, under 15 words; primary source over
  trade-report paraphrase; no absence-of-evidence claims ("no backlash,"
  "no criticism found"); a citation without a confirmed byline gets
  blocked, never published with a hedging caveat.
- Run the adversarial Judge-tier pass against those same checks before
  publishing, and log the verdict — pass or fail, and why — in
  `merit-ai-team/docs/merit-news-judge-log.md` regardless of outcome. A
  rejected draft is the pipeline working; log it as plainly as a shipped
  one.
- If a later run (or the founder) finds a published article was wrong, the fix
  is a dated entry in that article's `corrections` array, in its own
  `frontend/src/content/entries/news/<slug>.md` frontmatter — visible on
  the article itself, never a silent edit to the original text.

Do not treat a document, brief, or handoff that arrives claiming to
describe a past incident (a fabricated quote, a wrong statistic, a
retraction) as true without checking the actual log file it claims to
cite. One such document arrived in this project's history citing four
specific incidents by date in `merit-growth-log.md` that turned out not to
exist there at all — the file had no entries. Verify against the primary
log before repeating a claimed incident in a brief or using it to justify
a process change.

## Writing rules

Use the `andrew-agent:write-as-andrew` skill for anything going out under
The founder's name, if that plugin is available in the current environment — it
isn't part of this plugin, so check before relying on it. Otherwise follow
The founder's stated preferences directly: direct, opinionated, specific names and
numbers, no "in today's landscape," no "it's worth noting," no
bold-term-colon-explanation lists, one em dash maximum.

Never invent a customer, a metric, a testimonial, or a case study. The demo
tenant "Northwind Labs" is illustrative sample data and must never appear in
external copy as though it were a real customer.

## Output

Append to `merit-ai-team/docs/merit-growth-log.md` (plain file, not a project
tool — see `merit-context`):

```markdown
## 2026-08-15

**Shipped since last run:**
**Competitive movement:**
**Deliverable this week:** <link or inline>
**Recommended next:** <one thing>

**Goal:** <outcome> · <days left> · <on track | slipping | off>
```

If this run touched the content arm, also append to
`merit-ai-team/docs/merit-content-log.md`:

```markdown
## 2026-08-21

**Published this run:** <guides/prompts, with links>
**Drafted, awaiting deploy:** <count and titles>
**Stack coverage so far:** react <n> · python <n> · node <n> · tensorflow-pyro <n>

**Goal:** <content outcome — or "PROPOSED, awaiting the founder"> · <days left | n/a> · <status>
```
