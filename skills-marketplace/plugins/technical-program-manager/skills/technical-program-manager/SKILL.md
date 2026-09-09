---
name: technical-program-manager
description: >
  Technical program management review and design partner for cross-team dependency
  tracking, program plans, and status reports -- finding the integration point nobody
  owns, the estimate with no real buffer, and the "on track" status that's actually just
  an unescalated blocker. Use whenever reviewing a program plan, a dependency map, a
  status report, or a milestone definition, or when asked whether a program is actually
  on track, even if the user doesn't explicitly ask for a "TPM review."
metadata:
  version: "1.0.0"
---

# Technical Program Manager

A technical program manager's real job isn't running standups — it's finding the dependency
nobody owns before it becomes the reason the launch slips. Apply that lens before anything
else.

## Before trusting a program plan or a status report

1. **Does every cross-team dependency have a named owner and a date**, not just a team
   name in a column? "Platform team" is not an owner — a specific person who knows they
   own it, and a date they've agreed to, is. A dependency with neither is a commitment to
   nobody.
2. **Is the critical path actually drawn**, or assumed? If nobody can point to the
   specific chain of tasks that determines the launch date, the plan doesn't have a
   critical path yet — it has a task list with a date attached to it.
3. **Where is the buffer, and how was it placed?** Buffer added once at the end of the
   whole plan gets consumed by the first slip and never seen again. Buffer distributed
   against the specific steps with the most uncertainty (a new integration, a
   dependency on a team outside your reporting line) actually protects the date.
4. **Is a "blocked" status under active escalation, or just stated?** A blocker that's
   been in the same state for two status updates in a row with no named escalation owner
   and no next check-in date isn't blocked, it's stalled — and stalled looks identical to
   blocked in a status doc unless you ask.
5. **What does the milestone actually verify?** "Code complete" verifies that code was
   written, not that it works against the other team's code, real data, or production
   config. A milestone should specify what was actually tested, by whom, against what.

## How a program actually slips — the specific mechanisms, not "poor communication"

- **An unowned integration point.** Team A finishes their side, Team B finishes theirs,
  and the point where they connect was never anyone's explicit deliverable — it surfaces
  as a surprise at integration time instead of a planned step.
- **Optimistic estimates with no distributed buffer.** Every individual estimate assumes
  the best case, and the plan has no slack anywhere to absorb the first thing that takes
  longer than planned — which is not a possibility, it's a near-certainty on any program
  with more than a few steps.
- **A resource double-booked across two "top priority" programs.** Both program plans
  show the same senior engineer at full allocation. One of the two plans is wrong, and
  nobody has said which.
- **A dependency on a team outside the reporting line with no formal ask.** "We're
  assuming the data team will have this ready" without a ticket, a date, or a
  confirmation from that team is a hope, not a dependency being tracked.
- **A milestone that only gets tested at the end.** Integration risk that could have
  surfaced in week 2 instead surfaces in week 8, when there's no time left to absorb it.

## What to flag on sight, not as a style preference

- **Single-threaded ownership on the critical path** — one person with no backup, whose
  vacation or departure stops the program, and nobody has named who covers for them.
- **A status report that's been "on track" for months with no risks ever listed.** Real
  programs have risks. The absence of any listed risk is itself a signal the report isn't
  being written honestly, not that the program has none.
- **A date that moved without anyone updating the plan that depends on it.** If an
  upstream team's date slipped and the downstream plan still shows the old date, that
  downstream plan is already wrong and nobody has said so yet.
- **Dependency tracking that lives only in a person's head or a Slack thread**, not in
  anything the next person reviewing the program could find and verify.

## How to give the feedback

Name the mechanism, not the symptom. "This will slip because the auth-migration
integration point has no owner on either team's plan, and neither team's estimate
accounts for the other's timeline" beats "there's some risk here." When a status is
genuinely green, say what would have to happen for it to stop being green, so the report
reads as a real assessment rather than a rubber stamp.

## What this skill does not do

It doesn't replace the actual cross-team conversations that resolve a real blocker — it
surfaces which conversations need to happen and with whom. It also doesn't estimate
engineering work itself; it checks whether an estimate has the properties a trustworthy
one needs (a stated basis, distributed buffer), not whether the number is right.
