---
date: '2026-09-15'
category: tools
title: Claude Code gets a path into regulated enterprises that couldn't run it before -- on their own infrastructure
dek: >-
  Coder added Claude Code support to its self-hosted Agent Relay, letting
  financial-services and other regulated customers run the coding agent
  inside network-governed, auditable workspaces they control, with Anthropic
  still handling inference and billing behind the scenes.
sources:
  - label: >-
      Coder Brings Claude Code to Agent Relay, Unlocking Agentic Development
      for the World's Most Regulated Enterprises — GlobeNewswire (Coder
      Technologies, official announcement)
    url: 'https://www.globenewswire.com/news-release/2026/09/15/3362210/0/en/coder-brings-claude-code-to-agent-relay-unlocking-agentic-development-for-the-world-s-most-regulated-enterprises.html'
---
Coder announced on September 15 that its Agent Relay -- a self-hosted execution environment for cloud coding agents -- now runs Claude Code, letting enterprises execute agent sessions on infrastructure they themselves control, sandbox, and audit rather than on external servers. Anthropic still handles the model inference and billing side; what moves is where the agent actually runs and what network it can touch. Coder president Josh Epstein put the target market plainly: "Claude Code is one of the agentic tools our enterprise customers ask for by name, and regulated industries have wanted it the most" -- industries that, per the announcement, had previously been unable to adopt it at all because of compliance and data-isolation requirements that a fully cloud-hosted agent couldn't satisfy.

## The isolation requirement, not the model, was the blocker

Cat Wu, who leads the Claude Code product at Anthropic, framed the fit the same way from the other side: "The teams that care most about running Claude Code on their own infrastructure tend to be the ones with the most rigorous environmental isolation requirements." That's a distinction worth sitting with -- this isn't a capability gap in the agent, it's a deployment-topology gap. A bank's security team doesn't object to what Claude Code can do; it objects to code execution happening somewhere it can't govern with its own network policies and audit logging.

## Why it matters

For a buyer already tracking coding-agent spend, this closes off a specific excuse for shadow AI in the most compliance-sensitive teams: instead of engineers at a regulated firm reaching for an unsanctioned agent because the sanctioned deployment model doesn't clear procurement, there's now a version that runs inside infrastructure the security team already owns. That matters for attribution too -- agent activity that happens inside a company's own auditable workspace is activity that can actually be tied back to a cost center and an outcome, instead of showing up as an unmapped identity nobody signed off on.
