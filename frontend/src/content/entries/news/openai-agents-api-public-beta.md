---
date: '2026-09-10'
category: tools
title: OpenAI turns its internal Codex agent harness into a billable API primitive
dek: >-
  The new Agents API exposes hosted orchestration, long-running sessions,
  sandboxed code execution, and multi-agent delegation directly -- meaning
  cost now scales with sandbox and container usage, not just tokens.
sources:
  - label: Introducing the Agents API — OpenAI (official)
    url: 'https://openai.com/index/introducing-the-agents-api/'
---
OpenAI opened public beta of its Agents API on September 10, 2026, exposing the same managed harness that powers Codex as a direct API call: hosted orchestration, long-running sessions, context compaction, sandboxed code execution, MCP connections, and multi-agent or subagent delegation, priced at standard token and tool costs with no added markup.

## Infrastructure becoming a product

Per OpenAI's own developer documentation, the Agents API "gives your application access to the Codex harness through an OpenAI-managed API" -- meaning what used to be internal infrastructure supporting one product is now a general-purpose building block any developer can call directly, rather than something only OpenAI's own agent products could use.

## A new line on the spend forecast

The practical shift for anyone forecasting agent-tooling spend: cost now scales with sandbox and container usage in addition to tokens, a distinction OpenAI's own developer community flagged directly, with one member publicly cautioning others to model the costs before building on it. For finance teams already tracking token spend as the main AI-cost line item, sandboxed compute time is a second, less familiar meter that needs its own line.
