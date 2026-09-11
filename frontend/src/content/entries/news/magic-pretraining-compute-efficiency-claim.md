---
date: '2026-09-08'
category: research
title: AI startup Magic claims a pretraining recipe roughly 50x more compute-efficient than DeepSeek's
dek: >-
  Trained for about $0.5M on GB200 hardware -- roughly half GPT-3's compute
  budget -- then scaled 10x further to beat public open base models on
  held-out perplexity, attributed to many incremental changes rather than one
  breakthrough.
sources:
  - label: Pretraining at Magic — Magic (official)
    url: 'https://magic.dev/blog/pretraining'
---
AI startup Magic published a technical update on September 8, 2026 claiming its pretraining recipe now matches DeepSeek V4 Pro Base's quality using roughly 50 times fewer FLOPs, trained for about $500,000 on GB200 hardware -- roughly half the compute budget originally used for GPT-3. Scaled 10 times further, the same recipe beat public open-weight base models on held-out perplexity across 167 domains, per the company's own account.

## Efficiency, not a single breakthrough

Magic's own description is specific: the company says it can "match DeepSeek V4 Pro Base using ~50x fewer FLOPs," and attributes the gain to many incremental architecture, optimizer, and data changes accumulated over time rather than one identifiable innovation. That framing matters -- a single dramatic technique is easy to dismiss as unrepeatable, while a long list of compounding small efficiency gains is closer to how most real cost reductions in this industry actually happen.

## A data point for anyone modeling training costs

If the claim holds up under independent scrutiny, a 50x reduction in the compute needed to reach a given quality bar is a material data point for anyone forecasting near-term AI training costs or evaluating how defensible a frontier lab's current compute-spend advantage actually is. It's a self-reported figure from a company with an obvious incentive to look efficient, so treat it as a claim worth watching for third-party replication rather than a settled fact.
