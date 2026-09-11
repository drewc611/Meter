---
date: '2026-09-09'
category: tools
title: GitHub gives IT admins a kill switch over what Copilot's agents are allowed to do
dek: >-
  Two changelog entries landed a day apart -- centrally locked-down sandbox
  behavior for Copilot in JetBrains, then org-wide, non-overridable
  permission policies for which agent actions get auto-blocked, need human
  approval, or run without a prompt.
sources:
  - label: Enterprise managed sandbox in Copilot for JetBrains IDEs — GitHub Changelog (official)
    url: >-
      https://github.blog/changelog/2026-09-08-enterprise-managed-sandbox-in-copilot-for-jetbrains/
  - label: >-
      Enterprise managed permissions for GitHub Copilot agent operations — GitHub
      Changelog (official)
    url: >-
      https://github.blog/changelog/2026-09-09-enterprise-managed-permissions-for-github-copilot-agent-operations/
---
GitHub shipped two enterprise-governance features for Copilot within 24 hours of each other. On September 8, 2026, it gave admins central control over Copilot's sandbox behavior in JetBrains IDEs -- filesystem access, network access, proxy settings, macOS Keychain access -- with org policy overriding whatever an individual developer has set locally. The next day, it added enterprise-managed permission policies for Copilot's agent operations: which actions get auto-blocked, which require a human approval step, and which proceed without a prompt, set centrally and not overridable at the user or workspace level.

## Governance catching up to autonomy

Per GitHub's own changelog, admins "can now centrally configure sandbox behavior for GitHub Copilot in JetBrains IDEs," and separately "control which agent operations are blocked, require human approval, or proceed without prompt." Taken together, the two releases are GitHub building the lockable, org-wide guardrails that typically lag a few steps behind an agent's own capability -- shipped in the same week rather than months apart.

## The question every security team asks about agentic tools

"Did the agent just do something we didn't approve" is the standing risk finance and security leaders raise about autonomous coding agents, and these features are a direct answer to it -- a governance-maturity checkbox that's now concretely inspectable rather than a promise on a pricing page. For any company comparing Copilot's enterprise controls against Cursor's, Devin's, or Claude Code's own permission models, this is the specific bar to check each vendor against.
