---
title: 'Microservices vs. monolith: choosing cloud architecture'
description: >-
  A framework for choosing between a monolith and microservices based on actual
  forcing functions — team topology, deploy cadence, and scaling need — rather
  than fashion.
kicker: Guide · cloud architecture
lead: >-
  Most architecture regret doesn't come from picking the wrong pattern. It comes
  from picking a pattern before anything in the system actually demanded it,
  then paying the complexity cost of that choice for years without ever
  collecting the benefit it was supposed to buy. This guide is about how to
  tell, for a specific system with a specific team, whether that forcing
  function has actually arrived — and what a good split looks like when it has.
wide: true
tileMeta: 'What genuinely motivates a split, and the distributed-monolith anti-pattern'
---
## 1\. What a monolith actually is

A monolith is a single deployable unit — one build artifact, one process (or one horizontally-scaled fleet of identical processes) that gets deployed together, versioned together, and rolled back together. That's the whole definition. It says nothing about whether the code inside is well organized, and conflating the two is where a lot of architecture discussions go wrong before they start. A monolith with clean internal module boundaries — where the billing code doesn't reach into the inventory code's internal state, where each domain owns its own tables and exposes a narrow internal interface to the rest of the application — is a legitimate, durable architecture. It is not a stepping stone that every system is obligated to outgrow on the way to "real" architecture.

What gives monoliths a bad name is the _unmodularized_ monolith: years of features added without enforced boundaries, until every part of the codebase can reach every other part directly, a change to the checkout flow can break the reporting dashboard through a shared mutable object nobody remembers exists, and nobody can describe where one subsystem ends and the next begins. That failure mode is real and common, but the fix for it is modularity — enforced module boundaries, explicit internal interfaces, ownership per domain — not necessarily a network boundary. A monolith that has never been modularized will not become well-architected by being cut into services along the same tangled lines; it will become a distributed system with the same tangled dependencies, except now they cross the network and every one of them can fail independently. Fixing internal coupling is a prerequisite for a good microservices split, not a side effect of doing one.

The practical test for "is this monolith actually fine" is whether a developer working on one module can reason about it, test it, and change it without having to hold the entire application in their head. If the answer is yes, the fact that it all deploys as one artifact is not, by itself, a problem worth solving.

## 2\. What genuinely motivates microservices

There are a small number of forcing functions that actually justify the cost of splitting a system into independently deployed services. It's worth naming them precisely, because the vague version of each ("we need to scale," "we need to move fast") is almost always present in some form and doesn't distinguish anything — the specific version is what matters.

**Independent deployability** is the strongest and most common legitimate reason. It applies when separate teams need to ship on separate schedules without coordinating a release, and coordination has become the actual bottleneck — not a hypothetical one. If the payments team wants to deploy three times a day and the catalog team wants to deploy once a week, and today they can't because both live in one deployable unit with one release pipeline and one set of migration locks, that's a real cost being paid right now, and splitting the payments service out removes it directly. The test is concrete: can you point to a specific recent incident where team A's change blocked team B's deploy, or where a release had to be delayed to accommodate an unrelated team's testing cycle? If yes, this motivation is real. If the answer is "in theory this could happen," it's a prediction, not a forcing function yet.

**Independent scaling** applies when different parts of the system have genuinely different load profiles and load-following architectures. An image-processing pipeline that needs to burst to hundreds of workers during a batch job, sitting next to a user-facing API that needs low, steady latency and a handful of instances, are wasting resources and complicating capacity planning by being forced to scale as one unit. Splitting them lets each scale on its own metric, with its own instance type, without the api's autoscaler having to account for the batch job's spiky demand or vice versa. This is measurable — look at actual CPU, memory, and request-rate graphs per subsystem before assuming this applies; a system that scales roughly uniformly across its parts doesn't benefit from this motivation no matter how large it is.

