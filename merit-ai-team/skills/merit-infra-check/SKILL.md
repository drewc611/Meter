---
name: merit-infra-check
description: >
  Weekly crawlability, security-header, and SPA-fallback check for Merit's
  live site — the dashboard app plus the new /architecture, /setup/*,
  /guides, /prompts, and /challenge routes. Use this for any scheduled or
  ad-hoc check of whether the live site is reachable, indexable, and
  correctly headed. Depends on merit-context (known open issues, stack
  facts); logs to merit-ai-team/docs/merit-infra-log.md.
metadata:
  version: "0.1.0"
  last_verified: "2026-08-21"
---

# Merit infra check

Weekly (or ad-hoc, on request) read-only probe of the live site: is it up, are
security headers present, and — the recurring specific failure mode this
skill exists to catch — does a route 404 through the SPA fallback instead of
actually serving content.

## Original scope

The dashboard app's own routes and headers on the live Fly.io/Cloudflare
deployment, plus the known open issues carried in `merit-context`:

1. No security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options,
   Referrer-Policy) — cheap fix via a Cloudflare `_headers` file or Transform
   Rule.
2. `/openapi.json` and `/docs` publicly readable on the production API.
3. Admin endpoint auth unconfirmed — `/admin/identity-mapping`,
   `/admin/recompute-scores`, `/admin/notify-waitlist`.
4. Zero crawlable content — empty `<div id="root">`, no `sitemap.xml`.
5. Single API region (`ord`), unknown backup posture.
6. No pricing page, docs, or changelog on the public site.

Re-verify each of these every run rather than assuming last week's finding
still holds — see `merit-context`'s "verify, don't assume" rule.

## Added scope: content routes

`/architecture`, `/setup/react`, `/setup/python`, `/setup/node`,
`/setup/tensorflow-pyro`, `/guides` (+ its article pages), `/prompts` (+ each
`/prompts/day-N-*`), and `/challenge`.

These are static content by nature — a system diagram, a setup guide, a
prompt of the day. If they get built as client-side-routed pages inside the
same SPA as the dashboard, they'll hit the exact SPA-fallback problem this
skill already watches for on the existing app (a direct hit on a route the
server doesn't know about, vs. one reached by client-side navigation from
`/`). Building these as actual static pages/files from the start avoids
re-discovering that bug on a new set of routes. Flag it if any of them come
back reachable only via in-app navigation and not as a direct request.

## What to check, per route

- Direct HTTP request returns 200, not a client-side-only 200-that's-really-
  a-404, or an actual 404/500.
- Basic security headers present (compare against whatever the existing
  dashboard routes already set, rather than inventing a new baseline).
- Indexable: no unintended `noindex`, a real `<title>`, not an empty shell
  that only populates via JS.
- `/challenge` specifically: since there's no payment flow yet, confirm it
  isn't accidentally exposing a checkout-shaped endpoint before one is meant
  to exist.

## Reporting

Read-only probes only — see `merit-context`'s standing rails; never `POST` to
`/admin/*`, `/ingest/*`, or `/waitlist`. Log each run to
`merit-ai-team/docs/merit-infra-log.md`, dated, leading with what changed
since the last run — not a full re-description of the system.
