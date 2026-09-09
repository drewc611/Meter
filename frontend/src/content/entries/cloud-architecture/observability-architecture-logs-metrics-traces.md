---
title: 'Observability architecture: logs, metrics, and traces'
description: >-
  Why the three observability signals answer different questions and none of
  them substitutes for the others, and how correlating them across service
  boundaries is what actually shortens an incident.
kicker: Guide · infrastructure architecture
lead: >-
  A system with plenty of logs, a metrics dashboard, and no way to connect
  either of them to a single request as it crossed six services is not
  observable, it's instrumented. Observability is the ability to ask a
  question the system wasn't specifically pre-built to answer and get a real
  answer from the data already being collected, and that ability lives in how
  the three signals connect, not in how much of each you're generating.
wide: true
tileMeta: 'Why none of the three signals alone is enough, and how correlation actually works'
---
## 1\. Three signals, three different questions

Metrics answer "how much, and how has that changed over time": request rate, error rate, latency percentiles, queue depth, all aggregated numbers cheap enough to store at high resolution for a long retention window because they're small by construction, a handful of numbers per interval rather than a record per event. Logs answer "what specifically happened, in this one case": a structured record of a single event, with enough detail to explain why one particular request behaved the way it did, at the cost of being far larger in aggregate than the metric that would summarize a million of them into one number. Traces answer "where did the time actually go, across every service this one request touched": a request's path through a distributed system, broken into spans, each span timed and attributed to the service and operation that produced it.

None of the three substitutes for either of the others, and treating one as sufficient produces a predictable gap: a metrics-only setup tells you error rate spiked at 2:14 and nothing about which requests, on which service, for which customer; a logs-only setup gives you the detail on any one event but no cheap way to see the aggregate trend that told you where to look first; a traces-only setup shows you where time went within a request you already knew was slow, but not which requests, out of a million, were the slow ones worth pulling a trace for in the first place.

## 2\. Metrics: aggregation and cardinality

A metric is cheap because it's aggregated at write time: a counter incremented, a duration recorded into a histogram bucket, rather than a full record persisted per event. That economy has a real limit, and the limit is cardinality: the number of distinct label combinations a metric can be broken down by. A request-count metric labeled by HTTP status code and route has a bounded, small cardinality. The same metric labeled additionally by user ID has cardinality proportional to the number of distinct users, and a time-series database that was cheap at bounded cardinality becomes expensive, sometimes catastrophically so, once a label is added that varies per user, per request ID, or per any other unbounded dimension.

The architectural discipline this implies is drawing a hard line between what belongs on a metric label (a small, bounded set of values known in advance: status code, route, region) and what belongs in a log line or a trace attribute instead (a user ID, a request ID, anything with effectively unbounded cardinality). A metrics system that's degraded because someone added a high-cardinality label is a common, avoidable production incident, and it's avoidable specifically by keeping that boundary in mind at instrumentation time rather than discovering it after the metrics backend falls over.

## 3\. Logs: structure is the actual requirement

An unstructured log line, free text written for a human reading a terminal in real time, is the easiest thing to produce and close to the hardest thing to query at scale. Extracting "every request from this customer, in this time range, that touched this code path" out of free text means writing a regex against a format nobody guaranteed would stay consistent between one release and the next.

A structured log, a JSON object (or an equivalent key-value format) with consistent field names for common attributes, request ID, service name, severity, and whatever domain-specific fields matter, turns the same query into an actual filter against actual fields, and turns log aggregation from best-effort text search into something closer to a real, queryable dataset. The discipline that makes structured logging actually pay off is consistency of field names across services: a request ID logged as `request_id` in one service and `reqId` in another defeats cross-service correlation just as completely as no structure at all would, because the correlating field doesn't line up.

## 4\. Traces: following one request across boundaries

