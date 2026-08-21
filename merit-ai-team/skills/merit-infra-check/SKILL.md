---
name: merit-infra-check
description: Weekly crawlability, security-header, and SPA-fallback check for Merit's live site — now covering the new /architecture, /setup/*, /guides, /prompts, and /challenge routes alongside the existing dashboard. Use this for any scheduled or ad-hoc check of whether the live site is reachable, indexable, and correctly headed.
---

# Merit infra check

Weekly (or ad-hoc, on request) read-only probe of the live site: is it up, are
security headers present, and — the recurring specific failure mode this skill exists
to catch — does a route 404 through the SPA fallback instead of actually serving
content.

## Original scope

The dashboard app's own routes and headers, per the existing Fly.io/Cloudflare
deployment described in `DEPLOY.md`.

## Added scope: content routes

`/architecture`, `/setup/react`, `/setup/python`, `/setup/node`,
`/setup/tensorflow-pyro`, `/guides` (+ its article pages), `/prompts` (+ each
`/prompts/day-N-*`), and `/challenge`.

These are static content by nature — a system diagram, a setup guide, a prompt of the
day. The whole reason to flag them here specifically: if they get built as
client-side-routed pages inside the same SPA as the dashboard, they'll hit the exact
SPA-fallback 404 problem already seen on this deployment (a direct hit on a route the
server doesn't know about, versus one reached by client-side navigation from `/`).
Building these as actual static pages/files from the start avoids re-discovering that
bug on a new set of routes. Flag it if any of them come back reachable only via
in-app navigation and not as a direct request.

## What to check, per route

- Direct HTTP request returns 200, not a client-side-only 200-that's-really-a-404 or
  an actual 404/500.
- Basic security headers present (whatever the existing dashboard routes already set
  — compare against those rather than inventing a new baseline).
- Indexable: no unintended `noindex`, a real `<title>`, not an empty shell that only
  populates via JS (a crawler and a slow connection both see the same problem an SPA
  fallback does).
- `/challenge` specifically: since there's no payment flow yet, confirm it isn't
  accidentally exposing a checkout-shaped endpoint before one is meant to exist.

## Reporting

Read-only probes only — see `merit-context`'s standing rails. Report failures with the
exact route and what came back (status code, response body's first few lines), not a
general "some routes may be broken."
