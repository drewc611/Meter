---
title: 'Extended thinking: architecting for Claude''s reasoning mode'
description: >-
  Extended thinking is a real latency and cost tradeoff, not a free accuracy
  upgrade — how to decide which requests actually warrant it, and where it fits
  inside an agent loop.
kicker: Guide · reasoning architecture
lead: >-
  Extended thinking — a mode some Claude models support where the model works
  through a problem step by step before producing its final answer — is easy to
  treat as a setting: a flag to turn on when you want "better" answers. That
  framing undersells what's actually being traded, and it leads to the most
  common mistake teams make with it, which is turning it on everywhere and
  calling it a quality upgrade. Extended thinking is an architecture decision
  with a real latency and cost profile attached, and the interesting engineering
  problem it creates isn't "should we use it" — it's "which requests, exactly,
  actually benefit enough to be worth what it costs."
wide: true
tileMeta: >-
  Routing genuinely hard requests to deeper reasoning, not defaulting it
  everywhere
---
## 1\. What extended thinking actually changes

In a direct-answer interaction, a model reads a prompt and produces a response — whatever intermediate reasoning happens, happens implicitly, inside the model, without being surfaced as a distinct step. Extended thinking changes the shape of that interaction: the model first produces an explicit reasoning process — working through the problem, considering possibilities, checking intermediate steps against each other — and only then produces its final response. The reasoning is a distinct, visible phase that precedes the answer, rather than something that happens invisibly on the way to it.

That distinction matters most for problems that have real multi-step logical structure — the kind where getting to a correct answer actually depends on working through intermediate steps in order, and where skipping a step or getting one wrong early on propagates into a wrong final answer. A complex debugging task, where the cause of a failure has to be narrowed down through a chain of "if this were the cause, we'd also see that" reasoning. A multi-constraint planning problem, where several requirements have to be satisfied simultaneously and a solution that looks fine against one constraint might violate another. A proof-shaped question, where each step has to follow validly from the one before it. For problems like these, an explicit reasoning phase genuinely helps arrive at a correct answer, because the problem's difficulty lives in the reasoning chain itself, not in retrieving or generating the final output.

That same mechanism does nothing useful for a different, and much larger, class of request: a simple lookup, a straightforward rewrite, a short-form generation task, a question with a single direct answer that doesn't depend on working through intermediate steps at all. Asking a model to extract a phone number from a paragraph, or draft a one-line status update, or answer a factual question it already has a direct answer for, doesn't get more accurate because the model spent extra steps reasoning about it — there's no multi-step structure for the extra reasoning to add value to. The distinction that matters architecturally isn't "hard versus easy" in some vague sense — it's specifically whether the task has genuine intermediate structure that working through, step by step, measurably improves the odds of getting right.

## 2\. The latency and cost tradeoff this introduces

Extended thinking takes real additional time and real additional tokens compared to a direct answer, and neither of those costs is hypothetical or negligible at the volumes a production system runs at. The reasoning phase has to actually happen before the final response starts, which means a user or a downstream step in a pipeline waits longer for the answer. And the reasoning content itself consumes tokens, which is a real cost on every single request it's applied to, not a one-time setup cost.

Neither cost is a reason to avoid extended thinking — it's a reason to be deliberate about where it's applied. The architectural mistake is defaulting it on for every request a system handles, regardless of whether that request is the kind of multi-step problem section 1 describes or a simple case that gets no benefit from it. A system that does that pays the full latency and token cost of extended thinking on every request, while only a fraction of those requests actually needed the deeper reasoning to get a better answer. The requests that didn't need it just got slower and more expensive for no accuracy gain at all.

> **The rule this implies:** extended thinking belongs on the subset of a system's requests that actually benefit from deeper reasoning, applied selectively, not as a blanket default across every request regardless of complexity. A well-designed system spends the latency and token budget where it buys something, and skips it everywhere else.

This is also, in practice, a measurement problem, not just a design principle to state once and move on from. "Does this request actually benefit" isn't self-evident from the request alone — it has to be checked against outcomes: does routing a given slice of traffic through extended thinking measurably improve the metric that matters (fewer follow-up corrections, a higher pass rate on a downstream check, fewer escalations to a human) enough to justify what it costs in latency and tokens on that slice. A system that turns extended thinking on for a category of request and never checks whether the accuracy gain shows up is making the same mistake as a team that ships a change and never checks whether it helped — the tradeoff in section 2 is only worth making where the evidence says it pays for itself.

