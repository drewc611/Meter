---
title: 'API gateway and service mesh architecture'
description: >-
  Why a gateway and a mesh solve different traffic problems — north-south
  versus east-west — and why running both, or neither, is often the correct
  answer rather than a compromise.
kicker: Guide · cloud architecture
lead: >-
  "Gateway" and "mesh" get treated as competing products in a lot of
  procurement conversations, and that framing obscures the actual
  architecture question, which is about direction of traffic, not brand.
  A gateway manages traffic entering a system from outside it. A mesh manages
  traffic between the services already inside it. Most real systems that
  outgrow a plain load balancer eventually need something like both, for two
  genuinely different reasons.
wide: true
tileMeta: 'North-south versus east-west traffic, and the sidecar tradeoff a mesh actually costs'
---
## 1\. North-south versus east-south traffic

North-south traffic is the traffic crossing a system's outer boundary: a client on the internet calling an API. East-west traffic is the traffic between services already inside that boundary: the checkout service calling the inventory service, which calls the pricing service. These are genuinely different problems. North-south traffic is comparatively low in volume relative to the total request graph, arrives from untrusted clients, and needs a single, well-defined entry point where authentication and rate limiting can be enforced once. East-west traffic is comparatively high in volume, since a single external request commonly fans out into several internal calls, originates from services that are, at least nominally, already inside the trust boundary, and the problems that matter for it are less about keeping strangers out and more about one internal service's slowness or failure not silently cascading into every other service that calls it.

## 2\. What an API gateway actually does

A gateway sits at the system's edge and is the single place external traffic authenticates, gets rate limited, and gets routed to whichever internal service actually owns the requested endpoint. Centralizing this at one layer means an individual internal service doesn't need to reimplement authentication or throttling itself, and a policy change, a new rate limit tier, a revoked API key, takes effect in one place instead of needing to be pushed out to every service that happens to expose a public endpoint. A gateway is also commonly where protocol translation happens: accepting a REST or GraphQL request at the edge and dispatching it as an internal gRPC call, or aggregating several internal calls into the single response shape an external client actually wants, sparing external clients from having to know anything about the internal service topology behind the gateway.

## 3\. What a service mesh actually does

A mesh addresses the east-west problem: reliability and observability for calls between services that already trust each other, at a volume and a failure-mode profile a gateway sitting at the edge never sees, because the gateway is only in the path for the first hop of a request, not the four internal hops that request might trigger afterward. The mesh's standard feature set: mutual TLS between services so every internal call is authenticated and encrypted without each service implementing that itself, automatic retries with backoff for calls to a service that's transiently failing, circuit breaking that stops sending traffic to a downstream service that's clearly unhealthy rather than piling more failing requests onto it, and consistent tracing and metrics emitted for every internal call regardless of which team wrote which service.

The mechanism that makes this possible without every service implementing it independently is the sidecar: a small proxy deployed alongside each service instance (in Kubernetes, as a second container in the same pod) that transparently intercepts all inbound and outbound traffic for that service, applying the mesh's policies at the network layer instead of inside the service's own code. This is what lets mesh features apply uniformly across services written in different languages by different teams: the policy lives in the proxy, not in a library every service has to import and keep updated.

## 4\. Where they overlap, and where the line actually is

Both a gateway and a mesh do routing, both can enforce policy, and both produce telemetry, which is why they get pitched as substitutes for each other. The line that actually matters is scope and trust boundary, not feature checklist: a gateway's job is complete once a request has been authenticated and routed to the right service at the edge; a mesh's job starts there and continues for every subsequent internal hop that request triggers, none of which the gateway is in the path for at all. A gateway with no mesh behind it has no visibility into, and no ability to retry or circuit-break, a failure three internal hops deep in a call chain it was never part of past the first one. A mesh with no gateway in front of it has no natural, centralized place to authenticate an external client before that client's request reaches any internal service at all.

## 5\. The sidecar tradeoff

A mesh's sidecar-per-instance model is not free, and the cost is worth stating plainly rather than treating the mesh as a strictly positive addition. Every service instance now runs an extra proxy process, consuming its own CPU and memory, and every internal call now makes two additional network hops, through the calling service's sidecar and the receiving service's sidecar, that didn't exist in a direct service-to-service call. At high request volumes and with many services, that overhead is a real, measurable tax, not a rounding error, and it's paid on every single internal call whether or not that particular call needed retries, circuit breaking, or mTLS enforced on it that request.

Operationally, a mesh is also a genuinely complex system to run well: certificate rotation for mTLS across every service instance, a control plane that has to stay healthy for the mesh's policies to apply consistently, and a debugging surface that now includes "is this failure the service's own logic, or a mesh policy intercepting the call" as a real, recurring question during incidents. None of this is a reason to avoid a mesh where it's actually solving a real problem; it's a reason not to adopt one because the term shows up on an architecture diagram template, before the service count and the failure-mode pain that a mesh exists to fix are actually present.

## 6\. When you need neither

A system with a handful of services, modest internal call volume, and a request graph simple enough that a failure in one service's downstream call is easy to reason about without dedicated tracing and circuit-breaking infrastructure doesn't need a mesh: a well-designed HTTP client with its own retry and timeout logic, applied consistently by convention or a shared library, covers the same ground at a fraction of the operational cost, because the actual problem, an occasional transient failure between two or three services, doesn't require infrastructure built for coordinating reliability policy across dozens of independently deployed services. A system with no public-facing API at all, an internal batch pipeline with no external clients, similarly has no real use for a gateway, since there's no untrusted edge traffic for it to sit in front of.

The honest sequencing is to add a gateway when there's a real edge to protect and centralize policy for, and a mesh when the number of services and the volume of internal calls between them has grown to the point where per-service retry logic and ad hoc tracing genuinely stop being manageable, not on a schedule set by how mature an architecture diagram is supposed to look.

## 7\. Worked example: two different problems, two different fixes

A team's checkout flow starts failing intermittently in a way that's hard to diagnose: the external checkout endpoint returns errors at an elevated but not constant rate, and the on-call engineer can't tell, from the gateway's logs alone, whether the failure originates in the checkout service itself or somewhere further downstream. Adding a mesh gives every internal hop, checkout to inventory, inventory to the warehouse system, its own trace span and its own circuit breaker, and the next incident shows clearly that the warehouse system was intermittently timing out, and that inventory's calls to it were retrying without backoff, amplifying load onto an already struggling downstream service. That's an east-west reliability problem, and it's exactly what a mesh is for.

Separately, the same team wants to let a small number of partner companies call a subset of their API directly, each with its own rate limit and its own API key, without every internal service having to implement key validation and throttling itself. That's a north-south problem: a gateway in front of the whole system, authenticating each partner's key once at the edge and applying that partner's specific rate limit before the request ever reaches an internal service, solves it directly, and a mesh sitting between internal services would have contributed nothing to this particular problem, because no external partner ever calls an internal service directly.

This pairs with [microservices vs. monolith](/cloud-architecture/microservices-vs-monolith) for whether a system's service count actually justifies either piece of infrastructure in the first place, and with [container orchestration: Kubernetes architecture fundamentals](/cloud-architecture/container-orchestration-kubernetes-architecture) for the sidecar mechanism a mesh is typically built on.