**Technology heterogeneity** applies when a specific piece of functionality has a real, specific reason to run on a different language or runtime than the rest of the system — a machine-learning inference path that needs Python's ecosystem inside an application otherwise written in Go, or a latency-critical matching engine that justifies a systems language inside an application otherwise written for developer velocity. This is a narrower motivation than the first two, and it justifies splitting out the one component that needs it — not re-platforming the whole system into a polyglot mesh because heterogeneity is available as an option.

Notice what all three have in common: each one names a cost that is being paid today, in a way you could point to on a dashboard, in a deploy calendar, or in a team's actual roadmap conflict. That specificity is the difference between a real motivation and a plausible- sounding one.

## 3\. The reasons that don't hold up

The reasons that don't hold up share a different pattern: they point outward, at what other people are doing or what looks good on paper, rather than at a cost your own system is actually paying. "Microservices because a resume wants it" is the most honest version of this — a developer wants experience with distributed systems, service meshes, and container orchestration, and the project becomes the vehicle for that experience regardless of whether the project needs it. It's a real motivation for the person, but it isn't an architectural argument, and a system doesn't stop paying operational costs just because the person who introduced them has moved on to the next project.

"A conference talk said so" is the industry-fashion version of the same thing. Talks about microservices are disproportionately given by companies at a scale where the tradeoffs genuinely favored the split, because that's the interesting story — nobody gives a conference talk titled "we have twelve engineers and a well-organized monolith and it's still fine three years later," even though that is the accurate description of a large share of successful systems. The selection bias in what gets talked about at conferences is not a representative sample of what architecture is appropriate for a given team size.

"The org copied a company operating at 100x the scale" is the same fallacy with a specific, traceable cause: a team reads about how a company with thousands of engineers and a traffic profile in a completely different regime structures its services, and adopts the same structure for a system an order of magnitude or two smaller. What that company's architecture actually reflects is _their_ team topology, _their_ deploy cadence mismatches, and _their_ literal scaling requirements — none of which transfer by copying the shape of the solution without the underlying forcing function that produced it. A twelve-person team running forty microservices because a much larger company runs microservices has, in practice, built the operational burden of a distributed system while keeping the headcount of a monolith team — the worst ratio available.

The honest way to tell these apart from the real motivations in Section 2 is to ask the same question of both: what specific cost, being paid today, does this decision remove? If the answer is a citation to someone else's blog post rather than a graph, ticket, or deploy- calendar conflict from your own system, it's a fashion-driven reason, not an engineering one.

## 4\. The costs that don't show up until production

Every cost in this section is invisible in a design doc and in a demo. They show up specifically in production, under real failure conditions and real data volume, which is exactly why they get underestimated at decision time — the people deciding to split a system are, correctly, imagining the deploy pipeline and team-ownership benefits, and have not yet lived through the 2am page that only a distributed system produces.

**Partial failure** is the foundational one. A function call inside a monolith either returns or throws — there is no third state. A network call to another service can also time out, succeed after the caller has already given up and retried, arrive out of order relative to another call the caller made a moment earlier, or succeed on the far end while the response is lost on the way back, leaving the caller unable to tell whether the operation happened or not. None of these states exist inside a single process. Every one of them has to be designed for explicitly once a call crosses a network boundary — with timeouts, retries with backoff, idempotency keys, and circuit breakers — and "designed for explicitly" means code and infrastructure that a monolith simply never needed to write.

**Operational tooling that used to be free** is the second cost, and it's easy to underweight because a monolith gets so much of it for nothing. Inside one process, a stack trace shows you the entire call path of a failing request, log statements from different modules interleave in one file in the order they actually happened, and a debugger can step from the HTTP handler straight down into the database call. Split the same request across five services and none of that is true anymore by default: you need distributed tracing to reconstruct the call path (with a correlation ID threaded through every hop), centralized log aggregation to see events from five services in one timeline, and service discovery so each service can find the current network location of the others as they scale and redeploy independently. None of this is exotic — Jaeger, OpenTelemetry, and a log-aggregation stack are mature, well-understood tools — but it is infrastructure that has to be built, operated, and kept correctly configured, and a monolith needed none of it to get the same debuggability.

