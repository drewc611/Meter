---
title: 'Choosing a cloud provider: a decision framework'
description: >-
  A decision framework for choosing a cloud provider based on what a specific
  workload and team actually need, rather than which provider is generically
  'best.'
kicker: Guide · infrastructure architecture
lead: >-
  Our companion guide, Cloud providers compared, lays out what the major
  providers actually are and what each one is generally used for. This guide is
  about a different question: given that landscape, how does a specific team
  actually decide? Not which provider wins in the abstract — there isn't a
  stable answer to that — but which one fits a specific workload, a specific
  team, and a specific set of constraints, and how to work through that decision
  without either overthinking it or treating it as a coin flip.
wide: true
tileMeta: 'A decision framework — the real inputs, and the switching-cost trap'
---
## 1\. The wrong first question

"Which cloud provider is the best" is the question most teams start with, and it's the wrong one — not because it's unanswerable in some philosophical sense, but because it skips the step that actually determines the answer. A provider is "best" only relative to a workload's requirements and a team's constraints, and both of those vary enough between organizations that the honest answer to "which is best" is always "it depends," which isn't useful without the follow-up question that fills in what it depends on.

The right first question is narrower and less satisfying to ask at a conference talk: "what does this specific workload and this specific team actually need?" That question doesn't have a universal answer either, but it has a _knowable_ one — you can go find out what your workload needs and what your team already knows, in a way you can't go find out which cloud is objectively best, because no such fact exists to find. The rest of this guide is a way of actually answering that narrower question.

## 2\. The real decision checklist

Four inputs cover most of what actually matters. None of them are exotic, and that's the point — the mistake most teams make isn't missing some clever hidden factor, it's skipping one of these four because it seems obvious enough to answer from memory rather than actually checking.

**What specific managed services does the workload need — and is a candidate provider's version of that service mature, or a bolted-on afterthought?** Providers frequently offer a service in name that doesn't yet match a competitor's version in operational maturity, feature completeness, or documentation depth. "Provider X has a managed Kubernetes offering" and "provider X's managed Kubernetes offering is as mature as provider Y's" are different claims, and only the second one is useful for a decision. Check release notes, support forums, and how recently the service launched — a service that shipped eighteen months ago is a different bet than one that's been hardened for a decade, even if the marketing page reads the same.

**What compliance or data-residency requirements are actually non-negotiable, and which providers genuinely satisfy them?** Distinguish requirements that are truly fixed (a regulator requires data to physically remain in a specific jurisdiction; a customer contract requires a specific certification) from ones that are merely preferred. Fixed requirements can eliminate providers outright before any other factor is weighed — that's useful, because it shrinks the decision rather than complicating it. Preferences that get treated as fixed requirements, on the other hand, needlessly narrow the field.

**What does the team already know?** This is the input most often skipped because it feels like it shouldn't matter as much as it does — surely the "right" technical choice should win regardless of who already knows what. In practice, switching cloud providers means retraining an entire team on a new console, a new CLI, a new IAM and permissions model, and a new set of operational quirks and failure modes that only show up with experience. That retraining cost is real, it's ongoing rather than one-time (new hires keep needing it), and it's genuinely invisible on a feature-comparison spec sheet — which is exactly why it's the input most likely to be underweighted in a decision made by comparing spec sheets.

**What does realistic cost look like for the actual traffic pattern — not a vendor's best-case example?** Published pricing examples are generally built around a workload shape that flatters the provider publishing them. A workload's actual cost depends on its actual read/write ratio, its actual data-transfer pattern (including transfer _out_of the provider, which is the cost most commonly left out of a rough estimate), and its actual peak-versus-average load — none of which shows up in a vendor's generic pricing calculator unless it's specifically built to model them. Model the workload's real shape before comparing headline numbers.

> **Common mistake:** running the checklist once, informally, in a kickoff meeting.
>
> Each of the four inputs above is a question with an actual, checkable answer — not a gut-check to poll the room on. "Does anyone know if their managed Postgres offering is any good" produces a different, weaker answer than actually reading that provider's documentation and support history for the specific engine version the workload needs. The checklist is only as useful as the effort put into answering each item honestly.

## 3\. The switching-cost trap

The four inputs above assume a decision made with a relatively clean slate. In practice, the decision that matters most is often not the first one but whatever happens after a team has already meaningfully committed to a provider's deeper, more proprietary managed services — a proprietary database engine, a provider-specific serverless platform, a provider-specific identity and access system wired into everything else. At that point, migrating away is no longer a matter of redeploying code somewhere else; it's rebuilding the parts of the application that were written specifically to that provider's model, which can be expensive enough to make "just switch" impractical even when a competitor is genuinely better suited to the workload today.

This is the trap: the initial decision is usually made under time pressure, evaluated mostly on short-term convenience — how quickly can we get something running, what introductory pricing or credits are on offer — and the long-term lock-in cost of that decision doesn't show up as a line item anywhere until years later, when a team discovers it's more expensive to leave than it was to arrive. That asymmetry is exactly why the original choice deserves more weight than teams initially tend to give it — not because every decision needs a six-month evaluation process, but because the true cost of the decision includes a cost that won't be visible until well after the decision is made.

It's worth being precise about what actually creates the lock-in, because it isn't simply "using a cloud provider" — it's depth of dependency on that provider's proprietary layer specifically. A workload running ordinary virtual machines, a standard database engine, and object storage through a provider's basic APIs is comparatively easy to move, because those are close to commodity capabilities available in similar form elsewhere. The same workload rebuilt around a provider's proprietary event-driven serverless model, its proprietary database with a query dialect no other engine speaks, and its identity system wired into every service boundary is a fundamentally harder thing to move, even though both started as "just a cloud deployment." Lock-in is a spectrum determined by which specific services got adopted, not a binary switch that flips the moment a provider is chosen.

