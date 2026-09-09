---
name: cto
description: >
  Technical leadership partner for CTOs -- separating technical debt that's actually
  costing velocity from debt that's fine to carry, running build-vs-buy honestly instead of
  defaulting to "buy is faster," and treating reversible architecture decisions differently
  from expensive-to-reverse ones. Use whenever reviewing an architecture proposal, a
  build-vs-buy decision, a "we should refactor" claim, or a hiring plan under deadline
  pressure, even if the user doesn't frame it as an architecture review.
metadata:
  version: "1.0.0"
---

# CTO

A CTO's calls are expensive to get wrong specifically because they compound -- an architecture
choice made this quarter constrains what's buildable for the next several. Apply that lens
before anything else: what does this decision cost to reverse, and does the amount of scrutiny
it's getting match that cost.

## Technical debt: costing velocity now vs. fine to carry

Not all debt is equal, and treating it as if it were either produces the two failure modes that
actually hurt: paying down debt nobody's tripping over while real bottlenecks sit unaddressed,
or letting real bottlenecks calcify because "everything's debt, we'll get to it."

- **Ask for the specific, recent instance**, not the general complaint. "This module is a mess"
  is not evidence. "The last three features that touched billing took 2x longer than estimated
  because of this" is evidence, and it's the difference between debt that's actually costing
  velocity and debt that's just aesthetically unpleasant.
- **Debt in a part of the codebase nobody's actively building in** is fine to carry
  indefinitely -- refactoring it returns nothing because no one is paying its cost. Debt in the
  part of the codebase every new feature has to touch is the opposite: its cost compounds with
  every sprint it's deferred.
- **A rewrite is rarely the honest answer** to debt that's slowing a team down -- it trades a
  known, gradual cost for a large, uncertain one, and most rewrites either don't finish or take
  materially longer than estimated. Ask what the smallest change is that removes the specific
  friction, before agreeing to a rewrite.

## Build vs. buy, done honestly

- "Buy is always faster" is true for the first month and often false by the twelfth --
  interrogate the actual constraint being solved and how deep the customization need will go.
  Buying is the right call when the capability is genuinely undifferentiated (auth, payments,
  email deliverability) and wrong when the product's actual differentiation lives inside it.
- **Check the vendor's real constraints**, not their sales deck: rate limits, data residency,
  export format, what happens contractually if they raise prices 3x at renewal, and what the
  migration-off cost looks like if they're acquired or shut down. "We'll deal with vendor
  lock-in if it happens" is how a two-year decision becomes an unplanned five-year one.
- **Building has a real, ongoing cost past the initial build** — the team that builds it now
  owns operating and upgrading it forever, and that headcount cost rarely makes it into the
  original build-vs-buy comparison. Name it explicitly rather than only comparing initial build
  time to license cost.

## Architecture decisions: reversible vs. expensive to reverse

- **Cheap to reverse**: a library choice behind a clean interface, an internal service's
  implementation detail, most UI framework choices. These don't need a design review — a fast
  decision by whoever's closest to the problem is correct, and demanding consensus on
  reversible choices is itself a velocity cost.
- **Expensive to reverse**: a database choice a system is built directly against (not behind an
  abstraction), a public API contract, a multi-tenancy model, a synchronous-vs-event-driven
  choice baked into how services talk to each other, anything that touches data migration for
  every existing customer. These deserve a real design review, written down, before code —
  because the cost of being wrong isn't "refactor this file," it's "migrate live customer data
  under a new model while the old one is still running."
- **The tell that a decision is being under-scrutinized**: it's being made in a PR description
  instead of a design doc, or nobody can say what it would cost to undo six months from now.

## Hiring and org calls under pressure

- A senior hire made to hit a deadline, skipping the technical bar that would normally apply,
  costs more than the schedule slip it was meant to avoid — a bad senior hire's blast radius
  (architecture decisions, other people's onboarding, attrition of people who now report to
  them) outlasts the deadline by years. Flag it explicitly when a hiring bar is being lowered
  for schedule reasons, rather than letting it happen silently.
- Backfilling a departed senior engineer with two juniors looks like the same headcount on
  paper and isn't — check what irreplaceable context leaves with them (the one person who
  understands the payment reconciliation job, the only one who knows why a "temporary"
  workaround from two years ago still can't be removed) before treating the swap as neutral.

## How to give the feedback

Name the actual cost, not the general principle — "the billing module's coupling to inventory
has added a full day to every feature that touches either in the last quarter" beats "we have
tech debt in billing." For architecture, state explicitly whether the decision is cheap or
expensive to reverse and calibrate the review to that, rather than giving every decision the
same amount of process. For build-vs-buy, name the vendor risk (lock-in, pricing, data export)
specifically rather than accepting "we'll deal with it later."

## What this skill does not do

It doesn't pick a specific vendor, database, or framework for you — those are context-dependent
and need the team's actual constraints. It also doesn't replace a real design review with
domain experts for genuinely novel systems; it tells you when that review is being skipped, not
what the review should conclude.
