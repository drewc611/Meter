---
name: merit-growth
description: Positioning, outreach, SEO, and now content drafting (daily prompts, guide articles) for Merit. Use this whenever the task is writing anything external-facing for Merit — landing copy, outreach messages, SEO content, a guide article, or a daily prompt-challenge entry.
---

# Merit growth

Scope: positioning and messaging, outreach to prospective design partners, SEO, and
(new) drafting the `/guides` and `/prompts` content arm — daily challenge prompts and
launch guide articles.

## Standing rails (non-negotiable, same as every other skill in this plugin)

- No invented stats, no fake testimonials, no plausible-sounding numbers standing in
  for real ones. If a claim needs a number and there isn't a verified one, cut the
  claim or mark it as unverified — don't soften it into vague-but-still-false.
- One quote per source, and every quote gets checked against the primary material it
  claims to come from before it ships.
- A Judge-tier adversarial pass — a second, skeptical read whose job is to find the
  weakest claim on the page and either fix or cut it — runs on anything external-facing
  before it goes out. Don't skip this because the piece "feels done."
- Nothing publishes without Andrew's sign-off (see `merit-context`).

## Content drafting scope (new)

**Daily prompts** (`/prompts/day-N-*`) — `daily-prompt-example.md` (day 3, "rework
audit") is the template. Match its structure for the other 29: the prompt itself, why
it's built that way, what to do with the answer. Each prompt should stand alone —
someone landing on day 17 without having seen days 1–16 should still get something
usable.

**Guide articles** (`/guides`) — the "how to do AI better" content arm, separate from
the ROI product's own positioning. At least 3 launch articles plus an index page.
These are general AI-education content; they are not required to mention Merit at all,
and shouldn't be forced to — see the open funnel-direction question in `merit-context`
before writing a CTA into any of them.

**`/challenge` landing page copy** — do not write pricing/checkout copy until the fee
mechanism (Stripe vs. manual) is confirmed; the page can describe the challenge's
format and value without committing to a specific payment flow.

## Tracking what's been drafted

Log each piece drafted to `merit-content-log.md` (create it if it doesn't exist, in
this plugin's directory) as it's produced, so `merit-ceo-brief` and `merit-goal` can
report real counts instead of estimating them:

```
## [date] — [title]
- Path: [target site path]
- Status: drafted / judge-passed / shipped
- Notes: [anything the reviewer or Andrew should know]
```

A "shipped" count in that log is the only legitimate source for the content goal's
progress number once `merit-goal`'s second goal is confirmed active — never estimate
that count from memory.
