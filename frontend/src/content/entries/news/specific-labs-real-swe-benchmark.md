---
date: '2026-09-12'
category: tools
title: 'A new benchmark tests coding agents on real, private codebases -- and none crack 40%'
dek: >-
  Specific Labs' Real-SWE evaluates frontier coding agents against licensed
  production code instead of public repositories, and even the leading
  combination -- Claude Fable 5.1 running in Claude Code -- resolves only
  38.8% of tasks.
sources:
  - label: 'Real-SWE Benchmark — Specific Labs (Snagnik Das, Siddhant Paliwal, Janak Sunil)'
    url: 'https://withspecific.com/benchmarks/real-swe'
---
Most coding-agent leaderboards run on public repositories or synthetic tasks that frontier models have likely already seen in training. Real-SWE, built by YC-backed Specific Labs, instead licenses production codebases from real companies -- including a consumer app with over 200,000 users and an enterprise financial platform -- specifically so the tasks and their fixes aren't anywhere on the public internet. As the benchmark's own writeup puts it, "99% of tokens in real-world enterprises are hidden away from the frontier models."

## The leaderboard, and the gap under it

Each model-and-harness combination gets 8 independent runs per task, averaged as pass@1. The results: Claude Fable 5.1 in Claude Code leads at 38.8% resolved, followed by GPT-6 Astra in Codex CLI at 33.8%, Gemini 3.8 Flash in Gemini CLI at 31.2%, GLM 5.3 in Claude Code at 28.8%, Grok 4.6 in Grok Build and Muse Spark 1.3 in Muse Code tied at 23.8%, Kimi K3 in Kimi Code at 18.8%, and GPT-5.6 Sol in Codex CLI at 16.2%. Even the top result fails more than six tasks in ten, and per Specific Labs' own analysis, six of ten sampled tasks scored under 15% across every model tested.

## Longer doesn't mean better

The benchmark's authors also checked whether agents that spent more time on a task did better, and found essentially no relationship: rollouts under 10 minutes failed 71.4% of the time, versus 73.4% for longer ones. The stated common failure modes are building on an unverified assumption, missing a stated requirement, or wiring a plausible idea into the codebase incorrectly -- not running out of time.

This is a single benchmark from a small startup, not yet independently replicated by another lab, and it's worth reading with that in mind. But the gap it documents -- roughly 60-84% failure rates on real, unseen enterprise code versus the much higher scores the same models post on public benchmarks -- is exactly the distinction Merit AC's own scoring is built around: usage and public-benchmark superiority aren't the same thing as a coding agent actually finishing the ticket.