## 3\. The routing problem: deciding what qualifies

Once extended thinking is something you apply selectively rather than universally, a genuine design problem shows up that a simple on/off setting never had to face: deciding, before calling the model, whether a given request is complex enough to warrant it. This is a real classification problem, not a detail to wave past, and there are a few structurally different ways to solve it, each with a different cost, accuracy, and complexity profile.

**A cheap upfront classifier.** Run a fast, inexpensive check — a small model call, a rule over the request's features, or even a simpler heuristic model — that predicts whether the incoming request looks like the multi-step kind before deciding whether to route it to extended thinking. This adds a small amount of latency and cost up front, on every request, in exchange for making a real decision instead of a blanket one. Its accuracy depends entirely on how good the classifier is: a weak classifier either sends easy requests to extended thinking unnecessarily (the mistake this section exists to avoid) or, in the other direction, misses genuinely hard requests and sends them down the fast path where they underperform.

**A fixed rule based on request type.** If a system already categorizes incoming requests by type — a support ticket is tagged as "billing dispute" versus "password reset," a coding-agent step is tagged as "diagnose failure" versus "run a lint check" — that categorization is often already a reasonable proxy for complexity, and doesn't need a separate classifier built on top of it. This is cheaper to build and reason about than a learned classifier, but it's only as good as the correlation between the category and actual complexity — a category that's usually simple but occasionally contains a genuinely hard case will systematically under-serve that case.

**A two-pass, escalate-on-failure approach.** Try a fast, direct answer first, and only escalate to extended thinking if that first attempt fails an explicit check, or if the model itself expresses low confidence in it. This avoids paying the extended-thinking cost on requests that turn out to be easy after all — including ones a classifier might have wrongly flagged as hard — but it pays a different cost: the first pass's latency is spent even on requests that end up escalating, so the worst case is slower than committing to extended thinking immediately would have been, and the approach depends on having a reliable way to detect that the first attempt actually failed or is genuinely uncertain, which is its own non-trivial problem.

None of these three is uniformly better than the others — a cheap classifier trades a small universal cost for a direct decision; a fixed rule trades classification accuracy for simplicity; a two-pass approach trades worst-case latency for avoiding unnecessary extended-thinking calls on requests a classifier might have misjudged. Which one fits depends on how expensive a wrong routing decision is in either direction for the specific system, and how much the request types already correlate with actual complexity.

| Approach | Fits best when | Main cost |
| --- | --- | --- |
| Cheap upfront classifier | High request volume, complexity hard to infer from metadata alone | Adds latency/cost to every request; only as good as the classifier |
| Fixed rule by request type | Request categories already correlate well with complexity | Under-serves the occasional hard case hiding in an easy category |
| Two-pass, escalate on failure | Most requests are easy and a fast first attempt is cheap | Worst case pays first-pass cost plus escalation; needs reliable failure/low-confidence detection |

It's worth naming the failure mode each approach produces when it gets the routing decision wrong, because the three don't fail the same way. A classifier that under-flags complexity sends a genuinely hard request down the fast path, where it comes back with a confidently wrong answer and no indication anything was skipped — the same silent-failure shape ordinary tool-use mistakes have, just applied to a routing decision instead of a tool call. A fixed rule that mis-categorizes a request fails the same way, quietly, for every request in the mis-categorized slice rather than occasionally. A two-pass approach fails more visibly by comparison — its worst case is slow, not silently wrong — which is often the more recoverable failure mode to have in a system that's still being tuned, even though it's the more expensive one at the tail.

## 4\. Extended thinking inside agentic loops

The same selectivity applies inside an agent loop, and it's worth calling out specifically because an agent loop makes it easy to reach for a single, uniform setting across the whole session. A multi-step agent — one that plans, calls tools, reads results, and decides what to do next — is not uniformly hard across its own steps. Some steps in the same loop genuinely require multi-step reasoning: deciding how to recover from an unexpected tool failure, working out which of several plausible root causes actually explains an error, choosing between two conflicting pieces of evidence the loop has gathered so far. Other steps in that same loop are routine: making a simple tool call with arguments that are already determined, checking whether a status field equals a known value, formatting a result for the next step to consume.

