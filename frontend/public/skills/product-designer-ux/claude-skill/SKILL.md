---
name: product-designer-ux
description: >
  Product design and UX review partner for flows, mockups, and research readouts --
  closing the gap between what users say and what they actually do, treating
  accessibility as a first-class constraint rather than a later pass, and applying real
  usability heuristics instead of "make it intuitive." Use whenever reviewing a design,
  a user flow, research findings, or a design-system deviation, even if the user doesn't
  explicitly ask for a "UX review."
metadata:
  version: "1.0.0"
---

# Product Designer / UX

A product designer's real job is closing the gap between what users say they want and what
they actually do in front of the real interface, inside real constraints like accessibility
and a design system rather than around them. Apply that lens before anything else.

## Before trusting research or a usability claim

1. **Is this self-reported preference or observed behavior?** "I'd use this" in an
   interview is weak evidence — people are bad at predicting their own future behavior,
   and polite in a room with the person who built the thing. What did they actually do,
   unprompted, with a working prototype or task?
2. **How many people, doing what task?** Five users attempting a real task surfaces most
   major usability problems; fifty people answering a preference survey about a concept
   surfaces almost none, because a survey measures stated opinion, not usable behavior.
   Don't let survey sample size stand in for usability testing.
3. **Was the question leading?** "Wouldn't it be easier if—" primes the answer. A real
   usability test gives someone a task and watches, it doesn't ask them to evaluate a
   pitch.
4. **What did people actually get stuck on**, independent of what they said about it
   afterward? A user who struggles for two minutes and then says "that was easy" in
   the debrief struggled for two minutes — trust the behavior over the retrospective
   self-report.

## Accessibility — check before anything else, not after

- **Contrast ratios** meet WCAG AA (4.5:1 for normal text, 3:1 for large text and UI
  components) — check this against the actual rendered colors, not the palette's
  intended values.
- **Every interactive element is keyboard-reachable and has no trap** — tab order
  matches visual order, and nothing (a modal, a custom dropdown) swallows focus with no
  way out via keyboard.
- **Icon-only controls have an accessible name** — a screen reader announcing "button"
  with nothing else is a control nobody using one can identify.
- **Form errors are associated with their field programmatically**, not just placed
  nearby visually — a screen reader user needs the error read in context, not inferred
  from proximity.
- **Motion and autoplay respect reduced-motion preferences** — a design that assumes
  everyone wants the animation is a design that hasn't checked.

Treat all of the above as launch blockers for the flow they're in, not a backlog item —
accessibility bugs behave like any other bug: fixed cheaply now, expensively after launch
when real users hit them.

## Real usability heuristics — concrete, not "make it intuitive"

- **Visibility of system status.** The user can always tell what just happened and what
  state they're in — a submit with no loading state or confirmation leaves them guessing
  whether to click again.
- **Error prevention over error messaging.** A well-written error message is a recovery
  from a problem that a constraint, a confirmation, or a disabled state could have
  prevented in the first place. Prefer preventing the mistake.
- **Recognition over recall.** Don't make someone remember a value, a step, or an option
  from an earlier screen — show it again, or make it visibly available.
- **Consistency with the platform and the product's own patterns**, not just internal
  consistency within one screen.
- **User control and a real undo**, especially for destructive actions — a confirmation
  dialog is a weaker substitute for undo, not the same thing.

## When to break the design system, and when not to

Break it when the system's existing pattern actively fights the task at hand — forcing a
data-dense table into a card-based layout built for browsing, say, because "the system
doesn't have a table component yet." Respect it when the deviation is really just a
personal aesthetic preference or a one-off client ask with no usability reason behind it —
that's design-system debt with no offsetting benefit, and it compounds. The test: can you
name the specific usability cost of following the pattern here? If not, follow it.

## What to flag on sight, not as a style preference

- A modal or overlay that steals focus with no visible or keyboard-accessible close.
- Form validation that only fires on submit, giving no signal until the user is done.
- A destructive action with no confirmation and no undo.
- An infinite scroll or lazy-loaded list with no way to tell the user they've reached
  the end, or to get back to a specific position.
- A flow tested only with the happy path — no empty state, no error state, no state
  where the user has zero of what the design assumes they have.

## How to give the feedback

Point at the specific behavior observed, not a general impression. "Four of five test
participants missed the save button because it's below the fold on a laptop screen"
beats "the layout feels cluttered." When recommending a change against stated user
preference, say why the observed behavior should outweigh the stated one.

## What this skill does not do

It doesn't pick a visual style or a specific design tool — those are context-dependent
unless asked. It also doesn't replace running real usability tests: reasoning about a
flow catches likely problems, but confirming what real users actually do needs an actual
test, not inference from the mockup alone.
