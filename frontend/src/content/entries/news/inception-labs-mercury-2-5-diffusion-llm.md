---
date: '2026-09-09'
category: product
title: 'Inception Labs ships Mercury 2.5, a diffusion LLM pitched at latency-sensitive production workloads'
dek: >-
  1,107 tokens per second on standard Nvidia GPUs, a 260K context window, and
  an 80%-off launch price of $0.04/$0.15 per million tokens -- aimed
  explicitly at voice agents, coding subagents, and support workloads where
  speed and cost matter more than leaderboard rank.
sources:
  - label: Introducing Mercury 2.5 — Inception Labs (official)
    url: 'https://www.inceptionlabs.ai/blog/introducing-mercury-2-5'
---
Inception Labs launched Mercury 2.5 on September 9, 2026, the latest in its Mercury family of diffusion-based language models -- an architecture that generates text by iteratively refining a full draft rather than token-by-token, which is the source of its speed claims. The company says Mercury 2.5 delivers a 40% intelligence gain over its predecessor, runs at 1,107 tokens per second on standard Nvidia GPUs, and supports a 260K-token context window, with intelligence roughly comparable to GPT-5.6 Luna (Low), Gemini 3.5 Flash-Lite, and Claude Haiku 4.5 on the benchmarks Inception cites. Standard pricing is $0.20/$0.75 per million input/output tokens; launch pricing cuts that 80%, to $0.04/$0.15.

## Speed as the actual pitch, not a benchmark footnote

CEO Stefano Ermon called it "our most capable production model yet," but the company's own positioning leans hardest on latency, not intelligence-benchmark rank. OpenCall's Oliver Silverstein, quoted in the launch post, said switching to Mercury meant "our P99 response time dropped from several minutes to just one second" -- a concrete, named-customer number rather than a marketing claim.

## The unit-economics argument

Diffusion LLMs have been a smaller architectural lane next to the dominant autoregressive models, but Mercury 2.5's pitch is specifically at cost-conscious, latency-sensitive production traffic -- voice agents, coding subagents, customer support -- rather than general-purpose chat. For any team currently paying per-token for a slower frontier model on a workload where speed is the actual product requirement, the combination of a sub-second P99 claim and an 80%-off launch price is a concrete number to benchmark against, not just an architecture curiosity.
