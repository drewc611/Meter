# Security

Merit AC is an early-stage prototype, still being hardened for production use.
This file exists so that's not a secret, and so there's a clear channel to
report anything found.

## Status

Dashboard access requires a real per-user login (password, hashed with
bcrypt, or "Sign in with Google") once `MERIT_JWT_SECRET` is set — not a
single shared secret. Session tokens are signed JWTs; rotating the secret
invalidates every issued session at once if that's ever needed.

Every `Team`/`Identity`/`DashboardUser`/`PersonScore` row belongs to
exactly one `Organization` (tenant), and every query over those tables is
scoped to it — this is what makes it safe for unrelated individuals to
self-signup on the same deployment. `WaitlistSignup` is the one table with
no tenant: a lead-capture signup happens before any org exists, so there's
nothing to scope it to. The waitlist endpoints (`GET /admin/waitlist`,
`POST /admin/notify-waitlist`) are gated on that basis by
`require_operator`, which requires the logged-in user's email to be in
`MERIT_ADMIN_EMAILS` — deployment-operator membership, not merely `is_admin`.
That distinction matters because with `MERIT_SIGNUP_CODE` unset every
signup is automatically the sole admin of their own brand-new org, so
`is_admin` alone would let any self-signup read every lead's contact
details or mail all of them through the deployment's own SMTP identity.
`MERIT_SIGNUP_CODE` controls which of two modes a signup lands
in: unset, the public free-personal-use posture, every signup gets its own
brand-new isolated org and is its sole admin; set, a company deployment
gated to one shared org, where the first signup with the matching code is
admin and `MERIT_ADMIN_EMAILS` (comma-separated) grants it to specific
emails after that -- there's no UI to promote someone later, that's a
direct DB edit. `/ingest/*` authenticates the same way: each org has its
own `ingest_token` (`GET /admin/org`), not a single shared secret, and an
unauthenticated write is only ever accepted while at most one org exists in
the whole database -- the instant a second tenant exists, it's rejected
with no operator action required.

`/auth/login` and `/auth/signup` cap password length at bcrypt's 72-byte
limit and reject anything longer with a 422 at the validation layer, so an
oversized password no longer crashes the handler with a 500 — which used to
be an account-existence oracle, since an unknown email short-circuits to
401 without ever hashing anything while a known one reached bcrypt and
raised.

`/openapi.json`, `/docs`, and `/redoc` are disabled in production via
`MERIT_DISABLE_API_DOCS=true` (set in `fly.toml`) — every route still
works, only the schema/UI that lists the full admin and ingest surface is
hidden. Unset locally, so `make run` still has interactive docs.

Known gaps: no rate limiting on `/auth/login`, `/auth/signup`, or
`/waitlist`, no audit log of who accessed what, account recovery
(forgot-password) isn't built, and the "Sign in with Google" `state`
parameter isn't a CSRF nonce (it only carries an optional signup code) --
worst case there is an attacker tricking a victim's browser into logging
into the attacker's own Google account on this site, not an account
takeover. That same Google callback hands the session JWT back to the
frontend in the redirect's *query string* rather than its URL fragment, so
the token can land in browser history, a `Referer` header, or an
intermediary's logs -- moving it to a fragment needs a matching frontend
change and hasn't been done yet. `/admin/*` (identity mapping,
recompute-scores) requires a dashboard account with `is_admin` set, not
just any logged-in viewer. Session tokens live in the browser's
`localStorage`, not an httpOnly cookie, and there's still no
Content-Security-Policy header on the deployed site (the other security
response headers -- `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy` -- are set in `frontend/public/_headers`; a CSP needs
hashes or nonces for the three remaining inline `<script>` blocks first)
-- a successful XSS anywhere could read a visitor's token. Don't
point this deployment at real people's data, and don't assume the live
site is production-hardened, until you've reviewed those gaps against
your own risk tolerance. The seeded demo data (`backend/seed.py`) is
fabricated and safe to run publicly for exactly that reason.

## Reporting a vulnerability

If you find a security issue in this repository or in the live deployment:

1. **Don't open a public GitHub issue for it.**
2. Email the maintainer directly (see the repository owner's GitHub profile
   for contact info) with a description of the issue and, if you have one,
   steps to reproduce it.
3. Expect an acknowledgment, not a bug bounty — this is a pre-revenue
   prototype, not a program with a budget for one yet.

## Scope

This applies to the code in this repository and to the live deployment
described in [`DEPLOY.md`](DEPLOY.md). Third-party services this depends on
(Fly.io, Cloudflare) have their own security programs and should be
reported to directly for issues in their platforms, not here.
