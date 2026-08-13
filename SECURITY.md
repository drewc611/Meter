# Security

Merit is an early-stage prototype, still being hardened for production use.
This file exists so that's not a secret, and so there's a clear channel to
report anything found.

## Status

Dashboard access requires a real per-user login (password, hashed with
bcrypt, or "Sign in with Google") once `MERIT_JWT_SECRET` is set — not a
single shared secret. Session tokens are signed JWTs; rotating the secret
invalidates every issued session at once if that's ever needed. Password
signup can be gated behind an invite code (`MERIT_SIGNUP_CODE`) before
sharing a deployment's URL widely.

Known gaps: no rate limiting on login attempts, no audit log of who
accessed what, account recovery (forgot-password) isn't built, and the
"Sign in with Google" `state`
parameter isn't a CSRF nonce (it only carries an optional signup code) --
worst case there is an attacker tricking a victim's browser into logging
into the attacker's own Google account on this site, not an account
takeover. `/admin/*` (identity mapping, recompute-scores) requires a
dashboard account with `is_admin` set, not just any logged-in viewer; the
first account ever created on a deployment is admin automatically, and
`MERIT_ADMIN_EMAILS` (comma-separated) grants it to specific emails after
that -- there's no UI to promote someone later, that's a direct DB edit.
Session tokens live in the browser's `localStorage`, not an httpOnly
cookie, and there's no Content-Security-Policy header on the deployed
site -- a successful XSS anywhere could read a visitor's token. Don't
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
