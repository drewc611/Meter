---
date: '2026-09-15'
category: product
title: Salesforce builds its own reasoning model instead of buying one from Anthropic or OpenAI
dek: >-
  Koa, post-trained on Nvidia's open-weight Nemotron and tuned on synthetic
  CRM scenarios rather than customer data, is Salesforce's bid to stop paying
  frontier-lab token prices for the reasoning behind its Agentforce agents.
sources:
  - label: 'Announcing Koa: Salesforce''s First CRM Reasoning Model, Built on NVIDIA Nemotron — Salesforce (official press release)'
    url: 'https://www.salesforce.com/news/press-releases/2026/09/15/koa-reasoning-model/'
---
Salesforce and Nvidia announced Koa on September 15, a reasoning model purpose-built for Agentforce's sales, marketing, and customer-support workflows -- and, notably, one Salesforce built itself rather than routing that reasoning to Claude or ChatGPT as it has been doing. Koa is post-trained on top of Nvidia's open-weight Nemotron 3 Super using a proprietary synthetic dataset "modeled on enterprise knowledge from nearly three decades of CRM deployments," per the companies' announcement -- explicitly built without touching the customer data sitting in Salesforce's own platform. Training combined supervised fine-tuning with reinforcement learning (GRPO) via Nvidia's NeMo RL, NeMo Gym, and NeMo AutoModel stack.

## The pitch: matching frontier accuracy at a fraction of the errors, and the cost

On Salesforce's internal CRM benchmark -- tasks like updating opportunities, routing cases, and scheduling follow-ups -- the companies say Koa "matches or exceeds leading model performance" with three times fewer errors than the alternatives it's replacing. Nvidia CEO Jensen Huang framed the underlying bet in the release: "AI is creating a much larger opportunity for software." The model is live with select pilot customers now, with general availability targeted for winter 2026 in U.S. regions.

## Why a CRM vendor is building its own reasoning model

The strategic logic is straightforward: every Agentforce task that used to get routed to a frontier model's API was a per-token bill Salesforce was paying on behalf of its customers. A smaller model post-trained specifically on CRM action-taking -- rather than general-purpose reasoning -- can plausibly do that narrower job cheaper and with fewer errors, while keeping the whole request inside Salesforce's own infrastructure instead of a third party's. It's the same logic that's pushed several enterprise software vendors toward open-weight foundation models this year: pay once to specialize a model on your own workflows instead of paying per call to rent someone else's frontier reasoning indefinitely.

That's a bet worth watching from a spend-tracking standpoint too -- it only pays off if the narrower model's output holds up on the messier, non-benchmark tasks it'll actually see in production, not just the curated CRM actions it was scored on.
