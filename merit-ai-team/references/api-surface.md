# Merit AC API surface

Grounded in `backend/README.md` and `backend/app/routers/*.py` in
`drewc611/Meter` as of this plugin's creation. Cross-check against the live
`GET /openapi.json` before relying on this for anything load-bearing — the
repo can drift ahead of what's actually deployed at `api.usemeritai.com`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/ingest/usage` | Record one AI usage event |
| POST | `/ingest/outcome` | Record a PR merge, ticket close, deal advance, etc. |
| POST | `/ingest/quality-signal` | Record a revert, rewrite, regeneration loop, etc. |
| POST | `/admin/identity-mapping` | Wire a new external id to an existing person (scoped to caller's org) |
| POST | `/admin/recompute-scores` | Trigger the nightly scoring job for the caller's own org on demand |
| GET | `/admin/org` | The caller's own `Organization`, including its `ingest_token` |
| POST | `/admin/notify-waitlist?dry_run=false` | One-off "site is live" email to unnotified waitlist signups |
| GET | `/api/overview` | Everything the Overview page needs, one call |
| GET | `/api/people` | Full person list with segment + recommendation |
| GET | `/api/teams` / `/api/roles` | Spend/value/slop rolled up above the individual |
| GET | `/api/trends?months=6` | Spend/value/slop across the trailing N months |
| GET | `/api/tool-breakdown` | Current-period spend by (tool, model) |
| GET | `/api/tool-performance` | Current-period value/$ and slop risk per tool |
| GET | `/api/spend-forecast?months=6` | Projected next-period spend (ridge regression w/ confidence range, or linear fallback) |
| GET | `/api/adoption` | Active vs. provisioned seats, current period |
| POST | `/auth/signup` | Create a dashboard account |
| POST | `/auth/login` | Password login, returns a JWT |
| GET | `/auth/google/login` | Redirects to Google's consent screen |
| GET | `/auth/google/callback` | Google's redirect target |
| GET | `/auth/me` | The logged-in user, given a valid token |
| POST | `/waitlist` | Pre-launch signup — ungated |
| GET | `/healthz` | `{"status": "ok"}` — always open |

## Auth layers

- `/ingest/*` — per-org `ingest_token` bearer (or the count-gated "≤1 org"
  fallback for local dev). See `dependencies.require_api_key`.
- `/api/*`, `/admin/*` — per-user JWT (`dependencies.get_current_user`);
  `/admin/*` additionally requires `is_admin` (`dependencies.require_admin`).
  Every handler scopes to `user.org_id`.
- `/healthz` and `/waitlist` are always open, by design.

## Known gaps as of the last verified pass (2026-08-15)

`/openapi.json` and `/docs` are publicly reachable on the production API,
which means this entire table (and the underlying schemas) is already
readable by anyone — see `merit-context`'s open-issues list, item 2. That's a
standing infra finding, not something this reference file causes; it just
means "public API surface" and "documented API surface" are currently the
same list.
