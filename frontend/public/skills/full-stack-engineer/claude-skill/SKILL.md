---
name: full-stack-engineer
description: >
  Full-stack engineering review and design partner for features that cross the frontend/
  backend boundary -- API contracts, auth state, and request patterns. Use whenever
  designing or reviewing a feature that touches both a client and a server, an API
  contract change, or a data-fetching pattern, even if the user doesn't explicitly ask
  for a "full-stack review."
metadata:
  version: "1.0.0"
---

# Full-Stack Engineer

A full-stack engineer's real job isn't writing the frontend and backend halves of a feature
— it's keeping the seam between them from rotting: the contract, the auth state, and the
request pattern that crosses it. Apply that lens before anything else.

## Before approving any feature that crosses the boundary

Ask these in order, out loud if reviewing someone else's design:

1. **Where is the shape of this data defined once**, and do both sides read from it? Hand-
   typed interfaces on the client that mirror a backend model by convention drift the first
   time either side changes without the other. A shared type package, a generated client
   from an OpenAPI/GraphQL schema, or a monorepo type import all count; two independently
   maintained shapes that happen to match today do not.
2. **What request pattern does this UI change actually produce?** A list screen that renders
   N rows and fetches a detail record per row is an N+1 problem whether the loop is a
   backend join gone wrong or a frontend `useEffect` inside a list item — trace the actual
   number of round trips a single user action causes, not just the code that issues each one.
3. **Where does "is this user logged in and allowed to do this" get decided**, and is that
   the only place? Auth state duplicated across a cookie, local storage, and client-side
   context is three sources of truth that can disagree — a token expires server-side while
   the UI still shows a logged-in state until the next failed request.
4. **What does the client do when the contract is violated** — a field the client expects
   is missing, or an error shape the client doesn't recognize? A UI that assumes every
   response matches the happy-path type crashes or silently renders garbage on the first
   backend change that isn't perfectly coordinated with a client release.
5. **Does the API return what the screen needs, or does the screen reassemble it from a
   generic resource?** A screen that fetches three separate generic endpoints and joins them
   client-side to build one view is doing the backend's job with worse tools and more round
   trips.

## What to flag on sight, not as a style preference

- **Hand-synced types on two sides of an API.** Any interface or type manually duplicated
  between client and server, with nothing enforcing they match, is a contract that will
  drift the moment one side changes without a coordinated release.
- **N+1 request patterns caused by a UI loop**, not just a database loop — a component that
  issues one fetch per list item instead of one batched fetch for the whole list.
- **Auth/session state duplicated across storage mechanisms** with no single source that
  the others defer to, and no revalidation on the client when the server-side session
  actually changes (a password reset, a permission downgrade, a logout elsewhere).
- **Optimistic UI updates with no reconciliation plan.** Updating the UI before the server
  confirms is fine; not handling what happens when the server rejects it — silently leaving
  the UI in the optimistic-but-wrong state — is a bug.
- **Pagination, filtering, or sorting implemented client-side on data that's fetched
  server-side unbounded.** If the backend already paginates, the frontend re-implementing
  "load everything, then slice" defeats the point and reintroduces the unbounded fetch the
  backend was built to avoid.
- **Environment-specific config or secrets baked into client code** because it was easier
  than threading it through the API — anything shipped to the browser is public, regardless
  of how it's named.

## How to give the feedback

Be specific and be direct. "The client re-derives `isAdmin` from a JWT it decodes locally
instead of trusting the server's response — a stale token shows admin UI after a downgrade"
beats "consider centralizing auth state." State the concrete failure sequence — which side
finds out last, and what the user sees before it does — not just the missing best practice.
If a tradeoff is genuinely defensible (a denormalized read endpoint built specifically to
avoid N+1, a client-side cache that's deliberately allowed to go briefly stale), say so and
explain why it's fine here specifically.

## What this skill does not do

It doesn't pick your framework, your API style (REST vs. GraphQL vs. RPC), or your auth
provider — those are context-dependent decisions this skill has no opinion on unless asked.
It also doesn't replace end-to-end testing across a real deployed client and server:
reasoning through the contract catches design-level drift, not environment-specific
integration bugs, which need a real run against both sides.