Extended thinking is often best applied selectively within the loop — to the specific steps that actually have the reasoning-heavy shape section 1 describes — rather than as a blanket setting applied uniformly to every step the agent takes. Setting it on for the whole loop pays the latency and token cost of deep reasoning on every routine tool call the agent makes along the way, most of which get nothing out of it. Setting it on only for the steps that actually need it — the diagnosis step, not the status check — captures the accuracy benefit where it exists without paying for it everywhere else. This is the same selective-application principle from section 3, just applied at the granularity of individual steps in a loop instead of individual requests to a system.

## 5\. The transparency angle, and its limit

An explicit reasoning trace, when it's surfaced, gives a human reviewer something real to check against, rather than only a final answer with no visible work behind it. This is genuinely useful for debugging: when a model reaches a conclusion that looks wrong, a visible reasoning trace lets a reviewer see where the reasoning actually went off track — a wrong assumption made early, a piece of evidence weighted more than it should have been, a step that skipped over a constraint — rather than being left to guess why a black-box answer came out the way it did. For problems that involve real diagnostic or planning work, that visibility turns "the model got this wrong" into "the model got this wrong at this specific step, for this specific reason," which is a much more useful place to start fixing something from.

It's worth being precise about the limit of that usefulness, though: a reasoning trace that reads as coherent and well-structured is still not the same thing as independent verification that the conclusion is correct. This is the same caution [AI evaluation methods](/guides/ai-evaluation-methods) raises about a fluent-sounding wrong answer generally — fluency and structure are not evidence of correctness, they're evidence that the model produced something that reads well. A reasoning trace can walk through several plausible-looking steps and still arrive at a wrong conclusion, and a trace that sounds confident and organized is, if anything, more persuasive on the way to being wrong than a bare wrong answer would have been, precisely because it looks like work was shown. Treat a reasoning trace as a genuinely useful debugging aid and a starting point for a reviewer's own checking — not as proof that stands in for that checking.

## 6\. Worked example: a good candidate and a bad one

**A good candidate.** A scheduling system needs to assign a set of shifts across a team of people, where each person has different availability windows, some shifts require a specific certification only a subset of people hold, no one can be scheduled for two overlapping shifts, and total hours have to stay within labor-rule limits per person per week. Satisfying all of those constraints simultaneously is exactly the multi-step, interacting-constraints structure that benefits from working through the problem explicitly — checking a candidate assignment against each constraint, backtracking when one is violated, and reasoning about which trade-off to make when two constraints pull in different directions. This is a legitimate case for extended thinking: the extra reasoning time is being spent on a problem where reasoning through it step by step is what actually gets to a correct, constraint-satisfying answer.

**A bad candidate.** A support system needs to answer "what's your return policy for electronics?" by pulling the answer from a known policy document. There's no multi-step logical structure here — the answer is a direct lookup, and the model either has or retrieves the right text and returns it. Routing this request through extended thinking adds real latency and token cost, and gets nothing back for it: there's no chain of intermediate reasoning for the extra step to improve, because the task was never reasoning-shaped in the first place. This is precisely the case section 2's rule is meant to catch — the request doesn't need deeper reasoning, so applying it uniformly just makes an easy request slower for no accuracy gain.

```
A quick test for whether a request is a good candidate for extended thinking:

1. Does getting a correct answer genuinely depend on working through
   several interacting steps in order (not just retrieving or
   generating one thing)?
2. Could an early mistake in that chain plausibly produce a wrong final
   answer if it went unchecked?
3. Is the request a simple lookup, a direct rewrite, or a short-form
   generation task with a single well-defined answer?

Extended thinking is a good fit when 1 and 2 are true. If 3 is true
instead, the extra reasoning step likely adds latency without adding
accuracy — route it down a direct-answer path instead.
```

Extended thinking is a real capability for problems that are genuinely reasoning-shaped, not a general quality dial to turn up whenever an answer matters. The architecture question worth spending design time on isn't whether to use it — it's building the routing logic, whether at the level of a whole request or a single step inside an agent loop, that sends it only where the problem's own structure actually calls for it.
