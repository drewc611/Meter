---
name: merit-eng-review
description: >
  Engineering/security review for Merit — the product's auth and
  data-isolation surface, plus the site's content pages and any
  challenge-gating code. Use this whenever reviewing a diff, a new route, or
  new content-facing code for the same class of bugs Merit has already found
  in its own product. Depends on merit-context (open issues list, API
  surface); logs to merit-ai-team/docs/merit-eng-log.md.
metadata:
  version: "0.1.0"
  last_verified: "2026-08-21"
---

# Merit engineering review

Reviews code and content changes against the classes of bug already found and
fixed in Merit's own product (see `drewc611/Meter`'s `CLAUDE.md` and
`SECURITY.md`, and `merit-context`'s known-open-issues list — cross-tenant
data leaks, missing identity mappings, XSS via unescaped `innerHTML`,
ingestion-token scoping, publicly-readable `/openapi.json`/`/docs`). The point
is to keep those same mistakes from reappearing on a new surface, not to
re-derive security principles from scratch every run.

## Original scope

Auth gating on `/admin/*` and `/api/*` (per-user JWT + `is_admin` for admin
routes), ingest-token scoping and leakage (`/ingest/*`, org-scoped tokens),
identity/org isolation correctness, standard OWASP-class review on any new
backend endpoint. Full endpoint/auth-layer reference: `references/api-surface.md`.

## Added scope: content and challenge-gating code

- **Content pages** (`/architecture`, `/setup/*`, `/guides`, `/prompts`,
  `/challenge`) — these should be static/prerendered (see
  `merit-infra-check`), but if any of them end up server-rendered or accept
  query params reflected into the page, check for the same XSS class already
  fixed once in the dashboard's tooltip `innerHTML` bug.
- **Challenge gating** — if/when the challenge accepts user input (a form, a
  submission, a comment), treat it like the product's ingestion endpoints: it
  needs auth or a token scoped correctly, and an unmapped/unauthenticated
  write should fail closed, not silently succeed or drop. Don't design a
  gating scheme that lets one paying user's content leak into another's view
  — that's the same cross-tenant mistake `scoring.py`'s median bug was, just
  in a content shape instead of a spend shape.
- **No payment flow to review yet** — the fee mechanism (Stripe vs. manual)
  is undecided; there's nothing to audit until it's built. When it is: never
  trust a client-supplied amount, verify webhook signatures, and give it the
  same "never invented, never assumed secure" scrutiny as everything else.

## How to run it

Same posture as any code review: find concrete, verifiable defects with a
location and a failure scenario, not a survey of hypothetical concerns. If a
route or file doesn't exist yet, say there's nothing to review yet rather than
reviewing a description of it. Log findings — dated, with location and fix —
to `merit-ai-team/docs/merit-eng-log.md`.
