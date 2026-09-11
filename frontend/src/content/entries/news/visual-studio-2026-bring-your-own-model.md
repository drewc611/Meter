---
date: '2026-09-08'
category: tools
title: Visual Studio 2026 lets teams point Copilot at their own model contract, not just GitHub's
dek: >-
  The September update adds Bring Your Own Key support for Microsoft Foundry,
  OpenAI, Anthropic, or Ollama deployments, plus a new Git-reading agent --
  a direct fix for the spend-attribution problem of being locked to
  GitHub-metered usage.
sources:
  - label: Visual Studio 2026 release notes — Microsoft Learn (official)
    url: 'https://learn.microsoft.com/en-us/visualstudio/releases/2026/release-notes'
---
Visual Studio 2026 version 18.10.0 shipped September 8, 2026 with Bring Your Own Key (BYOK) support, letting teams route Copilot-in-VS traffic through Microsoft Foundry, OpenAI, Anthropic, or Ollama deployments instead of only GitHub-hosted models. The release also adds an "Agent (Preview)" built on the GitHub Copilot SDK, and a Git agent that can be handed a pull request and answer questions about it inline.

## Why BYOK is the practical fix, not just a feature

Microsoft's own framing: the update lets teams "use AI in Visual Studio with the models your team prefers." That's a direct answer to the exact cost-attribution problem this site tracks -- an organization that already has a negotiated contract or cost center with a specific model provider no longer has to accept GitHub-metered usage as the only option inside the IDE, and can instead route spend through whichever billing relationship it already manages.

## A Git agent built for reviewers, not just authors

The new Git agent -- built on the same Copilot SDK-powered harness as the broader Agent (Preview) -- is scoped narrowly: read a PR, answer questions about it, without needing to open a separate chat and paste in context. It's a smaller change than BYOK, but it's aimed squarely at the reviewer side of the workflow, which most coding-agent releases so far have mostly ignored in favor of the author side.
