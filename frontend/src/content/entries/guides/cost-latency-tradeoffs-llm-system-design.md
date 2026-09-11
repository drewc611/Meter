---
title: Cost and latency tradeoffs in LLM system design
description: >-
  Every request through an LLM-powered system has a cost and latency budget
  whether or not anyone wrote it down — model tiering, caching, streaming,
  and batching are the four real levers, and none of them is free.
kicker: Guide · systems engineering
lead: >-
  Quality, cost, and latency behave like the classic project-management
  triangle: pick two, and the third moves. A system design that never names
  its actual cost and latency budget hasn't avoided the tradeoff, it's just
  left it to be decided implicitly, by whichever model and whichever call
  pattern the code happened to default to, instead of deliberately.
wide: true
group: systems-engineering
tileMeta: 'Model tiering, caching, streaming, and batching — the four levers, and their real costs'
---
## 1\. Every request has an implicit budget

A feature that calls a model on every request is making a cost and latency decision whether or not anyone wrote a number down: the model chosen, the amount of context sent, whether the response streams or waits for completion, all of it adds up to a real per-request cost and a real per-request latency, and a system with no explicit budget for either just inherits whatever the default choices happened to produce. The useful exercise, done deliberately rather than left implicit, is naming both numbers up front for a given feature: how much latency can this specific interaction tolerate before it feels broken, and what per-request cost is acceptable given the expected volume, because both of those answers constrain which levers are actually available, not just which ones are nice to have.

## 2\. Model tiering: routing by task difficulty

Defaulting every request in a system to the largest, most capable available model is the common first-pass design, and it's rarely the right steady-state one, for the same reason [extended thinking: architecting for Claude's reasoning mode](/claude-architecture/extended-thinking-architecture) argues against defaulting deep reasoning onto every request regardless of whether the task needs it: a simple classification, a short-form rewrite, a lookup with a clear answer, gets nothing from the largest available model that a smaller, faster, cheaper one wouldn't have gotten just as reliably, and paying the larger model's cost and latency on every one of those simpler requests is a real, compounding cost across volume for no quality benefit on the requests that didn't need it.

Model tiering routes a request to the tier of model that actually matches its difficulty: a lightweight model for routine, well-defined tasks, escalating to a larger model only for the requests that genuinely benefit from it, using the same kind of routing logic, a cheap upfront classifier, a fixed rule based on request type, or an escalate-on-failure pattern, that section 3 of the extended-thinking guide lays out for a related but distinct decision. The two decisions, which model tier and whether to use extended reasoning, are separate levers that both follow the same underlying principle: match the resource spent to the difficulty of the specific request, rather than defaulting the most expensive option onto every request regardless of whether it needed it.

## 3\. Caching as a cost and latency lever together

[Prompt caching architecture](/claude-architecture/prompt-caching-architecture) is primarily framed as a cost optimization, and it's worth being explicit that it's a latency lever too: a cached portion of a prompt doesn't need to be reprocessed from scratch, which reduces the time to first token as well as the cost of the call. A system with a large, static system prompt or a repeated set of few-shot examples sent on every call is paying both a cost tax and a latency tax on that static content, every single request, and structuring the prompt so the static portion is genuinely cache-eligible (see that guide's section on what counts as "static enough") captures both savings from the same design change, not two separate optimizations that happen to both be worth doing.

## 4\. Streaming for perceived latency, not actual latency

[Streaming architecture for Claude applications](/claude-architecture/streaming-architecture-claude-applications) reduces perceived latency, how long a user feels like they're waiting, without necessarily reducing actual total generation time at all: a streamed response that takes the same total time as a non-streamed one feels faster because content starts appearing immediately instead of the user staring at nothing until the whole response is ready. This is a genuinely valuable lever for interactive, user-facing features, and it's worth being precise that it's solving perceived latency specifically, not actual cost or actual total processing time, which matters when deciding whether streaming is the right lever for a given problem: a background job with no one watching gets nothing from streaming, because there's no perception of latency to improve when nobody's waiting on the output in real time.

## 5\. Batching for throughput, not latency-sensitive work

[Batch processing architecture: the Message Batches API](/claude-architecture/batch-processing-architecture-message-batches) is the lever for the opposite end of the spectrum from streaming: work with no per-item latency requirement at all, where the actual goal is processing a large volume efficiently rather than getting any single result back quickly. Reaching for batching on a latency-sensitive, interactive feature is a category error, trading away the one thing that use case can't give up; reaching for individual synchronous calls on a large, genuinely offline job is the opposite mistake, paying an interactive cost and rate-limit structure for work that never needed interactive turnaround at all. Correctly identifying which side of that line a given workload sits on, before reaching for either lever, is most of getting this decision right.

## 6\. The tradeoff triangle, stated plainly

None of the four levers above, model tiering, caching, streaming, batching, actually escapes the underlying tradeoff between quality, cost, and latency; each one shifts where a specific piece of the tradeoff gets paid, or removes a genuinely wasted cost that wasn't buying any quality in the first place. Routing an easy request to a smaller model doesn't sacrifice quality if the task genuinely didn't need the larger model's extra capability, it removes a cost that was never earning its keep. Caching removes a real, repeated cost for content that's genuinely static, not a cost that was buying anything by being reprocessed every time. Neither is a free lunch in the sense of getting more quality for less cost across the board; both are ways of not overpaying for quality the system was never actually using. A genuinely harder task, one where the larger model's extra capability is actually doing real work, still costs more and takes longer than a smaller model would, and no amount of caching or clever routing changes that underlying fact for the requests that genuinely need it.

## 7\. Worked example: redesigning a document-summarization feature

A document-summarization feature originally calls the largest available model synchronously on every request, with the full document included fresh in every call and the user waiting for the complete summary before seeing anything. Under real usage, most documents are short and summarizing them is a genuinely easy task; a smaller fraction are long, complex, or technical enough that the larger model's extra capability is doing real, necessary work. The system currently pays the larger model's full cost and latency on every single request, easy and hard alike, and the user waits the full generation time with nothing visible until the entire summary is ready.

The redesign applies each lever where it actually fits: a cheap upfront length-and-complexity check routes short, straightforward documents to a smaller, faster model, escalating to the larger model only for documents that genuinely warrant it; the response streams regardless of which model handled it, so the user sees the summary building immediately instead of waiting for the full generation; and a separate, unrelated internal use case, generating a first-pass summary for every document in a large historical archive with no one waiting on any individual result, moves off the same synchronous, per-document call pattern entirely and onto a batch job, cutting its cost and removing it from competing for the same interactive-latency infrastructure the user-facing feature actually needs. None of these changes reduce the quality of a summary the larger model was genuinely earning its cost on; they stop paying that cost on the requests, and the workload, that were never actually benefiting from it.

This pairs with [prompt caching architecture](/claude-architecture/prompt-caching-architecture), [streaming architecture for Claude applications](/claude-architecture/streaming-architecture-claude-applications), and [batch processing architecture](/claude-architecture/batch-processing-architecture-message-batches) for the mechanics of each individual lever, and with [extended thinking: architecting for Claude's reasoning mode](/claude-architecture/extended-thinking-architecture) for the closely related routing decision of when deeper reasoning, not just a larger model, is actually worth its own cost.
