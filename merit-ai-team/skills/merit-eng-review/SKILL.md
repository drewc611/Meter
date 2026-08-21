---
name: merit-eng-review
description: Engineering/security review for Merit — originally the product's auth and data-isolation surface, now also the site's content pages and any challenge-gating code. Use this whenever reviewing a diff, a new route, or new content-facing code for the same class of bugs Merit has already found in its own product.
---

# Merit engineering review

Reviews code and content changes against the classes of bug already found and fixed in
Merit's own product (see `drewc611/Meter`'s `CLAUDE.md` and `SECURITY.md` for the full
history — cross-tenant data leaks, missing identity mappings, XSS via unescaped
`innerHTML`, ingestion-token scoping). The point of this skill is to keep those same
mistakes from reappearing in new surfaces, not to re-derive security principles from
scratch each time.

## Original scope

Auth gating on `/admin/*` and dashboard routes, ingest-token scoping and leakage,
identity/org isolation correctness, standard OWASP-class review on any new backend
endpoint.

## Added scope: content and challenge-gating code

- **Content pages** (`/architecture`, `/setup/*`, `/guides`, `/prompts`,
  `/challenge`) — these should be static/prerendered (see `merit-infra-check`), but if
  any of them end up server-rendered or accept query params that get reflected into
  the page, check for the same XSS class already fixed once in the dashboard's
  tooltip `innerHTML` bug.
- **Challenge gating** — if/when the challenge accepts any user input (a form, a
  submission, a comment), treat it exactly like the product's ingestion endpoints:
  it needs auth or a token scoped correctly, and an unmapped/unauthenticated write
  should fail closed, not silently succeed or silently drop. Don't design a gating
  scheme that lets one paying user's content leak into another's view — that's the
  same cross-tenant mistake `scoring.py`'s median bug was, just in a content shape
  instead of a spend shape.
- **No payment flow to review yet** — the fee mechanism (Stripe vs. manual) is
  undecided (see `merit-context`); there's nothing to audit here until that's built,
  but when it is, a payment integration gets the same "never invented, never assumed
  secure" scrutiny as everything else — check webhook signature verification, don't
  trust client-supplied amounts, etc.

## How to run it

Same posture as any code review: find concrete, verifiable defects with a location and
a failure scenario, not a survey of hypothetical concerns. If a route or file doesn't
exist yet, say there's nothing to review yet rather than reviewing a description of
it.
