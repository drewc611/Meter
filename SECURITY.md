# Security

Merit is an early-stage prototype. This file exists so that's not a secret —
both how to report a problem, and what's already known to be missing.

## Known limitations (read before pointing this at real data)

**No authentication on any backend endpoint.** `/api/*`, `/ingest/*`, and
`/admin/*` are all reachable by anyone with the URL. CORS
(`MERIT_CORS_ORIGINS`) restricts which browser origins can read the API from
JavaScript — it does nothing against a direct request (`curl`, a script, a
second browser tab pointed straight at `api.usemeritai.com`). This is the
reason the production domain currently serves a "coming soon" placeholder
(`frontend/index.html`) instead of the real dashboard: the data isn't safe
to expose publicly until this is closed. See
[`ARCHITECTURE.md`](ARCHITECTURE.md#3-does-this-hosting-choice-make-sense)
for the full gap list and priority order (auth is gap #1).

Don't use this deployment to store real people's names, spend, or
performance data until that's fixed. The seeded demo data
(`backend/seed.py`) is fabricated and safe to run publicly for exactly that
reason.

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
