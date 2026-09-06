---
title: Four control boundaries for agentic DevSecOps
description: >-
  Code generation is the easy part. The enterprise problem is controlling what
  happens after the model decides what it wants to do — adapted from our own
  Agentic DevSecOps reference deck.
kicker: Guide · from the Agentic DevSecOps reference deck
badge: From the Merit AC team
lead: >-
  Code generation is the easy part. The enterprise problem is controlling what
  happens after the model decides what it wants to do.
wide: true
group: devsecops
tileMeta: 'Code generation is the easy part — the short version, in four boundaries'
---
## The problem

> **Model reasoning** — inspect repository, propose a change, select a tool, explain intent.
>
> **Enterprise authority** — identity, policy, CI/security gates, approval + deployment.

Do not collapse these two layers.

Collapsing them is tempting because it looks like fewer moving parts: one fewer service to wire up, one fewer handoff to explain, a demo that feels faster because nothing stops the model between deciding and doing. What goes wrong in practice is that a single actor ends up holding both judgment and authority at once — a model reasons that a stale branch should be deleted, or that a failing deployment should be rolled back by force-pushing over it, and because there is no separate gate to cross, the same call that proposed the action also has the credential to execute it. Nothing sits between "I think this is a good idea" and "this just happened."

## The four boundaries

The platform has four control boundaries. Every action crosses a boundary that can be logged, denied, reviewed, tested, or rolled back.

1.  **Request** — engineer / application. A prompt, ticket, or triggered workflow enters the platform here; a denial at this boundary means the request never reaches the model at all — blocked by rate limit, scope, or request type before any reasoning happens.
2.  **Reason** — Claude Code + Bedrock. The model inspects context and proposes a specific tool call plus its rationale, nothing more; a "denial" here has no rollback to perform, because the proposal was never authority to act — it's discarded and the loop continues.
3.  **Authorize** — Gateway + identity + policy. A proposed tool call becomes (or doesn't become) a permitted action, checked against identity, scope, and target; a denial here is logged with a specific policy reason, not silently dropped, so it becomes part of the evidence trail rather than a dead end.
4.  **Verify** — CI/CD + sandbox. The resulting artifact is checked independently of whatever the model claims about it; a rollback here reverts a deployment or blocks a merge through the same deterministic pipeline that would catch a human engineer's mistake.

> **Evidence rail:** model call · tool call · policy result · CI result · approval · deployment · health

## Claude Code: treat the repository as the operating context

`CLAUDE.md` is the engineering contract, not a substitute for security enforcement. The workflow: **Discover → Plan → Change → Validate → Pull request.**

It's tempting to treat `CLAUDE.md` as if it were a control, since it names the workflows to preserve and the changes that are out of bounds. It isn't one — a markdown file is a strongly worded instruction to a model, and nothing stops the model from reasoning its way around it under pressure to make a task succeed. The actual boundary sits downstream, in CI and branch protection and review: those are what turn "the agent was told not to touch this" into "the agent structurally cannot merge a change to this without a human looking at it."

Repository rules that matter:

*   Preserve protected security and deployment workflows
*   Make the smallest viable change
*   Run deterministic validation before proposing the PR
*   Return the diff, evidence, remaining risk, and rollback steps
*   Ask before widening a tool's scope or a credential's permissions — don't proceed and mention it in the PR description

## MCP + tools: narrow tools beat an unrestricted shell

Claude Code requests an operation → the Tool Gateway enforces a typed contract and policy → AWS/Git authorizes the target.

The common mistake is scoping tools around what's convenient to build rather than what the task actually needs — handing the agent the same broad, long-lived credential an engineer would use interactively, because minting a narrow one per tool takes extra setup. That shortcut quietly collapses Authorize back into Reason: if the credential can already do anything, the Gateway's policy check becomes a formality instead of a real constraint. A well-scoped tool fails loudly and specifically when asked for something outside its contract, instead of falling back to a broader permission it happened to inherit.

> **Blocked by design:** arbitrary admin shell · broad inherited credentials · long-lived static credentials · unregistered cloud actions

## DevSecOps: the agent does not grade its own work

Build → unit + integration → IaC validation → SAST / SCA → secrets → approval → deploy. Independent gates decide whether the artifact moves forward. A model assertion never replaces a test result, scan result, policy decision, or deployment health signal.

The failure mode to watch for is treating a green pipeline as proof when the agent authored both the change and the tests validating it — a model that writes a bug can just as easily write a test that doesn't catch it. Gates only stay independent if their configuration, thresholds, and test suites move through the same review process as everything else, rather than getting quietly loosened by the same agent that's trying to get a build to pass.

## Observability: an evidence chain, not a chat transcript

A chat transcript records what the model said it was doing, not what actually happened downstream — it's narration, not evidence. The common mistake is treating a clean-looking conversation log as an audit trail; it can't answer whether the tool call it describes was actually authorized, what the policy engine decided, or whether the deployment it claims succeeded actually passed a health check. The six-stage chain below is what makes a single action traceable end to end, from request to rollback, regardless of what the model said about it.

1.  **Request** — who asked + what changed
2.  **Model** — invocation + reasoning context
3.  **Tool** — operation + identity + policy
4.  **Pipeline** — tests + scans + artifact
5.  **Decision** — review + approval
6.  **Runtime** — deploy + health + rollback

## The operating model: start bounded, scale on evidence

Agentic engineering becomes useful at enterprise scale when the controls are visible, independent, attributable, and measurable.

> **Claude Code + AWS controls + independent evidence = trust.**

This is the short version of [the ten control disciplines](/guides/ten-disciplines-of-governed-agentic-devsecops) — see [the 30-day challenge](/challenge) to build the reference project these four boundaries describe.
