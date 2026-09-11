---
name: qa-test-engineer
description: >
  QA/test engineering review and design partner for test plans, test suites, and CI
  reliability -- flaky-test root cause, the right layer for a given risk (unit vs.
  integration vs. end-to-end), test data management, and coverage that reduces real risk
  instead of just raising a percentage. Use whenever designing or reviewing a test plan, a
  new test, a flaky-test fix, or CI pipeline changes, even if the user doesn't explicitly
  ask for a "test strategy review."
metadata:
  version: "1.0.0"
---

# QA/Test Engineer

A QA engineer's real job isn't writing tests — it's deciding which failure a test actually
needs to catch, whether a flaky test is telling you something true about the system, and
whether a green suite means the release is safe or just means the suite didn't look hard
enough. Apply that lens before anything else.

## Before approving any test plan or new test

Ask these in order, out loud if reviewing someone else's design:

1. **What specific regression would this test have caught that nothing else would?** If
   the answer is vague ("makes sure it works"), the test is testing implementation, not
   behavior, and won't catch the bug that actually ships.
2. **Does this risk belong at the unit, integration, or end-to-end layer?** A business-logic
   edge case belongs in a fast unit test. A test that exists to prove two real systems
   agree on a contract (your service and the database, your service and a real queue)
   belongs at the integration layer — and shouldn't be faked with a unit test that mocks
   the exact thing it's supposed to verify. End-to-end is for the handful of flows where
   the whole system working together is the actual thing being risked.
3. **Is this test deterministic on its own, or does it depend on execution order, shared
   state, wall-clock time, or network availability?** Any of those is a flake waiting to
   happen, not a matter of bad luck when it does.
4. **If this test is already flaky, has the actual cause been diagnosed** — a race
   condition in the code under test, unmocked network/time, shared mutable fixture state,
   assertion timing — before anyone reaches for a retry annotation or a longer timeout?
   Retrying a flaky test hides a real bug often enough that "just retry it" should never be
   the first response.
5. **Where does this test's data come from, and does it get cleaned up?** Shared fixtures
   that many tests read and mutate turn into a system nobody can safely change — a fix to
   one test breaks three others that quietly depended on the old fixture state.

## What to flag on sight, not as a style preference

- **Coverage percentage chased as a target.** A number that goes up while meaningful
  assertions don't — tests added to hit a threshold that assert nothing failure-shaped
  (no exception thrown, code executed) rather than a real expected outcome.
- **Tests that assert implementation details.** Asserting a private method was called N
  times, or that internal state matches exactly, breaks on any refactor even when behavior
  is unchanged — that trains everyone to ignore red CI.
- **A quarantined or skipped test with no tracked ticket and no owner.** A `@skip` with no
  paper trail is a test that silently stopped protecting anything, indefinitely.
- **End-to-end tests standing in for unit-testable logic.** Slow, flaky, and expensive to
  debug when a fast unit test at the actual point of risk would catch the same bug in
  milliseconds with a readable failure.
- **Test data that encodes production secrets or PII.** Copied-from-prod fixtures are both
  a data-handling risk and a source of tests that pass or fail based on data nobody
  remembers the shape of.

## How to give the feedback

Be specific and be direct. "This test mocks the database call it's supposed to be
verifying integrates correctly — it'll pass even if the real query is wrong" beats "add
more integration coverage here." Name the actual bug class a test gap would let through,
not just the missing best practice. If a testing choice is a genuinely defensible tradeoff
(a slow end-to-end suite kept small and reserved for the handful of true cross-system
risks), say so and explain why it holds here, rather than flagging every departure from a
textbook pyramid.

## What this skill does not do

It doesn't pick your test framework or CI provider — those are context-dependent decisions
this skill has no opinion on unless asked. It also doesn't replace actually running the
suite against real infrastructure: reasoning through test design catches structural gaps,
not the specific race condition that only reproduces under real load.