**Data consistency across service boundaries** is the cost that causes the most subtle, long-running production bugs. Inside a monolith, an operation that touches an order and an inventory count can usually be wrapped in one database transaction — it either all commits or all rolls back, and the database enforces that guarantee. Once "order" and "inventory" are owned by separate services with separate databases, that single transaction is gone, and the instinct to reach for a distributed transaction (two-phase commit across both databases) is usually the wrong answer: it requires every participant to be available and responsive at commit time, it holds locks across a network round trip, and it turns a slow or unavailable service into an outage for everyone else in the transaction. The pattern that actually works at scale is eventual consistency paired with compensating actions — the order service commits its own change and publishes an event, the inventory service processes that event on its own schedule and commits its own change, and if the inventory update fails after the order was already placed, a compensating action (cancel the order, refund the charge, notify the customer) undoes the effect rather than a rolled-back transaction preventing it from ever happening. This is a genuinely different way of reasoning about correctness — you design for a window where the two services briefly disagree, rather than making that window impossible — and every team's first attempt at it underestimates how many edge cases the compensating path has to cover.

## 5\. The distributed-monolith anti-pattern

The distributed monolith is what you get when a system is split into services along the org chart or an arbitrary codebase-size threshold rather than along actual bounded contexts — the natural seams in the domain where data and behavior genuinely belong together and change together. The tell is simple: shipping any one meaningful feature still requires coordinating a deploy across three or four "independent" services, because the data each one owns doesn't actually separate along the lines the services were cut on. A field that conceptually belongs to the order gets stored in the inventory service because that's where the team doing the split happened to be working, and now every change to order behavior needs a coordinated change to both services' schemas and both services' deploys.

This is the worst outcome available, not a middle ground. You now pay every cost from Section 4 — network calls that can fail partially, the need for tracing and service discovery, eventual-consistency reasoning — without collecting the one benefit that was supposed to justify paying them: independent deployability. Teams still block each other, a release still has to be coordinated across services, and a single logical feature is now implemented as a set of synchronized changes across a distributed system instead of one cohesive commit. Everything got harder and nothing got more independent.

The root cause is almost always that the split was driven by something other than the data. "We have three teams, so let's have three services" sounds like a Conway's Law–informed decision, but Conway's Law describes what naturally happens to system structure given a team structure — it isn't license to draw service boundaries by headcount without first asking whether the domain actually decomposes that way. A bounded context is defined by what data changes together and what behavior depends on that data being locally consistent, not by how many engineers are available to own a service. Splitting along team lines when the domain doesn't naturally separate along those same lines produces exactly the coordination tax the split was meant to remove.

## 6\. A decision framework

Start with team topology and Conway's Law, but use them as a diagnostic rather than a mandate: the system's communication structure will tend to mirror the organization's communication structure whether you plan for it or not, so it's worth asking honestly which teams actually need to make independent decisions about which parts of the system, and whether today's org chart reflects a real, durable division of responsibility or a temporary staffing accident that will look different in six months. A reorg is a much cheaper thing to redo than a service topology; don't let the current org chart lock in an architecture more permanent than the chart itself.

Next, measure actual scaling needs rather than assuming them. Pull the real CPU, memory, and request-rate metrics per subsystem over a representative period — including peak periods, not just an average day — and look for genuine divergence, not just difference in absolute traffic. A subsystem that gets ten times the requests but scales linearly with the rest of the system doesn't need independent scaling; a subsystem with a fundamentally different shape of demand — bursty batch work next to steady low-latency serving — does. This is a data-gathering exercise, not a guess, and it's one of the cheapest steps in this whole framework relative to the cost of getting it wrong.

