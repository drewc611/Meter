---
date: '2026-09-14'
category: tools
title: Claude now writes 80% of Anthropic's own code -- and broke their CI in the process
dek: >-
  Anthropic's engineering team says code volume is up 8x since 2021-2025 with
  Claude authoring most of it, which pushed CI jobs up 25x in six months and
  forced a rebuild of how they figure out which tests actually need to run.
sources:
  - label: 'Agentic coding is straining CI. Here''s how we scaled test impact analysis at Anthropic — Claude by Anthropic (Sachin Malhotra)'
    url: 'https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic'
---
Anthropic published an engineering post on September 14 with numbers on how much its own codebase has changed under agentic coding: engineers now ship roughly 8x as much code per quarter as they did from 2021 through 2025, with Claude authoring 80% of it and playing a large role in reviewing and approving pull requests too. The test suite grew 10x to keep pace, which in turn pushed CI job volume up 25x over just six months -- enough to threaten to overload the test-impact-analysis service that decides which tests actually need to run against a given change.

## Writing code stopped being the bottleneck

The post's framing is blunt about where the constraint moved: "writing code is no longer the constraint." That's a specific, falsifiable claim about where agentic coding actually saves time in practice -- not in the writing, which was already fast, but in review, which then floods the infrastructure downstream of it. Anthropic's response was to re-architect its test-impact-analysis system for headroom well beyond current load, on the assumption that whatever capacity holds today should be sized for another 25x within two quarters, not treated as a ceiling.

## Why this matters beyond Anthropic's own repo

This is a rare instance of a frontier lab publishing its own internal telemetry on AI-assisted coding rather than a vendor benchmark -- and the shape of the bottleneck it describes (write fast, review fast, then drown downstream infrastructure) is exactly the failure mode any engineering org adopting Claude Code or a similar tool at scale should expect to hit next, not the one they're usually budgeting for. It's also a data point worth sitting next to any dashboard tracking AI coding-tool ROI purely by lines shipped or PRs merged: a spike in either one, on its own, says nothing about whether the CI and review capacity underneath it is keeping up.
