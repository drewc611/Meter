---
name: merit-context
description: >
  Loads what is known about Merit AC (usemeritai.com) — the product, the public
  API surface, the hosting stack, the scoring model, and the current stage of
  the business. Read this before any other merit-* skill runs, and whenever the
  user says "Merit AC", "usemeritai", "the site", "the API", "our product", or asks
  anything about Merit AC's infrastructure, code, marketing, or strategy. Every
  other skill in the merit-ai-team plugin depends on this one.
metadata:
  version: "0.1.0"
  last_verified: "2026-08-15"
---

# Merit AC — shared context

Load this first. Do not restate it back to Andrew; use it.

## What Merit AC is

Merit AC measures whether a company's AI spend is producing value. It ingests
per-person AI spend, business outcomes, and quality signals from three
independent systems, then scores each person on value per dollar and "slop
risk."

Verbatim from the product UI:

> AI spend, value, and rework risk — by team, with person-level detail when you
> need it.

The pitch that carries the money: a company spending ~$274k/yr on AI can
recover roughly 24% of it without cutting a single high-value user.

### The scoring model

| Concept | Meaning |
| --- | --- |
| Value per $ | Outcome-weighted return on a person's AI spend (e.g. `2.51×`). Can go negative. |
| Slop risk | 0–100 quality-proxy score. High = rework, reverts, reopens. |
| AI rework tax | % of spend sitting in high-slop-risk usage. |
| Recoverable / yr | Over-tiered seats + high-slop spend re-tiered + shadow-AI consolidation. |

Four segments people land in: **Fund** (high value, high spend), **Coach**
(high spend, high slop), **Learn** (low spend, high value), **Monitor** (low
spend, low signal).

Three confidence tiers: Tier 1 (spend + outcome correlation), Tier 2 (quality
proxies), Tier 3 (opt-in sampled rubric grading, not yet shipped).

### Positioning discipline

Merit AC's own copy is careful, and Merit AC's agents must be too. The UI says value
is a "spend-weighted estimate, not a causal claim" and that scores are
"confidence-tiered signals, not exact measures." Never write marketing copy
that claims Merit AC proves tool X caused outcome Y. That precision is the brand.

## Stack (verified 2026-08-15)

| Layer | What it is | How it was verified |
| --- | --- | --- |
| Frontend | React SPA built with Vite, single hashed bundle at `/assets/main-*.js` | HTML source |
| Frontend host | Cloudflare (`server: cloudflare`, `cf-cache-status: HIT`) | response headers |
| API | `api.usemeritai.com`, FastAPI, OpenAPI 3.1.0, title "Merit AC API" v0.1.0 | `/openapi.json` |
| API host | Fly.io, `ord` region | `server: Fly/…`, `fly-request-id: …-ord` |
| Health | `GET /healthz` → `{"status":"ok"}` | direct fetch |
| Auth | email/password + Google OAuth, JWT (`TokenOut`) | OpenAPI schema |
| Dev fallback | bundle contains `http://localhost:8000` | bundle string |

Full endpoint list and schema field names: `references/api-surface.md`.

## The site now has three arms (added 2026-08-21)

Merit AC is no longer just the ROI product. Three surfaces, three audiences:

1. **The ROI product** — `/`, `/architecture`, `/setup/react`, `/setup/python`,
   `/setup/node`, `/setup/tensorflow-pyro`, `/methodology`. Sells to the CFO/VP
   Eng buyer. Tracked against the original design-partner goal.
2. **AI-education content** — `/guides`, `/prompts`. General "how to do AI
   better" articles and a daily detailed prompt archive, one stack-tagged post
   per day (react, python, node, tensorflow-pyro). Broader audience than the
   product buyer — this is top-of-funnel, not the pitch itself.
3. **The 30-day challenge** — `/challenge`. A free run of daily prompts with a
   paid unlock at the end. **Fee mechanism (Stripe vs. manual) is undecided as
   of 2026-08-21 — do not describe a working checkout until Andrew confirms.**

**Content tracking is a separate goal from the design-partner goal**, not a
sub-goal of it. See `merit-goal` for both. Whether content is meant to funnel
into `/setup/*` signups or serve a separate audience is still an open question
— don't assume either direction in copy until it's answered.

## Stage of the business

Pre-launch. The live app runs on demo data and labels itself so — every page
carries a `DEMO DATA · API offline` badge and an "illustrative prototype" mark,
the sample tenant is "Northwind Labs," and there is a `POST /waitlist` endpoint
plus an `admin/notify-waitlist` action. Pricing is mentioned only inside the
product copy: a Growth plan at roughly **$18–25/user/mo**.

Treat every recommendation through that lens. Merit AC does not have production
customers to break, but it also has no traffic, no backlinks, and no content.
Priorities are: don't ship something embarrassing, and get the first design
partners.

## Known open issues as of 2026-08-15

Carry these forward; re-check rather than re-discover them.