Then default to modular monolith first. Build clean internal module boundaries — one module per domain concept, an explicit internal interface between modules, no reaching across boundaries to touch another module's data directly — and run the system as a single deployable unit until a real forcing function actually shows up. "Actually shows up" means one of the three motivations from Section 2 stops being hypothetical: team size and deploy-cadence mismatch produce a real, recurring coordination cost you can point to; a measured scaling divergence appears in the metrics from the previous paragraph; or a specific component needs a specific different runtime for a reason you can name. Splitting a module out into its own service once its boundary has proven itself stable inside the monolith is far cheaper and far less risky than splitting speculatively, because the internal interface that module already exposes to the rest of the codebase is very close to the network API that service will need to expose once it's external — the boundary work is mostly already done, and what's left is genuinely operational (deployment, discovery, its own datastore) rather than also being a redesign of what the boundary even is.

> **Signals worth writing down before splitting anything:**
>
> *   A specific, recent deploy that was blocked or delayed by an unrelated team's changes
> *   Measured (not assumed) divergence in load profile between two subsystems
> *   A named component with a concrete reason to run on a different runtime
> *   A module boundary that has held for months without needing to be redrawn

## 7\. Splitting one boundary, well and badly

Consider an e-commerce monolith with order management, inventory, and notifications living as three well-modularized internal modules. The team has grown, and the notifications module — email and SMS delivery for order confirmations, shipping updates, and marketing messages — has become a genuine bottleneck: it needs to scale independently because marketing campaigns create traffic spikes an order of magnitude above normal order volume, it has its own on-call rotation staffed by a distinct team, and its deploy cadence (frequent template and provider changes) has repeatedly been slowed down waiting for unrelated order-management releases to go out first. All three motivations from Section 2 are present and concrete, not hypothetical.

The good split extracts notifications along the boundary the module already has: order management publishes an `OrderConfirmed` event (via an outbox pattern, so the event publish is transactionally tied to the order commit rather than being a second, separately-failable write) and moves on immediately — it does not wait for a response and does not know or care how many notification channels exist. The notification service consumes that event asynchronously, owns its own delivery-status data, and can be redeployed, scaled, and put on its own on-call rotation without touching order management's release process at all. The internal interface the notifications module already exposed inside the monolith — "here is an event describing something that happened, act on it" — turns directly into its external contract; nothing about the shape of the boundary needed to change, only its transport.

```
# Good split — boundary matches the domain and the forcing function
order-service:
  owns: orders, payments state
  publishes: OrderConfirmed, OrderCancelled (via transactional outbox)
  never blocks on: notification delivery

notification-service:
  owns: delivery templates, delivery status, provider credentials
  consumes: OrderConfirmed, OrderCancelled
  scales independently for campaign traffic spikes
  deploys independently for template/provider changes
```

Now contrast that with a bad split of the same monolith, done because "the codebase is getting big" rather than because of a forcing function. The team draws a service boundary down the middle of the order-management module itself, putting order creation in one service and order fulfillment status in another, because that division roughly matches two sub-teams' current staffing — not because fulfillment status is conceptually independent of order creation. It isn't: every status transition needs to read and validate against the order's current state, so the fulfillment service ends up calling back into the order service synchronously on nearly every request, and a schema change to the order record now requires coordinating a deploy across both services because they were never really independent data owners to begin with. Shipping a single feature — say, adding a new order status — now means changing both services in lockstep, which is precisely the distributed- monolith failure from Section 5: every cost of the network boundary, none of the benefit of independent deployment.

```
# Bad split — boundary matches the org chart, not the domain
order-creation-service:
  owns: order records
  called synchronously by: order-fulfillment-service, on nearly every request

order-fulfillment-service:
  owns: status transitions
  requires: order-creation-service to be up and fast for every status check
  a new order status still requires coordinated deploys of both services
```

The difference between the two isn't sophistication — both splits use the same tools, the same infrastructure, the same deployment pipeline. The difference is that the good split follows a bounded context that already existed and proved itself stable inside the monolith, driven by a forcing function you could point to on a dashboard and a deploy calendar; the bad split follows a headcount division that has nothing to do with how the data actually depends on itself. The framework in Section 6 exists to make that distinction before the split happens, not after the on-call rotation discovers it the hard way.
