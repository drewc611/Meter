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

### Fixed in a follow-up review

Three further issues, each with a regression test that fails without its fix.
The password-length and login-timing gaps described below were found
independently in the same review and are already covered by the paragraphs
above, which fix them a different way.

- **A company signup could land inside an individual's personal org.** With
  `MERIT_SIGNUP_CODE` set, the shared organization was resolved as "the oldest
  row in the table". On a deployment that ran publicly before being locked
  down, that row is some individual's personal org, so every later
  code-holding signup joined it and could read that person's dashboard. The
  shared org is now selected by `plan == "company"`, and a personal org is
  never adopted as a shared tenant. This is the one that actually crossed the
  tenant boundary.
- **One malformed waitlist row could permanently disable the announcement
  email.** The signup validator rejected spaces but not newlines, so an
  address containing one was stored; `/admin/notify-waitlist` then raised
  `HeaderParseError` while building the message, which isn't an
  `SMTPException` and so escaped as a 500 that aborted the entire run. Control
  characters are now rejected at signup, in both the waitlist and account
  email validators.
- **An unreachable mail server did the same thing, and is likelier.**
  `ConnectionRefusedError` is an `OSError`, not an `SMTPException`, so an
  ordinary transient outage also 500'd the whole job. Because `notified_at`
  was committed only after the loop, every already-sent recipient was
  re-emailed on the next attempt. The handler now covers both, and commits per
  recipient.


`/auth/login` and `/auth/signup` cap password length at bcrypt's 72-byte
limit and reject anything longer with a 422 at the validation layer, so an
oversized password no longer crashes the handler with a 500 — which used to
be an account-existence oracle, since an unknown email short-circuits to
401 without ever hashing anything while a known one reached bcrypt and
raised.

`/auth/login` also runs a real bcrypt check against a fixed decoy hash
(`services/auth.DUMMY_PASSWORD_HASH`) whenever the email doesn't resolve to
an account with a password set, so that path costs the same ~100ms of
bcrypt work as a wrong password on a real account. Without this, a
nonexistent email returned near-instantly while a real one didn't — same
401 either way, but the timing gap alone let an attacker enumerate which
emails have accounts.

`MERIT_JWT_SECRET` being unset or under 32 characters is only ever logged,
not enforced, when running locally — but `create_app()` refuses to start
at all if it detects a real deployment (`FLY_APP_NAME` set by the Fly.io
runtime itself, or `MERIT_ENV=production` set explicitly) and the secret is
missing or weak, since every tenant boundary in this app rests on that
token being unguessable.

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