1. **~~No security headers on the frontend.~~ Fixed 2026-09-04** (PR #87).
   `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` are
   live in `frontend/public/_headers`, confirmed via `curl -I` against the
   production site the same day. CSP itself is still open — three
   inline-script sites need hashes/nonces first, noted in `SECURITY.md`.
2. **~~`/openapi.json` and `/docs` are publicly readable.~~ Fixed
   2026-09-04.** `MERIT_DISABLE_API_DOCS=true` in `fly.toml` now hides
   `/openapi.json`, `/docs`, and `/redoc` in production — every route
   still works, only the schema/UI is gone.
3. **~~Admin endpoints exist with unknown auth.~~ Confirmed and hardened
   2026-09-04.** `/admin/*` requires `is_admin`; `/admin/waitlist` and
   `/admin/notify-waitlist` specifically now also require
   `require_operator` (`MERIT_ADMIN_EMAILS` membership), after a security
   audit found any self-signup user could otherwise read and mass-email
   the whole waitlist (PR #87) — see `merit-eng-log.md`.
4. **Zero crawlable content.** Still open — actually superseded: the site
   now ships real prerendered content routes (`/architecture`, `/news`,
   `/guides`, `/prompts`, etc., see `merit-infra-log.md`'s 2026-08-21
   entry), so "empty `<div id="root">`" is stale for those pages
   specifically. Re-verify `/app` itself (the dashboard SPA) and whether
   `sitemap.xml` lists everything that's shipped since.
5. **Single API region (`ord`) and unknown backup posture.** Still open.
   Fine for now, worth a stated position before the first paying customer.
6. **No pricing page, no docs, no changelog** on the public site. Still
   open.

## Missing pieces (as of 2026-08-21)

The five `merit-*` skills in this plugin were originally written to reference
three more: `merit-executor` (Fetch/Work/Judge tier routing and dispatch),
`merit-probe` (Fetch-tier fact collection), and `merit-analyst` (Work-tier
first-pass review) — plus two skills from other plugins,
`andrew-agent:write-as-andrew` and `design:accessibility-review`. None of
those five are part of this plugin or confirmed present in any environment it
runs in. Every skill here has been adapted to do its own fact-collection and
judgment directly instead of routing to them, and to check for the two
external skills before relying on them rather than assuming they're there.

If Andrew wants the tiered-routing model for real (cheaper fact-collection
runs on a smaller/cheaper pass, judgment calls reserved for a stronger one),
`merit-executor`/`merit-probe`/`merit-analyst` would need to be written from
scratch — nothing to adapt them from exists yet.

## Working rules for every merit-* skill

- **Verify, don't assume.** Re-fetch headers, `/healthz`, and `/openapi.json`
  each run. Stack details change; this file is a starting point, not truth.
- **Never send authenticated or destructive requests.** Read-only probes on
  public endpoints only. Never call `/admin/*`, `/ingest/*`, or `/waitlist`.
- **Separate finding from inference.** Label anything not directly observed.
- **Report the delta.** Andrew has read this before. Lead with what changed
  since the last run, not with a re-description of the system.
- **Write findings back to the docs.** Every run appends to the relevant file
  under `merit-ai-team/docs/` (see the table below) so the next run has memory.
- **Andrew's voice.** Direct, opinionated, specific. No "in today's landscape,"
  no "it's worth noting," no bold-term-colon-explanation lists.

## Project docs this team maintains

These are plain markdown files in this plugin's own repo (`drewc611/merit-ac`,
`merit-ai-team/docs/`) — not a claude.ai Project. Read/write them with normal
file tools (Read/Write/Edit), same as any other file in this repo.

| Path | Owner skill | Contents |
| --- | --- | --- |
| `merit-ai-team/docs/merit-site-profile.md` | merit-context | Stack, product, scoring model |
| `merit-ai-team/docs/merit-infra-log.md` | merit-infra-check | Weekly infra findings, dated |
| `merit-ai-team/docs/merit-eng-log.md` | merit-eng-review | Code and API review findings |
| `merit-ai-team/docs/merit-growth-log.md` | merit-growth | Positioning, content, SEO |
| `merit-ai-team/docs/merit-exec-brief.md` | merit-ceo-brief | Weekly synthesis, decisions owed |
| `merit-ai-team/docs/merit-goal.md` | merit-goal | The design-partner goal — outcome, deadline, measure, sub-goals, progress log |
| `merit-ai-team/docs/merit-content-goal.md` | merit-goal | Content/challenge goal — same shape, separate from the design-partner goal |
| `merit-ai-team/docs/merit-content-log.md` | merit-growth | Prompts and guides drafted, published, and their status |

Read the relevant log before starting a run, and write the updated full
contents back (append a new dated section, don't overwrite prior entries) when
done, so the next run has memory. If a doc doesn't exist yet, create it with a
one-line header and start appending — don't wait for a "first run" ceremony.
