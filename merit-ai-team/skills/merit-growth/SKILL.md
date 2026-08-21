---
name: merit-growth
description: >
  Positioning, outreach, SEO, and content drafting (daily prompts, guide
  articles) for Merit. Use this whenever writing anything external-facing —
  landing copy, outreach messages, SEO content, a guide article, or a daily
  prompt-challenge entry. Depends on merit-context; logs to
  merit-ai-team/docs/merit-growth-log.md and merit-content-log.md.
metadata:
  version: "0.1.0"
  last_verified: "2026-08-21"
---

# Merit growth

Scope: positioning and messaging for the ROI product, outreach to prospective
design partners, SEO, and the `/guides` + `/prompts` content arm — daily
challenge prompts and launch guide articles.

## Standing rails (same as every skill in this plugin — see `merit-context`)

- No invented stats, no fake testimonials, no plausible-sounding numbers
  standing in for real ones. If a claim needs a number and there isn't a
  verified one, cut the claim or mark it unverified — don't soften it into
  vague-but-still-false. Merit's own product copy holds itself to "spend-
  weighted estimate, not a causal claim"; marketing copy about Merit gets the
  same discipline.
- One quote per source, checked against the primary material it claims to
  come from, before it ships.
- A Judge-tier adversarial pass — a second, skeptical read whose job is to
  find the weakest claim on the page and either fix or cut it — runs on
  anything external-facing before it goes out.
- Nothing publishes without Andrew's sign-off. Never `POST` to `/waitlist` or
  anywhere else without asking first.
- Andrew's voice: direct, opinionated, specific. No "in today's landscape," no
  "it's worth noting," no bold-term-colon-explanation lists.

## Content drafting scope

**Daily prompts** (`/prompts/day-N-*`) — one stack-tagged post per day (react,
python, node, tensorflow-pyro), matching whatever template the first shipped
prompt establishes: the prompt itself, why it's built that way, what to do
with the answer. Each prompt should stand alone — someone landing on day 17
without having seen days 1–16 should still get something usable.

**Guide articles** (`/guides`) — the "how to do AI better" content arm,
broader audience than the ROI product's buyer. These don't need to mention
Merit at all, and shouldn't be forced to. Don't write a CTA into any of them
toward `/setup/*` until the funnel-direction question in `merit-context` is
answered — writing one now means rewriting every guide later if the answer is
"separate audience."

**`/challenge` landing page copy** — don't write pricing/checkout copy until
the fee mechanism (Stripe vs. manual) is confirmed; the page can describe the
challenge's format and value without committing to a specific payment flow.

## Tracking what's been drafted

Log each piece to `merit-ai-team/docs/merit-content-log.md` as it's produced:

```
## [date] — [title]
Path: [target site path]
Status: drafted / judge-passed / shipped
Notes: [anything the reviewer or Andrew should know]
```

A "shipped" count in that log is the only legitimate source for the content
goal's progress number (see `merit-goal`) once that goal is confirmed active
— never estimate it from memory. Log positioning/outreach/SEO work separately
in `merit-ai-team/docs/merit-growth-log.md`.