A trace represents one logical operation, a single incoming request, as a tree of spans, each span a timed unit of work (an HTTP call, a database query, a function boundary someone chose to instrument) attributed to the service that did it. What makes a trace a trace, rather than just a timed log line in each service, is context propagation: a trace ID generated at the point a request enters the system, carried forward through every internal call the original request triggers, including calls to other services, so that spans recorded independently by five different services can be reassembled afterward into one coherent picture of where time actually went.

OpenTelemetry has become the common, vendor-neutral standard for this: a shared specification and instrumentation libraries for generating spans and propagating trace context across process and network boundaries, so that a trace doesn't break the moment a request crosses from a service instrumented with one vendor's SDK to a service instrumented with another's. Adopting a common propagation format is what makes tracing actually work in a real organization, where no single team controls every service a request might pass through.

## 5\. Correlation: what actually connects the three

The single practical change that turns three separate signals into observability is putting the same trace ID (or request ID) into the metric's exemplar data, the log line, and the trace span for the same event, so an engineer looking at a latency spike on a dashboard can jump from the metric that showed the spike, to a specific slow trace that exemplifies it, to the exact log lines that trace's services emitted while handling it, without three separate manual searches trying to line up timestamps by hand and hoping they picked the right five-second window.

This has to be designed in at instrumentation time, not bolted on afterward: a logging framework that doesn't automatically include the active trace ID on every log line written during that request, or a metrics client with no exemplar support linking a latency measurement back to one of the traces that contributed to it, leaves an engineer doing that timestamp-matching by hand during exactly the moment, an active incident, when they can least afford to.

## 6\. The cost observability adds to itself

Every signal collected is itself a cost: storage for retained metrics, logs, and traces, and at high enough traffic, real overhead on the request path from the instrumentation itself. Tracing every single request in a high-throughput system is often not affordable at full retention, which is why sampling exists: recording a representative subset of traces in full detail (a fixed percentage, or a smarter policy that always keeps error traces and slow traces regardless of the sampling rate) rather than every single one.

The design mistake to avoid is sampling uniformly at random with no bias toward the traces that actually matter for debugging: a flat 1% sample rate applied identically to every request means the rare, slow, or failing requests, exactly the ones an engineer will want to look at during an incident, are sampled at the same low rate as ordinary fast successful ones, and the trace that would have explained an incident has a good chance of simply not having been kept. Tail-based or error-biased sampling, deciding whether to retain a trace after seeing how it turned out rather than randomly up front, keeps the signal that actually gets used disproportionately, at a fraction of the storage cost of retaining everything.

## 7\. Worked example: a slow request across three services

A dashboard's p99 latency metric for the checkout endpoint jumps and stays elevated. The metric alone says checkout got slower for the tail of requests starting at a specific time; it says nothing about why, because that's not the kind of question an aggregated number can answer. From that metric, an exemplar link pulls up one of the actual slow traces that contributed to the spike, showing the request's spans across the checkout service, the inventory service it called, and the payment service that call led to. The trace shows nearly all of the added latency sitting in a single span: a call from inventory to a downstream stock-check query.

From that span's trace ID, the corresponding log lines in the inventory service show a query that used to hit an index and, after a recent schema migration, no longer does, because the migration dropped an index nobody had marked as still in use. None of the three signals alone would have gotten to that root cause in reasonable time: the metric flagged that something was wrong and where to start looking, the trace localized it to one specific downstream call out of many, and the log, found through the trace's own ID, explained the actual mechanism. That handoff, metric to trace to log, each one narrowing the search using an ID the last one handed off, is what "observability" means in practice, distinct from simply having all three signals collected somewhere.

This pairs with [cloud networking fundamentals](/cloud-architecture/cloud-networking-fundamentals) for the request paths tracing follows across service boundaries, and with [disaster recovery and multi-region architecture](/cloud-architecture/disaster-recovery-and-multi-region-architecture) for why the same signals, especially replication-lag and failover-related metrics, are what actually tells you whether a DR plan would hold up before you're depending on it during a real failure.