## 4\. Start simple, keep options open

The practical middle path, especially early in a project when the workload's actual needs are still uncertain, is to lean on more portable technology choices even when a provider-specific alternative looks more convenient in the moment: containers instead of a deeply proprietary serverless platform, standard SQL against a widely supported database engine instead of a provider's proprietary database dialect, infrastructure defined in a provider-agnostic tool rather than a provider-specific configuration format wherever a genuinely equivalent option exists.

```
Less portable                          More portable
─────────────────────────────────────────────────────────────────
Provider-specific serverless function   A container running the same code,
format, tightly coupled to one          deployable to any container-
provider's event and deployment model   orchestration platform

Proprietary database dialect with       Standard SQL against a widely
provider-only extensions baked          supported engine (PostgreSQL,
into application queries                MySQL) available on most providers

Infrastructure defined only in a        Infrastructure defined in a
provider's own configuration            provider-agnostic tool that
language or console clicks              targets multiple providers
```

This is a real tradeoff, not a free win, and it's worth being honest about that rather than pretending portability comes at no cost. A container is generally more work to operate well than a fully managed serverless platform tuned specifically for that provider; standard SQL sometimes means giving up a proprietary feature that would have made one specific query meaningfully easier. The case for leaning portable early isn't that it's free — it's that the workload's real requirements are still unclear early on, so paying a modest velocity cost up front to preserve the option of moving later is often a better bet than locking in fast and finding out afterward that a proprietary dependency no longer fits. And it's worth saying plainly: fully avoiding lock-in is not realistically achievable at zero cost. The goal is a deliberate tradeoff, not an absolute.

## 5\. Two worked examples

**Scenario one: a small team building a straightforward CRUD web application.** The workload is a conventional web app — a relational database, an application server, object storage for uploads, no exotic managed-service dependencies. The team is small, has no dedicated infrastructure specialist, and needs to ship quickly. Here, the checklist points toward simplicity: a developer-focused, simplicity-first provider (or a hyperscaler used narrowly, sticking to its more commodity services rather than its deeper catalog) fits better than a hyperscaler's full breadth, which this workload has no real use for and would only pay for in complexity. Team familiarity and time-to-first-deploy dominate the decision; there's no compliance requirement forcing a specific region, and no managed service so specialized that only one provider offers a mature version of it.

**Scenario two: a team building a workload with specific advanced managed-service dependencies.** Say the workload genuinely needs a specific machine-learning training and serving pipeline, or a specific data-warehousing and analytics stack at real scale. Here the calculus flips: the "which specific managed services does this need, and which provider has a mature version" question dominates, and it may point decisively toward one hyperscaler over the others regardless of which one the team already knows better, because the retraining cost of learning a new provider is smaller than the cost of running a core dependency on an immature or absent version of the service elsewhere. Team familiarity still matters, but it's outweighed by a genuine, specific technical requirement in a way it wasn't in scenario one.

**A third, messier scenario** is worth naming because it's arguably the most common one in practice: a team that started as scenario one and, over time, is turning into scenario two. The CRUD app that shipped fast on a simple provider now has a product team asking for real analytics on user behavior, and a machine-learning feature is on the roadmap. This isn't a moment to panic-migrate everything at once, and it isn't a moment to ignore the shift either. It's exactly where section 3's switching-cost logic and section 4's portability logic earn their keep: if the original build leaned on reasonably portable choices, adding a second provider narrowly for the new analytics or ML need — the "one cloud plus satellites" pattern described in our [multi-cloud and hybrid cloud guide](/cloud-architecture/multi-cloud-and-hybrid-cloud-architecture) — is usually more realistic than a full migration, and often more realistic than forcing the new need onto a provider chosen for a different job entirely.

Neither scenario has a universally correct provider — they have a correct provider _for that scenario_, arrived at by actually running the checklist rather than defaulting to whichever provider is most talked about. That's the entire method: the same four inputs, applied honestly to the actual workload in front of you, will point in different directions for different workloads, and that's a feature of the framework, not a failure to produce a single universal answer.

## 6\. Revisiting the decision

The last piece of the discipline is the one most easily forgotten once a provider is chosen and the initial project ships: a cloud provider decision is not permanent just because it's expensive to change. Treating the original choice as settled and unquestionable is different from treating it as durable-but-reviewable, and the difference matters as a workload's actual needs evolve — a workload that started as a simple CRUD app can grow into one with real data-and-analytics needs, at which point the provider that fit scenario one above may no longer fit what the workload has become.

Revisiting the decision periodically doesn't mean migrating providers on a schedule — for most workloads, the switching cost discussed in section 3 means staying put is usually still correct even after a periodic review. It means deliberately re-asking the section 2 checklist against the workload's current, not original, requirements, on some recurring cadence, so that a provider fit that quietly stopped making sense gets noticed by a decision rather than by an incident. That habit — checking the fit on purpose, rather than only when something breaks — is itself part of running infrastructure well, and it's the same habit this framework is built around applying in the first place.

> Framework recap
>
> *   Start from the workload's actual needs, not a generic ranking of providers
> *   Run all four checklist inputs honestly, and check them, don't poll for them
> *   Weight the checklist by which factor carries the most risk if it's wrong
> *   Favor portable choices early, while the workload's real needs are still unclear
> *   Treat deep lock-in as a real, ongoing cost of a decision, not a one-time event
> *   Revisit the fit on a schedule — durable is not the same as permanent

For what the providers themselves actually are before you run this checklist against them, start with [Cloud providers compared](/cloud-architecture/cloud-providers-compared).
