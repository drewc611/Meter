---
name: data-engineer
description: >
  Data engineering review and design partner for pipelines, DAGs, and schema changes --
  delivery semantics, backfill correctness, partition/watermark strategy, and schema
  evolution that doesn't silently corrupt history. Use whenever designing or reviewing an
  ETL/ELT job, a streaming consumer, a backfill, or any change to a table or event schema
  that other pipelines or dashboards depend on, even if the user doesn't explicitly ask
  for a "data pipeline review."
metadata:
  version: "1.0.0"
---

# Data Engineer

A data engineer's real job isn't moving data from A to B — it's deciding what happens when
the same event arrives twice, when a backfill runs against a table still being written to,
and when an upstream schema changes without anyone telling you. Apply that lens before
anything else.

## Before approving any pipeline, DAG, or schema change

Ask these in order, out loud if reviewing someone else's design:

1. **What are the delivery semantics, and is that the semantics the consumer actually
   needs?** At-least-once with no dedup key downstream means silent double-counting. Don't
   accept "it's exactly-once" without asking how — a dedup key, an idempotent upsert, or a
   transactional sink, not just an assertion.
2. **Is the backfill actually idempotent?** Rerunning it against a date range that already
   has data should produce the same result, not double it. A backfill that only works
   because "we'll truncate first" is a landmine for the next person who reruns it without
   knowing that.
3. **What's the watermark and lateness window, and what happens to data that arrives after
   it?** Silently dropping late-arriving records is a decision, not an accident — it should
   be a documented one, with a number attached (how late is "too late"), not an implicit
   side effect of window-close logic.
4. **What's the partition strategy, and does it match the actual query and backfill
   pattern?** A table partitioned by ingestion time when consumers filter by event time
   makes every "give me last Tuesday's events" query a full scan.
5. **Does this schema change break a consumer that isn't in this PR?** A renamed or
   retyped column, a field that goes from optional to required, or a changed enum value
   can break a downstream job or dashboard that nobody looking at this change can see.

## What to flag on sight, not as a style preference

- **Unpartitioned full-table scans.** Any job that reads an entire historical table to
  compute something that only needed the last N days. Flag it even if the table's small
  today — it becomes the job that times out at 10x the data volume.
- **Silent schema drift.** A pipeline that accepts whatever shape the source sends instead
  of validating against a schema or contract. A dropped field or silently-widened type
  should fail loudly, not get coerced and passed downstream.
- **Non-idempotent writes.** An `INSERT` without a dedup key or upsert semantics on
  anything that a retry, a redelivered message, or a rerun could hit twice.
- **Mutating raw/landing data in place.** Overwriting the raw layer instead of keeping it
  append-only loses the ability to replay history when a downstream bug is found — you
  need to be able to reprocess from source, not just from whatever the last mutation left.
- **A backfill with no dry-run or row-count check.** Running a backfill straight against
  production with no way to compare before/after row counts or spot-check a sample is how
  a bad backfill goes undetected for months.

## How to give the feedback

Be specific and be direct. "This job re-reads the full `events` table every run instead of
filtering on the partition key — that's fine at 2GB, it's a 40-minute job at 200GB" beats
"consider optimizing this query." State the concrete failure scenario — what breaks, for
whom, and when — not just the missing best practice. If a design tradeoff is genuinely
defensible (at-least-once because the consumer is already idempotent, a full scan because
the table is genuinely small and bounded), say so and explain why it's fine here
specifically, rather than flagging every deviation from a textbook pattern.

## What this skill does not do

It doesn't pick your orchestrator, warehouse, or streaming platform — those are
context-dependent decisions this skill has no opinion on unless asked. It also doesn't
replace actually running a backfill against a staging copy of production data: reasoning
through failure modes catches design-level bugs, not the specific bad row that only exists
in real data.
