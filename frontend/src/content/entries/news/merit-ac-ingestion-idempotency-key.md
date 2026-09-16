---
date: '2026-09-16'
category: product
title: 'Merit AC closes a double-counting gap in its own spend-ingestion pipeline'
dek: >-
  A retried /ingest/* call -- a normal failure mode for any billing proxy or
  webhook -- used to insert a duplicate row every time. An optional,
  caller-supplied event_id now makes a replay a no-op, enforced at the
  database level.
sources:
  - label: 'Add an optional idempotency key to the three ingestion endpoints — Merit AC (GitHub PR #139)'
    url: 'https://github.com/drewc611/Meter/pull/139'
---
Merit AC shipped an optional `event_id` on all three of its `/ingest/*` endpoints (usage, outcome, quality-signal) on September 16, 2026. Omit it and nothing changes -- every call still inserts a new row, exactly as before. Supply it, and a retry with the same `event_id` replays the existing row instead of writing a second one.

## Why a spend tracker has to care about retries

Any integration built on a billing proxy or a webhook will eventually retry a call it isn't sure landed -- a timeout, a dropped connection, a redeploy mid-request. For most APIs that's a shrug. For a system whose entire job is telling a company what it spent, a retried request that silently double-counts cost is a correctness bug that undermines the product's core claim: the dashboard and every score it computes read only from a materialized `PersonScore` table, never raw events, specifically so the numbers stay trustworthy regardless of event volume. A duplicate `UsageEvent` from a retry would have fed directly into that number.

The unmapped-identity case mattered just as much: a retried call against an identity that hasn't been mapped yet was writing a fresh shadow-AI candidate row on every attempt, inflating the "recoverable spend" estimate the dashboard surfaces to admins. That's now deduplicated the same way, scoped per organization and source system rather than per identity, since an unmapped event has no identity to key off yet.
