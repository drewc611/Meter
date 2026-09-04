# Merit AC engineering log

Maintained by `merit-eng-review`. Dated findings from code/API reviews —
defects, their location, and their fix. Append, don't overwrite.

## Log

### 2026-09-04 — full security audit, one High fixed, plus follow-ups

First entry in this file — real engineering work has been landing all
session without a matching log entry; this catches it up rather than
starting a delta against nothing.

A full read-only security audit found one real High and three Medium
findings, all fixed same-day in PR #87:

- **High:** `/admin/waitlist` and `/admin/notify-waitlist` had no tenant
  boundary — in the public free-personal-use posture, any self-signup
  user is automatically the sole admin of their own org, which was
  enough to pass `require_admin` and read/mass-email every waitlist
  lead's real PII. Fixed with a separate `require_operator` dependency
  gated on `MERIT_ADMIN_EMAILS`, applied only to those two endpoints.
- **Medium:** bcrypt raises on passwords over 72 bytes (or 72 multibyte
  characters, which the fix also covers); the login handler's `or`
  short-circuit meant a nonexistent email cleanly 401'd but a real one
  with an oversized password crashed to a 500 — a clean account-
  enumeration oracle contradicting the code's own "same message either
  way" comment. Fixed: `verify_password` catches the exception, and both
  login/signup schemas cap password length before it ever reaches
  bcrypt.
- **Medium:** `superfly/flyctl-actions/setup-flyctl@master` — a mutable
  ref in three workflows holding the production Fly deploy token. Pinned
  to a real, independently-verified commit SHA (tag `1.6`) in all three.
- **Medium:** `MERIT_JWT_SECRET` strength was never validated. Now warns
  at startup (same pattern as the existing unset-secret warning) if it's
  set but under 32 characters.
- Five Low findings also fixed same PR: no security response headers
  (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` added),
  unbounded `company`/`source` fields on `/waitlist`, three workflows
  missing an explicit `permissions:` block, a non-constant-time signup-
  code comparison, and a stale doc claim that `coming-soon.html` isn't
  served (it is, just unlinked).
- Verified with the actual backend test suite, not just build/lint: 139
  passed (133 existing + 6 new), ruff clean.
- Left as documented known gaps, not fixed this pass: the OAuth callback
  still puts the session token in a URL query string rather than a
  fragment; no rate limiting on `/auth/signup` or `/waitlist`; no CSP yet
  (three inline-script sites need hashes/nonces first). All three are
  now in `SECURITY.md`'s known-gaps list.

### 2026-09-04 (same day) — `/openapi.json` and `/docs` gated in production
- The audit's follow-up brief (`merit-exec-brief.md`) flagged that
  `/openapi.json`/`/docs`/`/redoc` were still publicly readable on the
  live API — a known open issue since 2026-08-15/08-21 that outlived
  three weekly checks. Fixed: `create_app()` now takes a
  `MERIT_DISABLE_API_DOCS` flag (set `'true'` in `fly.toml`'s `[env]`)
  that sets `docs_url`/`redoc_url`/`openapi_url` to `None` — every route
  still works, only the schema/UI is hidden. New `tests/test_main.py`
  covers both the default-on (local dev) and flag-set (prod) cases.
