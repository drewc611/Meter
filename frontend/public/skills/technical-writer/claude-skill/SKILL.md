---
name: technical-writer
description: >
  Documentation review and drafting partner -- catches docs that are accurate but useless
  because they describe the implementation instead of the reader's task, closes the gap
  between "we wrote docs" and someone actually being able to follow them, and flags docs
  that will silently rot the moment the underlying thing changes. Use whenever drafting or
  reviewing a README, API reference, runbook, onboarding guide, or any doc meant to let
  someone else do something, even if the user just asks for "docs" without framing it as a
  review.
metadata:
  version: "1.0.0"
---

# Technical Writer

A doc's job is to get a reader from "I need to do X" to "I did X," not to accurately describe
how the system works. Those two things overlap but aren't the same, and most bad documentation
is bad because it optimized for the second and assumed the first would follow. Apply that
distinction before anything else.

## Task-oriented vs. implementation-oriented

- **What is the reader trying to accomplish, and does the doc say so in the first two
  sentences?** A doc that opens by explaining the system's architecture before stating what the
  reader will be able to do at the end has the structure backwards — state the outcome first,
  then the steps, then the internals for whoever wants them.
- **Is the doc organized around the reader's task or around the codebase's structure?** A page
  that walks through every config option in the order they appear in the source file, instead
  of in the order a reader would need them for the task at hand, is organized for the person who
  wrote the code, not the person trying to use it.
- **Does it state the prerequisite, or assume it?** "Configure the webhook" assumes the reader
  already has an endpoint to point it at, already knows what payload shape to expect, and
  already has the right permission level — if any of those isn't obviously already true for
  this doc's actual audience, it needs to be stated, not assumed.
- **Does it state what "done" looks like?** A setup doc that ends at "run the command" without
  saying what successful output looks like leaves the reader unable to tell whether it worked —
  that's the difference between a doc that's technically complete and one that's actually
  usable.

## "We wrote docs" vs. "someone can follow them"

- **Has every code example actually been run**, not just read for correctness? A copy-pasted
  example with a stale import, a renamed parameter, or a placeholder that looks like it should
  work but doesn't is worse than no example — it costs the reader more time than writing the
  code themselves would have, and it erodes trust in every other example on the page.
- **Does the doc match what a first-time reader, not the author, would actually need?** The
  person who wrote the doc already knows the mental model, the gotchas, and which step is easy
  to skip by accident — which is exactly why they're the worst-positioned person to judge
  whether the doc is followable. A doc that's never been read by someone unfamiliar with the
  system before publishing is documentation reviewed only by the person guaranteed to fill in
  every gap unconsciously.
- **Is "it's documented" being used as a substitute for "it's usable"?** These get conflated
  under deadline pressure — a page existing at a URL is not the same claim as a new team member
  being able to follow it unassisted. If nobody's actually watched a newcomer try to follow it,
  "documented" is an unverified claim, not a fact.

## Keeping docs from rotting

- **What triggers this doc being updated, concretely?** If the honest answer is "someone
  remembers to," it will drift the first time the underlying thing changes and nobody remembers.
  A doc tied to a specific point in a release process, a PR template checkbox, or a code owner
  review has a real trigger; a doc that relies on goodwill doesn't.
- **Does the doc state a version, a last-verified date, or neither?** A doc with neither looks
  equally authoritative whether it's current or two years stale — a visible "last verified
  against vX.Y" turns a silent failure (reader trusts a wrong doc) into a visible one (reader
  can see it might be stale and check).
- **Is the doc close to the code it describes, or in a separate system that drifts by
  construction?** A docstring or a README next to the code it documents gets seen by whoever's
  editing that code. A wiki page in an entirely separate tool has no natural trigger to be
  touched when the code changes, and rots faster for it.

## What to flag on sight, not as a style preference

- **A doc that lists every option with no default or recommendation** — "you can configure this
  three ways" without saying which one to pick leaves the reader doing the evaluation work the
  doc should have already done.
- **A code example with no visible output or expected result.**
- **A doc whose only prerequisite statement is "basic familiarity with X"** — vague enough to be
  useless; state the actual specific thing the reader needs to already know or have set up.
- **Passive-voice instructions that hide who does what** ("the config should be updated" — by
  whom? when?) in a step-by-step doc, where the ambiguity directly costs the reader time.

## How to give the feedback

Name the specific point where a reader following the doc for the first time would get stuck —
"a reader who hasn't already read the architecture doc won't know what `tenant_id` refers to
here" beats "this could be clearer." When a doc is accurate but task-inverted, say so plainly
and suggest the concrete reorder, not just "consider restructuring."

## What this skill does not do

It doesn't verify technical accuracy of claims about a system it can't inspect — that still
needs a subject-matter reviewer. It also doesn't replace real usability testing with an actual
unfamiliar reader; it catches the structural and task-orientation problems a fresh pair of eyes
would also catch, but it isn't a substitute for having one.
