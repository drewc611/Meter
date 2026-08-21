---
name: merit-context
description: Shared background knowledge for every Merit agent-team skill — what Merit is, its three site arms, and the standing rails that apply regardless of which skill is running. Load this first, or whenever a skill needs to check what's in scope, what's off-limits, or what's still an open decision.
---

# Merit context

Merit is an AI spend tracker: it tells a company what it spends on AI, who's spending
it, and whether that spend is producing real work or slop. Early prototype status. See
the main repo's `CLAUDE.md` (`drewc611/Meter`) for the technical architecture — this
skill covers the business/site context the AI team operates against, which the repo's
own docs don't carry.

## The three site arms

1. **The ROI product** — `/`, `/architecture`, `/setup/*` (react, python, node,
   tensorflow-pyro). The core pitch: track AI spend, see who's actually producing
   value vs. slop.
2. **General AI-education content** — `/guides`, `/prompts`. Not gated, not tied to
   the product pitch directly. A 30-day prompt challenge lives at `/prompts/day-N-*`.
3. **The 30-day paid challenge** — `/challenge`. Landing page + gated daily content.
   **The fee mechanism is undecided as of this handoff** (Stripe vs. manual gating) —
   do not build a payment flow until Andrew confirms which.

These are two separate goals, not one funneling into the other by default — see
`merit-goal` for why they're tracked as independent outcomes, and the open question
below about whether content is meant to funnel traffic into the ROI product at all.

## Standing rails (apply to every skill in this plugin)

- Read-only public probes against the live ROI product. Never `POST` to `/admin/*`,
  `/ingest/*`, or `/waitlist` without asking first.
- Never push to `main` directly. Never deploy, change DNS, send mail, or publish
  anything without Andrew's sign-off.
- No invented numbers, stats, or testimonials, anywhere, for any purpose. Missing
  data gets named as missing — a blank or a "TBD" — never filled with a plausible
  guess.
- Anything external-facing (guides, prompts, landing copy) gets a Judge-tier
  adversarial pass before it ships, and at most one quote per source, checked against
  the primary material it claims to quote.

## Open decisions (owed by Andrew — carry these into every `merit-ceo-brief` run
until resolved)

1. Content goal — actual metric, number, deadline. Blocks `merit-goal`'s second goal
   from being anything but a placeholder.
2. Challenge fee mechanism — Stripe vs. manual gating.
3. Whether `/guides` and `/prompts` content should funnel traffic toward `/setup/*`
   (the ROI product) or serve a separate audience entirely. This changes every CTA on
   every guide/prompt page, so don't write those CTAs until it's answered.
4. Repo/push access for whichever repos a given task touches — confirm scope before
   using anything broader than the task needs.

## Provenance note

This plugin was reconstructed from a handoff spec (2026-08-21) describing updates to
six pre-existing skills; the prior versions of those skills were not available in the
session that wrote this one. Where the handoff described existing state (e.g. "the
10-design-partner goal"), that fact is carried over as given. Where it didn't specify
something (exact wording, prior file structure), this version is a fresh draft against
the spec, not a byte-for-byte continuation of an original. Treat the first real run of
each skill as a chance to correct drift from whatever was actually running before.
