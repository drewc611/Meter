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
token being unguessable. The same production check now covers
`MERIT_CORS_ORIGINS`: `config.py` defaults it to `*` for the local demo, and
a real deployment left that way lets any page on the internet call this API
with a visitor's browser, so a production boot with no origin list is
refused rather than merely logged. `fly.toml` already sets it. Both checks
live in `main.check_startup_environment()`.

### Fixed in a second review

A wider pass than the first, covering the frontend, the deployment config and
the GitHub Actions workflows as well as the backend. Each of these has a
regression test, and each test was confirmed to fail without its fix.

- **SMTP credentials were sent over an unauthenticated TLS session.**
  `services/email.py` called `smtplib`'s `starttls()` with no SSL context.
  Python builds one from `ssl._create_stdlib_context()` in that case, which is
  `CERT_NONE` with `check_hostname` off — the session is encrypted but the
  server is never verified, so anyone able to answer for `MERIT_SMTP_HOST`
  could read the whole session and collect `MERIT_SMTP_USER` /
  `MERIT_SMTP_PASSWORD` from the `AUTH` that follows. It now passes
  `ssl.create_default_context()`, built once and shared.
- **The "Sign in with Google" `state` was not a CSRF nonce.** Previously it
  only carried an optional signup code and nothing checked it on the way back,
  so a forged callback carrying the attacker's own authorization code switched
  a victim's browser into the attacker's account. `/auth/google/login` now
  mints a one-time nonce, parks it in an httpOnly `SameSite=Lax` cookie
  (`Secure` whenever `GOOGLE_REDIRECT_URI` is https), carries it inside
  `state`, and the callback rejects anything that doesn't match. The cookie is
  cleared on both the success and failure paths, so a `state` can't be
  replayed.
- **Google sign-in could be linked onto an account someone else had already
  claimed.** Password signup never verifies the email address, so an attacker
  could register `victim@example.com` first; when the real owner later signed
  in with Google, the callback linked their identity onto that existing row —
  with the squatter's password still on it. A verified Google address is not
  proof that whoever set the password owns it, so a Google login no longer
  auto-links onto an account that has a password. Linking the two is a direct
  DB edit for now, the same as promoting someone to admin. An account with no
  password — one created by an earlier Google login — still links normally.
- **The session JWT came back in the redirect's query string.** It now rides
  in the URL fragment, which is never sent to a server, so it stays out of
  access logs, `Referer` headers and intermediaries. `AppDataContext.jsx`
  reads `location.hash` and wipes it from the address bar immediately.
- **`/auth/login`, `/auth/signup` and `/waitlist` had no rate limit.** All
  three are unauthenticated; the first was free password guessing. There is
  now a per-caller cap (`services/ratelimit.py`) — 10 logins per 5 minutes, 10
  signups and 20 waitlist joins per hour — keyed on `Fly-Client-IP`, which
  Fly's proxy overwrites. A general `X-Forwarded-For` read is deliberately not
  honoured, since the client controls its left-hand entries and could use it
  both to dodge its own limit and to burn someone else's.
- **The error detail in the OAuth failure redirect wasn't URL-encoded**, and
  Google's raw token-exchange response body was echoed to the caller.
  `RedirectResponse`'s own escaping leaves `&` and `#` alone, so a detail
  containing either could append parameters to the URL the browser landed on.
  The detail is now percent-encoded and the upstream body goes to the server
  log instead of the browser.
- **Free-text request fields had no length bound.** `SignupIn.name` and the
  ingest `source_system` / `external_id` / `tool` / `model` / `external_ref`
  fields were unbounded, so one request could park megabytes in the database
  and in every later response that read the row back. All are capped now, and
  `IdentityMappingIn.email` gets the same validation as the other two email
  fields.
- **Four workflows ran with the repository's default `GITHUB_TOKEN`
  permissions**, three of them while holding the production `FLY_API_TOKEN`.
  `backup-verification`, `github-sync` and `nightly-recompute` never call the
  GitHub API and now declare `permissions: {}`; `dependency-audit` takes
  `contents: read`. All twelve workflows now scope the token explicitly.

A fifth finding came out of measuring the rate limiter rather than reading it:
the first implementation evicted stale counters with a scan once the map grew
past a threshold. Under the exact case that matters — a flood from fresh
addresses — every entry is inside the window, so the scan freed nothing and
ran again on the next request. Measured at 1.9µs per request under the
threshold and **675µs over it, with the map still growing**: a bigger lever
than the one being removed. It's an LRU with a hard cap now, flat at 2.3µs per
request under the same flood and pinned at ~22 MB.

`/openapi.json`, `/docs`, and `/redoc` are disabled in production via
`MERIT_DISABLE_API_DOCS=true` (set in `fly.toml`) — every route still
works, only the schema/UI that lists the full admin and ingest surface is
hidden. Unset locally, so `make run` still has interactive docs.

The deployed site sends a Content-Security-Policy alongside the other
security response headers (`X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`) in `frontend/public/_headers`. `script-src` allows no
external origin at all and no `'unsafe-inline'` — the four pages that ship an
inline `<script>` (app.html's pre-paint theme switch, coming-soon's
calculator, and the waitlist forms on `/community` and `/challenge`) are
covered by sha256 hashes, generated from the built output by
`frontend/scripts/build-csp.mjs` at the end of `npm run build` rather than
maintained by hand, so they can't go stale the first time one of those blocks
is edited. `style-src` does keep `'unsafe-inline'`: the charts set style
attributes on the elements they render, which a hash can't cover without
`'unsafe-hashes'`, and inline CSS is a far weaker sink than inline JS.

Known gaps: no audit log of who accessed what, and account recovery
(forgot-password) isn't built. Session tokens live in the browser's
`localStorage` rather than an httpOnly cookie, so a successful XSS could
still read one — the CSP above is what makes that harder, not impossible.
Email addresses are never verified, on password signup or on the waitlist,
which is why a Google login won't link itself onto a password account.
The rate limiter holds its counters in the process, which is correct for the
single-machine deployment this runs as today (`min_machines_running = 1`, one
SQLite file on one volume) but wrong the moment it scales out — at two
machines each enforces its own share of the limit, and it wants moving behind
a shared store. It is also per-IP, so it is a speed bump against one host and
nothing at all against a botnet. `/admin/*` (identity mapping,
recompute-scores) requires a dashboard account with `is_admin` set, not just
any logged-in viewer. Don't point this deployment at real people's data, and
don't assume the live site is production-hardened, until you've reviewed those
gaps against your own risk tolerance. The seeded demo data
(`backend/seed.py`) is fabricated and safe to run publicly for exactly that
reason.

### Not set on the repository itself

These are GitHub repository and account settings, not code, so nothing in
this repo can turn them on — they need a maintainer with admin access:

- `main` is **not a protected branch**. It should require a pull request and
  passing status checks before merging, disallow force pushes, and apply to
  administrators too.
- **Secret scanning and push protection** are not enabled. CI runs `gitleaks`
  on every push and PR, which catches a secret in the diff after it is pushed;
  push protection would refuse the push itself.
- **Private vulnerability reporting** is not enabled, so the reporting process
  below is email only.
- Automation credentials should be **fine-grained PATs or repository deploy
  keys** scoped to this repository alone, with an expiry, rather than
  account-wide tokens. Commits from automated agents should be **signed**, so
  authorship can be verified rather than asserted.

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
