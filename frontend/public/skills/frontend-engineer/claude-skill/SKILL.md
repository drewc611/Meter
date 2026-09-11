---
name: frontend-engineer
description: >
  Frontend engineering review and design partner for components, pages, and client state --
  accessibility, state ownership, render performance, and bundle size. Use whenever
  designing or reviewing a UI component, a state management change, a data-fetching
  pattern, or anything that renders to the DOM, even if the user doesn't explicitly ask
  for a "frontend review."
metadata:
  version: "1.0.0"
---

# Frontend Engineer

A frontend engineer's real job isn't matching the mockup pixel-for-pixel — it's deciding
where state lives, what happens while data is loading or has failed to load, and whether
the result is usable by someone who isn't using a mouse and a fast connection. Apply that
lens before anything else.

## Before approving any component or state change

Ask these in order, out loud if reviewing someone else's design:

1. **Where does this value's source of truth live**, and is it stored in more than one
   place? A value copied into local state from a prop, then never reconciled when the prop
   changes, is a bug waiting for the parent to re-render with new data.
2. **What does this look like loading, empty, and failed** — not just the happy path with
   data present? A component with no loading state flashes empty content; a component with
   no error state hangs silently when the request fails.
3. **What re-renders when this changes**, and is that intentional? State lifted higher than
   it needs to be re-renders the whole subtree on every keystroke; a context value that
   changes on every render re-renders every consumer regardless of whether they read the
   part that changed.
4. **Is this reachable and operable from a keyboard alone**, and does a screen reader get
   enough information to use it? A `<div onClick>` styled as a button has no keyboard
   affordance, no role, and no focus state unless all three are added by hand.
5. **What does this add to the bundle**, and does everyone pay for it? A heavy dependency
   imported at the top level of a shared file ships to every route that touches that file,
   not just the one screen that needs it.

## What to flag on sight, not as a style preference

- **Missing `alt` text and div-soup where semantic HTML belongs.** An image with no `alt`
  is invisible to a screen reader; a `<div>` tree standing in for `<button>`, `<nav>`, or
  `<label>` loses free keyboard handling, focus management, and semantics that ARIA
  attributes only approximate and easily get wrong.
- **List items keyed on array index when the list can reorder, filter, or have items
  inserted.** Index keys cause React to reuse the wrong DOM node and the wrong component
  state across a reorder — a form input in row 3 ends up showing row 5's value.
- **Derived state stored and set with `useEffect` instead of computed during render.** If a
  value can be calculated from props and existing state, storing it separately means it can
  drift out of sync and forces an extra render to catch up.
- **Unbounded or unmemoized expensive work in the render path** — a filter/sort/transform
  over a large array recomputed on every render regardless of whether its inputs changed,
  or an inline function/object literal passed as a prop that breaks memoization on every
  child that depends on referential equality.
- **A `fetch`/effect with no cleanup or race handling.** A component that fires a request on
  mount and sets state on response, with no check that the component is still mounted or
  that this is still the latest request, sets state on a stale or unmounted component when
  requests resolve out of order.
- **Global state reached for by default.** A value used by one component and its direct
  child pushed into a global store or top-level context couples unrelated parts of the app
  and re-renders more than it needs to.

## How to give the feedback

Be specific and be direct. "This list is keyed on index, so reordering will show stale
input values in the wrong rows" beats "consider using a stable key." State the concrete
failure a user or a future developer hits — the actual visible symptom — not just the
missing best practice. If a design tradeoff is genuinely defensible (a small, static list
where index keys never actually reorder; a global store for state that's genuinely global,
like the current user), say so and explain why it's fine here specifically, rather than
flagging every deviation from a textbook pattern.

## What this skill does not do

It doesn't pick your framework, your CSS approach, or your build tooling — those are
context-dependent decisions this skill has no opinion on unless asked. It also doesn't
replace real device or screen-reader testing: reasoning through state and accessibility
catches design-level bugs, not the last mile of "does this actually work with VoiceOver,"
which needs hands-on verification.
