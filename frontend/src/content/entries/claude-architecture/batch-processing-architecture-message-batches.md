---
title: 'Batch processing architecture: the Message Batches API'
description: >-
  Not every workload needs a synchronous response — the Message Batches API
  trades latency for cost and throughput on large, offline jobs, and that
  trade only pays off if the surrounding pipeline is actually built for
  async submit-and-poll.
kicker: Guide · application architecture
lead: >-
  A synchronous request-response call is the right default for anything a
  person is waiting on, and the wrong default for a job that's going to run
  against thousands of records overnight regardless of whether any individual
  result comes back in two seconds or twenty minutes. Batch processing is
  the architecture for the second case, and it changes more about a
  pipeline's design than just how the API call is made.
wide: true
tileMeta: 'Async submit-and-poll instead of request-response, good fits, and idempotent per-item processing'
---
## 1\. The tradeoff batching exists for

A synchronous call optimizes for latency: the caller gets a response as soon as generation finishes, at a cost structure and a rate-limit profile built around interactive use. Batch processing optimizes for throughput and cost on large volumes of work that don't need an individual result back within seconds: a set of requests is submitted together, processed asynchronously, potentially over a longer window than any single synchronous call would take, and the tradeoff is exactly that, real latency for real cost efficiency on the aggregate job, in exchange for a substantially higher processed-request ceiling than sending the same volume as individual synchronous calls would practically allow.

The decision to reach for batch processing isn't about the total volume alone; it's about whether any individual result in that volume is time-sensitive. A thousand-record nightly job with no human waiting on any single record's specific result is exactly the shape batching is built for. A thousand-record job where each result needs to come back within a couple of seconds because a user is waiting on it isn't a batching problem no matter how large the volume is, because the thing batching trades away, per-item latency, is the one thing that use case can't give up.

## 2\. What actually changes architecturally

The interaction model inverts: instead of a call that blocks until a response is ready, a batch job is submitted once, as a set of individually identified requests, and the calling system polls for the job's status separately, retrieving results once processing completes rather than receiving them as the direct return value of the submission call. This means the calling code's control flow can no longer assume a result is available immediately after triggering the work; it has to be built around a job identifier, a polling or webhook-driven completion signal, and a separate retrieval step, which is a genuinely different shape of code than a synchronous call site, not just the same call with a longer timeout.

Results within a batch are also not guaranteed to complete uniformly: a batch job's overall status can be complete while individual items within it succeeded, failed, or were skipped for reasons specific to that one item, which means the retrieval and downstream-processing logic has to handle a batch as a collection of independently outcome-bearing items, not as a single unit that's either entirely done or not done at all.

## 3\. Good fits and bad fits

The clearest good fits are large, genuinely offline jobs: classifying or scoring a day's accumulated support tickets overnight, running a structured-extraction pass over a backlog of documents, generating a first-pass summary for every item in a large existing dataset, none of which has any individual item a person is actively waiting on the exact moment it finishes. These are jobs where the aggregate throughput and cost profile matters far more than any single item's turnaround time, which is precisely the profile batching is priced and designed around.

The clearest bad fits are anything user-facing or interactive: a chat interface, an agent responding to a live user action, anything where the value of the response is tied to it arriving within the timeframe of an ongoing interaction. Batching such a workload doesn't just add unwanted latency, it usually makes the feature unusable in the form it was designed for, since the whole interaction model a synchronous chat or agent experience depends on assumes the response is coming back on a timescale the interaction itself can absorb.

## 4\. Result handling: partial completion and per-item retry

Because a batch is a collection of independently outcomed items, the retrieval logic has to be written to check each item's own status rather than trusting that a completed batch means every item inside it succeeded. An item that failed, whether from a transient issue or a genuine problem with that specific input, shouldn't silently drop out of the pipeline; it needs the same explicit handling any failed unit of work in a production pipeline needs, logged, and either retried on its own (as a new, smaller batch or an individual synchronous call, depending on how time-sensitive recovering it actually is) or routed to wherever failed items in this pipeline are meant to land for review.

Retrying only the failed subset of a large batch, rather than resubmitting the entire batch because a fraction of it didn't succeed the first time, is the efficient version of this and depends on the pipeline having kept clear, per-item tracking from submission through to result, so that a partial re-run can target exactly the items that actually need it rather than reprocessing work that already succeeded.

## 5\. Designing the surrounding pipeline for resumability

A batch job that fails partway through the surrounding pipeline, the polling process crashes, a deploy interrupts the job that was meant to retrieve and process results, needs to be resumable without either losing completed work or reprocessing items twice, which means the pipeline has to track batch and item state somewhere durable, not just in the memory of whatever process happened to submit the job. Idempotent per-item processing, designing the downstream step that consumes a batch result so that processing the same item's result twice produces the same end state as processing it once, is the concrete property that makes a pipeline safe to resume or retry without careful, error-prone bookkeeping about exactly what has and hasn't been applied already.

This is the same idempotency discipline a well-designed event consumer needs for the at-least-once delivery [event-driven architecture](/cloud-architecture/event-driven-architecture) describes, applied to batch results instead of streamed events: neither system can promise a downstream consumer will only ever see a given unit of work exactly once, and the pipeline has to be built to tolerate that rather than assume it away.

## 6\. Combining batch with prompt caching

A batch job that runs the same instructions, the same system prompt, the same extraction schema, or the same evaluation rubric, across every item in a large batch is exactly the shape [prompt caching architecture](/claude-architecture/prompt-caching-architecture) is built for: the static, shared portion of every request in the batch, the instructions and schema that don't change from item to item, is a strong caching candidate, while only the per-item content actually varies across the batch's individual requests. Combining the two isn't a special integration, it's simply applying prompt caching's own structuring principle, static content first and cache-eligible, to a workload where "the same static content repeated across many requests" describes the entire batch by construction, which is precisely the pattern caching exists to reward.

## 7\. Worked example: nightly ticket classification

A support platform wants every ticket closed during the day classified into a fixed taxonomy overnight, feeding into the next morning's reporting, with no individual ticket's classification needed in real time. Running this as several thousand individual synchronous calls at the end of each day works, but it's neither the most cost-efficient way to process a job with no per-item latency requirement, nor particularly resilient: a transient failure partway through a long sequential loop of synchronous calls means restarting from wherever the loop happened to be tracking progress, with no structural guarantee against reprocessing items that already succeeded.

The batch redesign submits the day's tickets as a single batch job at close of business, with the classification instructions and taxonomy, the static, shared portion of every request, structured to benefit from caching, and each ticket's content as the per-item variable portion. A scheduled job polls for batch completion the next morning, retrieves results, and processes each ticket's classification idempotently, so a job that happens to run the retrieval step twice, or that's restarted after a partial failure, doesn't double-write results for tickets already processed. Any tickets that failed classification within the batch are logged with their specific failure and retried individually, rather than the whole nightly job being treated as failed because a small fraction of several thousand tickets didn't succeed on the first pass.

This pairs with [prompt caching architecture](/claude-architecture/prompt-caching-architecture) for the caching design this kind of repeated-instruction batch job benefits from directly, and with [structured data extraction](/claude-architecture/structured-data-extraction-pipelines) for the schema and validation layer a classification or extraction batch's results still need once they're retrieved.
