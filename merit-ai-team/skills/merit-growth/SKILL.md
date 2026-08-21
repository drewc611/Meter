---
name: merit-growth
description: >
  Runs Merit AC's marketing and growth work — positioning, landing page copy, SEO
  and AI-answer-engine visibility, content calendar, and design-partner
  outreach. Use when Andrew says "marketing", "growth", "write the landing
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

"AI spend and value" is accurate but not a search term. Decide what Andrew
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
4. Outreach status: waitlist volume if Andrew has shared it, and a short list
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

The `/challenge` fee mechanism (Stripe vs. manual) is also undecided. Don't
draft checkout copy that implies a working payment flow until that's answered.

## Writing rules

Use the `andrew-agent:write-as-andrew` skill for anything going out under
Andrew's name, if that plugin is available in the current environment — it
isn't part of this plugin, so check before relying on it. Otherwise follow
Andrew's stated preferences directly: direct, opinionated, specific names and
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

**Goal:** <content outcome — or "PROPOSED, awaiting Andrew"> · <days left | n/a> · <status>
```
