---
date: '2026-09-11'
category: tools
title: Cognition pairs a frontier model with a cheap sidekick to cut Devin's coding costs
dek: >-
  Fusion runs a "lead" model alongside a lower-cost "sidekick" with separate
  persistent contexts, which Cognition says gets up to 39% more efficient
  results on coding benchmarks than running one model alone.
sources:
  - label: Introducing Fusion in Devin Desktop & CLI — Cognition (official)
    url: 'https://cognition.com/blog/local-fusion'
---
Cognition introduced Fusion in Devin Desktop and Devin CLI on September 11, 2026, a harness that runs two models on a coding task at once instead of one: a frontier "lead" model that owns planning, ambiguity, and review, paired with a cheaper "sidekick" model that does more of the mechanical work, each keeping its own persistent context. Cognition says the approach is "up to 39% more efficient" on major coding benchmarks than running its frontier models alone. The recommended pairing runs Fable 5.1 or Astra as lead with Cognition's own SWE-2 as sidekick.

## The numbers behind the efficiency claim

On Cognition's published benchmark table, Fable 5.1 paired with SWE-2 through Fusion cut cost by 46% on DeepSWE 1.1 and 34% on SWE-Atlas QnA versus Fable 5.1 running alone, while scoring within roughly a point of the solo model on both. Astra paired with SWE-2 cut cost by 40% and 37% on the same two benchmarks. The Vals Code Migration benchmark showed the widest cost gap, at 41% for the Fable pairing, alongside a real score increase over the solo model.

## Optimizing for the bill, not just the leaderboard

Cognition frames the release around a specific argument: that models should be judged on price per finished task rather than price per token, since a harness that spends more tokens per call but needs fewer retries and less rework can still cost less end to end. That's a direct pitch to the same buyers this site's own tracker is built for -- teams trying to separate a coding tool's sticker price from what a finished, working change actually costs to produce, rather than assuming the priciest model per token is automatically the most expensive way to get the work done.
