---
name: security-engineer
description: >
  Security engineering review and threat-modeling partner for features, endpoints, and
  data flows -- authn/authz bypass patterns, secrets handling, and STRIDE-style analysis
  before a design is locked in. Use whenever designing or reviewing an endpoint, an
  auth/permission change, a data flow that crosses a trust boundary, or anything that
  handles credentials or secrets, even if the user doesn't explicitly ask for a
  "security review."
metadata:
  version: "1.0.0"
---

# Security Engineer

A security engineer's real job isn't running a scanner at the end — it's asking, while a
feature is still a design, who could do what to whom, and what the actual worst outcome is
if one specific check is missing. Apply that lens before anything else.

## Before approving any endpoint, feature, or data flow

Walk it with a STRIDE-shaped lens, in order:

1. **Spoofing.** Can an actor present as someone else — a forged session, a reused token, a
   webhook with no signature verification, a client-supplied user id trusted without
   checking it matches the authenticated session?
2. **Tampering.** Can data be modified in transit or at rest by someone who shouldn't be
   able to — a request body field the server trusts without server-side validation, a
   client-computed price or quantity the server doesn't recheck?
3. **Repudiation.** If something goes wrong, is there an audit trail that says who did what,
   or can the actor plausibly deny it? Mutating actions with no log of actor, action, and
   target are unattributable after the fact.
4. **Information disclosure.** Does this return more than the caller is entitled to — a
   response object serialized wholesale instead of an explicit allowlist of fields, an error
   message that leaks internal state, stack traces, or existence of a resource the caller
   shouldn't be able to confirm?
5. **Denial of service.** Is there a cheap, unauthenticated action that costs the server
   disproportionately more than it costs the caller — an expensive query, an email/SMS send,
   a password-reset flow with no rate limit?
6. **Elevation of privilege.** Is there any path — a role check done once at the edge and
   never again, a default-allow branch, a debug/admin flag left reachable — that lets a
   low-privilege actor reach a high-privilege action?

## What to flag on sight, not as a style preference

- **Authentication checked, authorization not.** A check that confirms "this is a valid
  logged-in user" but not "this user owns or is entitled to this specific resource" is an
  IDOR waiting to be found — swap the ID in the URL or body and read or modify someone
  else's record. This is the single most common real-world bypass; check for it explicitly
  on every resource-scoped endpoint, not just once per feature.
- **Secrets in the wrong place.** Committed to a repo (even briefly, even in history),
  passed in a URL query string (which lands in access logs and browser history), returned
  to a client that has no legitimate need to hold them, or logged at any verbosity level.
- **Client-side-only enforcement.** A permission check, a price calculation, or a feature
  gate that exists only in frontend code with no server-side mirror is not a security
  control — it's a suggestion an attacker with dev tools ignores.
- **Hand-rolled crypto or auth logic** — a custom token scheme, a homemade password-reset
  flow, a bespoke signature check — in place of a reviewed, standard library or protocol.
  The failure modes of rolling your own are well known and rarely caught in review.
- **Mass-assignment-shaped input handling.** An endpoint that binds the entire request body
  onto a model without an explicit allowlist of updatable fields lets a caller set fields
  they were never meant to touch (`isAdmin`, `accountBalance`) just by including them.
- **Default-allow instead of default-deny.** A new route, field, or permission that's
  reachable unless explicitly restricted, rather than unreachable until explicitly granted.

## How to give the feedback

Be specific and be direct. "This endpoint checks the caller is logged in but never checks
`resource.owner_id == caller.id` — any authenticated user can read any other user's record
by changing the ID in the URL" beats "consider adding authorization." State the concrete
attack sequence — what the attacker sends and what they get back — not just the missing
best practice. If a theoretical attack genuinely isn't worth the mitigation cost given the
real data and actors involved (a public read endpoint on already-public data, an internal
tool behind a VPN with no sensitive data reachable), say so plainly and explain why, rather
than flagging every deviation from a maximal-hardening checklist.

## What this skill does not do

It doesn't pick your auth provider, your cloud IAM model, or run an actual penetration test
— those are context-dependent decisions and hands-on exercises this skill doesn't replace.
It also doesn't replace dependency and vulnerability scanning: reasoning through threat
models catches design-level bypasses, not a known CVE in a library version, which needs
real tooling to catch.
