---
date: '2026-09-13'
category: tools
title: Sourcegraph's Amp drops its subscription price to zero for bring-your-own-key users
dek: >-
  Amp now runs free on a developer's own compute and model subscriptions, with
  no BYOK token fees for anyone but Enterprise, plus new free Hobby and
  no-extra-charge Teams tiers.
sources:
  - label: Free Agent — Amp / Sourcegraph (official)
    url: 'https://ampcode.com/news/free-agent'
---
Sourcegraph's Amp coding agent published a pricing overhaul on September 13, 2026 that removes the requirement to pay Sourcegraph directly to use it. Per Amp's own announcement, "No BYOK token fees or limits for anyone" except its Enterprise tier -- developers can now point Amp at their own ChatGPT subscription or API keys and run it without a separate Amp plan. A new free Hobby tier covers pay-as-you-go orb usage (Amp's term for the remote compute its agents run on) or unlimited use of self-hosted runners, and Teams accounts no longer carry an extra per-seat charge on top of members' individual plans.

## Where the money still moves

Paying customers aren't unaffected: Amp's existing Individual tiers, Megawatt at $20/month with 45,000 minutes of included orb time and the higher Gigawatt tier, both got list-price cuts the company describes as roughly 60% and 65% respectively. Amp also added BYOK support for nine more model providers, including OpenRouter, Amazon Bedrock, and Azure Foundry, widening which existing enterprise contracts a team can route Amp's usage through instead of paying Sourcegraph's own model markup.

## A pricing model built around whose meter is running

The shift reflects a split that's shown up across coding agents this year: charge for the agent's reasoning, or charge for the compute and let developers bring their own model spend. Amp is now firmly in the second camp for solo and Hobby users, competing less on model access -- which a BYOK developer already has -- and more on the orchestration and orb infrastructure around it. For a team already tracking AI tool spend, it also means Amp's own line item can shrink to zero while the actual model cost simply moves to whatever provider contract the team already holds.
