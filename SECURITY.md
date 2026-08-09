# Security

Merit is an early-stage prototype. This file exists so that's not a secret —
both how to report a problem, and what's already known to be missing.

## Known limitations (read before pointing this at real data)

**No authentication on any backend endpoint, unless explicitly turned on.**
`/api/*`, `/ingest/*`, and `/admin/*` are all reachable by anyone with the
URL by default. CORS (`MERIT_CORS_ORIGINS`) restricts which browser origins
can read the API from JavaScript — it does nothing against a direct request
(`curl`, a script, a second browser tab pointed straight at
`api.usemeritai.com`).

A bearer-token gate exists (`app/dependencies.py:require_api_key`, wired
onto every `/api/*`, `/ingest/*`, and `/admin/*` route) and is enforced the
moment the `MERIT_API_KEY` environment variable is set — see `DEPLOY.md`'s
go-live checklist for the exact steps. Until that secret is set in
production, the endpoints stay open, which is why the production domain
currently serves a "coming soon" placeholder (`frontend/index.html`)
instead of the real dashboard. Note this is **one shared secret, not
per-user accounts** — adequate for a small trusted group, not a substitute
for real SSO/OAuth once this has more than a handful of users. See
[`ARCHITECTURE.md`](ARCHITECTURE.md#3-does-this-hosting-choice-make-sense)
for the full gap list and priority order (auth is gap #1).

Don't use this deployment to store real people's names, spend, or
performance data until the token is actually set in production (not just
present in the code). The seeded demo data (`backend/seed.py`) is
fabricated and safe to run publicly for exactly that reason.

## Reporting a vulnerability

If you find a security issue in this repository or in the live deployment
at `usemeritai.com`:

1. **Don't open a public GitHub issue for it.** Given the known gaps above,
   most findings here would just be "yes, and here's exactly how" — no
   value in broadcasting that before it's fixed.
2. Email the maintainer directly (see the repository owner's GitHub profile
   for contact info) with a description of the issue and, if you have one,
   steps to reproduce it.
3. Expect an acknowledgment, not a bug bounty — this is a pre-revenue
   prototype, not a program with a budget for one yet.

## Scope

This applies to the code in this repository and to `usemeritai.com` /
`api.usemeritai.com` as currently deployed (see
[`DEPLOY.md`](DEPLOY.md)). Third-party services this depends on (Fly.io,
Cloudflare) have their own security programs and should be reported to
directly for issues in their platforms, not here.
