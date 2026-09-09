---
title: 'Guardrails architecture: validating and constraining Claude''s outputs'
description: >-
  A guardrail is a check enforced outside the model, not a stronger prompt
  instruction inside it — input filtering, output validation, and the
  fail-open versus fail-closed decision that determines what a check is
  actually worth.
kicker: Guide · application architecture
lead: >-
  A system prompt instruction and a guardrail look similar on a diagram and
  behave completely differently under pressure. An instruction is something
  the model weighs against everything else in its context and can, in the
  right circumstances, be argued out of. A guardrail is a check that runs
  outside the model's own generation, with no dependence on the model having
  followed the instruction in the first place, and that distinction is the
  entire reason guardrails exist as separate architecture rather than just
  better prompting.
wide: true
tileMeta: 'Enforcement outside the model, fail-open vs. fail-closed, and where a judge model actually fits'
---
## 1\. A guardrail is a boundary, not an instruction

Telling a model, in its system prompt, never to reveal a certain category of information, or never to take a certain action, is a real and useful signal, and it is also, structurally, just more context competing for the model's attention alongside everything else in the window, subject to the same pressures [prompt injection and agent security](/guides/prompt-injection-agent-security) describes: a sufficiently adversarial or unusual input can, in some cases, get a model to act against an instruction that was sitting in its own context the whole time. A guardrail is a check that runs independently of whether the model followed the instruction, on the input before it reaches the model or on the output before it reaches whatever consumes it, so that the system's actual safety property doesn't rest entirely on the model having correctly weighed a competing instruction against everything else asking it to do otherwise.

## 2\. Input-side guardrails

An input-side guardrail filters or classifies what reaches the model before generation happens: a classifier flagging content that looks like a prompt-injection attempt, a filter catching a request that's clearly out of scope for what the system is meant to handle, a check that a document being ingested doesn't contain the kind of embedded instruction indirect injection depends on. The value of catching a problem here rather than downstream is that the model never sees, and therefore never has the opportunity to be influenced by, the problematic input at all: an injection attempt caught and stripped at the input boundary can't affect a generation that never happened.

The limit is that an input-side check can only catch what it was built to recognize, and a filter tuned against known attack patterns has the same blind spot any pattern-based defense has against a genuinely novel one. Input-side guardrails are a real, useful first layer, not a complete answer on their own, which is exactly why output-side checks matter as a separate, independent layer rather than a redundant one.

## 3\. Output-side guardrails

An output-side guardrail runs after generation and before an output is acted on or shown, and it can take several different forms depending on what's being checked. Schema validation, covered in depth in [structured data extraction](/claude-architecture/structured-data-extraction-pipelines), catches shape: a response that doesn't conform to an expected structure gets rejected before anything downstream tries to parse it. A policy check enforces a hard business rule against the specific content of a response, a refund amount that exceeds an authorized limit, an action that touches a resource outside what this specific request was scoped to, regardless of how the model justified proposing it. A second model call acting as a judge, evaluated against the same failure modes [AI evaluation methods](/guides/ai-evaluation-methods) covers for LLM-as-judge generally, can catch a category of problem that's about the content's meaning rather than its shape: an unsafe suggestion, a tone that violates a brand guideline, a claim that isn't actually supported by the source material it cites.

The property that makes an output-side guardrail worth having, distinct from a stronger prompt, is that it runs after the model has already generated its best attempt, and evaluates that attempt against a check the model's own generation process had no ability to talk itself out of, the same way a code reviewer's job isn't undermined by the code author's own confidence that the code is correct.

## 4\. The asymmetry that makes this architecture, not redundancy

A prompt instruction and an external check are not two versions of the same thing at different strength levels; they fail in genuinely different ways, and that's the actual argument for building both rather than treating the stronger one as a replacement for the weaker one. An instruction embedded in the model's own context can be outweighed, misread, or specifically targeted by an input crafted to exploit exactly how the model weighs competing signals in its context, because it's part of the same reasoning process that's also processing the potentially adversarial input. An externally enforced check has no such dependency: it doesn't matter how persuasive or unusual the input that produced a given output was, the check evaluates the output against a fixed rule that the generation process has no visibility into and no ability to negotiate with.

