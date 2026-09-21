---
title: 'Merit AC vs. Helicone'
description: >-
  Helicone is a mature, open-source LLM observability tool: cost, latency and
  token tracking per API call, with manual per-request tagging for
  attribution. Merit AC starts from a different question -- not just what was
  spent, but who spent it and whether it produced real work.
kicker: Comparison · AI spend
lead: >-
  Both tools watch AI API spend. The difference is what they're built to
  answer. Helicone answers "what did this API call cost, and how fast was
  it" -- genuinely well, at genuine scale. Merit AC is built to answer "is
  this person's AI spend producing real outcomes, or slop" -- a question
  Helicone isn't trying to answer at all.
wide: true
tileMeta: 'Observability vs. value/risk scoring -- and an honest look at where Helicone is simply ahead'
---

[Helicone](https://www.helicone.ai/) is a real, working product with paying customers: a YC-backed, open-source LLM observability platform that logs cost, latency (including time-to-first-token on streaming responses), and token counts for every API call that passes through it. It's free up to 10,000 requests a month, $79/month for the Pro tier (alerts, reports, a query language over your logs), and it's genuinely self-hostable via Docker or an enterprise Helm chart -- your logs never have to leave your own infrastructure if you don't want them to. It also ships an evaluator feature: send a model's output to a judge model (GPT, Claude, or your own custom scorer) against a rubric you define, which catches quality regressions between prompt or model changes.

## What Helicone gets right

Helicone is unambiguously ahead on maturity and scale-tested reliability. It's been logging real production traffic for real companies for years, its self-hosting story is a documented, working Docker Compose setup rather than a roadmap item, and its evaluator feature is a genuinely useful quality-regression signal that has nothing to do with Merit AC's own scoring model -- it's solving an adjacent, real problem well.

The one place Helicone leaves work on the table is attribution. Its cost/latency/token data is tied to whatever you tell it, via a `Helicone-User-Id` header you add to each request yourself -- there's no automatic resolution of an API key, a GitHub login, or an SSO identity into one canonical person across every tool they touch. If your engineer uses both an Anthropic key and a GitHub Copilot seat, Helicone sees two unrelated traffic streams unless you've built the mapping yourself.

## Where Merit AC differs

That identity resolution is the thing Merit AC's data model is built around: `IdentityMapping` resolves a proxy API key, a GitHub login, or an Okta/Entra SCIM subject to one canonical person, scoped to your organization, so spend from every source lands on the same row rather than requiring per-request instrumentation. From there, Merit AC's scoring is trying to answer a different question than Helicone's evaluator does: not "did this specific output pass a quality rubric" but "over a period, did this person's AI spend correlate with real outcomes" -- pull requests merged (not reverted), tickets resolved, deals advanced -- normalized against the company's own median, alongside a slop-risk score built from what happened to AI-touched work after it shipped (reverts, rework, abandoned drafts). Merit AC is also built as a hub around that number -- an AI news feed, a models-and-tools directory, a glossary -- rather than a pure API logging pipe.

The honest caveat: Merit AC is an early-stage, pre-launch product. Its own homepage says so, and the dashboard runs on illustrative demo data until an org connects its own. Helicone's production maturity is real and currently ahead. The comparison that actually matters, then, isn't "which is more finished today" -- it's which question you need answered. If the question is "is this specific API call fast, cheap, and correct," Helicone already does that well. If the question is "which of my people's AI spend is turning into real work, and which isn't," that's the gap Merit AC exists to close.