This is the same principle [Claude and MCP](/claude-architecture/claude-and-mcp)'s trust-boundary section and [the ten disciplines of governed agentic DevSecOps](/guides/ten-disciplines-of-governed-agentic-devsecops) both make about tool authorization: enforcement has to happen independently of whatever the model requests, never inferred from the model's own assurance that a given action is safe, and a guardrail is exactly that principle applied to a model's generated output instead of to a tool call's arguments.

## 5\. Where a judge model fits, and its own failure modes

A second, often cheaper, model call evaluating the first model's output against a rubric is a real and useful guardrail for content whose problems are semantic rather than structural, a tone violation, an unsupported claim, a subtly unsafe suggestion, none of which a schema or a fixed policy rule can catch, because none of them are violations of shape or a hard numeric rule. The failure modes are the same ones [AI evaluation methods](/guides/ai-evaluation-methods) documents for LLM-as-judge generally: a judge that's insufficiently different from the generator can share its blind spots, missing exactly the class of error both models are prone to for the same underlying reason; a rubric that doesn't discriminate well between a genuinely bad output and a merely mediocre one produces a guardrail that's noisy in both directions, flagging fine outputs and missing bad ones.

A judge-based guardrail is worth building specifically for the category of problem no cheaper check can catch, and it's worth building with the same skepticism about its own reliability that any LLM-as-judge deployment deserves, not treated as an infallible layer just because it runs as a separate, independent call from the generation it's checking.

## 6\. Fail-open versus fail-closed

When a guardrail check itself fails, times out, errors, or simply can't reach a confident verdict, the system has to do something, and that something is a deliberate design decision, not a default that happens to fall out of how the code was written. Fail-open lets the original output through when the check can't complete, prioritizing availability: the user gets a response even if the guardrail that was supposed to check it couldn't run. Fail-closed blocks the output when the check can't complete, prioritizing safety over availability at the cost of a real, if hopefully rare, false rejection whenever the guardrail itself, not the content it was checking, is what actually failed.

Neither is correct universally, and the right choice tracks the actual cost of each failure direction for the specific surface in question: a guardrail checking a low-stakes, easily correctable summary can reasonably fail open, since the cost of an occasional bad summary getting through is low and recoverable. A guardrail checking whether an agent is authorized to execute a financial transaction should fail closed without much debate, since the cost of a false negative there, an unauthorized action executing because the check that would have caught it happened to time out, is categorically worse than the cost of an occasional false rejection asking a legitimate request to retry.

## 7\. Worked example: proposing versus executing a refund

A customer-support agent built on Claude is given a tool to look up an order and a tool to issue a refund, and the system prompt instructs the model to only issue refunds that are clearly justified by the order's history and the customer's stated reason. Relying on that instruction alone means the actual safety property, no unjustified refund gets issued, depends entirely on the model correctly weighing the instruction against a customer's message that might be phrased persuasively, angrily, or with a plausible-sounding but false claim, exactly the kind of pressure an instruction embedded in context is weakest against.

The guardrail architecture instead splits the tool in two: the model can call a `propose_refund` tool that returns a structured proposal, order ID, amount, and stated justification, with no side effect at all, and a separate, non-model-controlled step validates that proposal against hard rules, a maximum amount without escalation, a check that the order and the claimed issue are actually consistent with each other, before a distinct `execute_refund` action, which the model never calls directly, actually runs. The model's judgment is still doing real, useful work generating a well-reasoned proposal; the guardrail, not the model's own restraint, is what actually enforces the limit, and that enforcement holds regardless of how persuasive the input that produced the proposal happened to be.

This pairs with [structured data extraction](/claude-architecture/structured-data-extraction-pipelines) for the schema-validation layer a guardrail pipeline often builds on, and with [prompt injection and agent security](/guides/prompt-injection-agent-security) for the specific threat model that makes enforcement outside the model's own reasoning necessary in the first place.
