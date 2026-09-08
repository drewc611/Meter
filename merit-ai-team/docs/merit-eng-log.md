# Merit AC engineering log

Maintained by `merit-eng-review`. Dated findings from code/API reviews —
defects, their location, and their fix. Append, don't overwrite.

## Log

### 2026-09-08 — repo mode

**Confirmed**
| Finding | Severity | Where |
| --- | --- | --- |
| No idempotency key on ingestion events — a retried `/ingest/usage` (or `/ingest/outcome`/`/ingest/quality-signal`) POST, which is a normal at-least-once-delivery failure mode for any webhook or billing-proxy retry, creates a second row and silently double-counts spend/outcome/quality with nothing rejecting or deduplicating it | High | `backend/app/models.py:97-149` (`UsageEvent`/`OutcomeEvent`/`QualitySignal` — no unique constraint on any of `identity_id`+`occurred_at`+`tool`, or an explicit idempotency/event id; `OutcomeEvent.external_ref` exists but is nullable and unconstrained) |
| `cost_usd`, `spend_usd`, `value_per_dollar`, `slop_risk` are all `Float`, not `Decimal`/cents-as-integer | Medium | `backend/app/models.py:107,129,145,228-230` — flagged as a standing design concern in this skill's own checklist; not yet causing an observed bug, but error accumulates with event-table growth |
| `starlette` not pinned explicitly (see `merit-infra-log.md` 2026-09-08 — not currently exploitable, `fastapi>=0.141.1` resolves `starlette==1.6.0`, past the CVE-2026-48710 floor, but nothing stops a future resolve from landing below it without a floor pin) | Low | `backend/requirements.txt` |

Proposing, not fixing without confirmation, per this skill's own rule — the
first finding needs a decision on the idempotency key's shape (a required
client-supplied `event_id` per ingest call vs. a derived natural key like
`identity_id+source_system+occurred_at+tool`) before a migration makes sense,
and a migration touching three live event tables isn't something to push
unasked.

**Carried over**
| Finding | Age |
| --- | --- |
| No CSP (3 inline-script sites need hashes/nonces first) | since 2026-08-15 |
| No rate limiting on `/auth/signup` or `/waitlist` | since 2026-09-04 |
| OAuth callback puts session token in URL query string, not a fragment | since 2026-09-04 |

**Closed since last run** (all shipped in PR #100, 2026-09-07, verified via
the live `backend/tests/` suite — 149 passed, ruff clean, re-run this
session)
- Operator OS `ctx.table()` path traversal (writes-capable plugin could
  overwrite a core registry with no event-log entry) — critical, fixed.
- CSV formula injection across every Operator OS import adapter — fixed,
  free-text columns only, money/id/ref/enum/date columns untouched.
- `os use <name>` unvalidated path join — fixed, rejects non-plain names.
- `MERIT_JWT_SECRET` missing/weak now refuses to boot in a real deployment
  (`FLY_APP_NAME` or `MERIT_ENV=production`), not just a startup warning —
  confirmed still warn-only in local/dev as intended. The commit's own
  operational note flagged a real deploy-outage risk if a weak secret were
  already live on Fly; the site responded 200 at `/healthz` this session
  (see infra log), which is consistent with the secret already being strong
  in production, though that's inferred from uptime, not independently
  confirmed against `fly secrets list`.
- Login timing oracle (unknown email short-circuited before bcrypt, real
  email paid the full ~100ms) — fixed with a constant-time decoy-hash path.

**Autonomous news pipeline (§6 checklist, first real check against actuals)**
- `corrections` array renders visibly and unconditionally when non-empty
  (`NewsArticle.jsx:20-27`), not hidden behind a click — confirmed by
  reading the component, not just the doc claim.
- No published article has ever needed a correction yet (checked all
  `frontend/src/content/entries/news/*.md` frontmatter), which means the
  *append-a-correction* path renders correctly but has never actually been
  exercised end to end. Flagging as an open gap per this skill's own
  standard for that case, not assuming it works because the render logic
  looks right.
- The Judge-tier pass is genuinely rejecting things: **6 rejected / 54
  total verdicts** in `merit-news-judge-log.md`, not the 0-rejections
  pattern the 2026-09-04 exec brief flagged as a possible rubber-stamp
  concern. That worry is resolved by the actual log, not just the pass
  rate looking healthy.
- No static publish credential found in this repo (no GitHub Actions
  workflow drives `/news`, unlike every other scheduled job in
  `.github/workflows/`) — publishing appears to run through this session
  type's own platform-issued, per-session write access rather than a
  long-lived secret checked into the repo or a workflow file. Noting this
  as inferred from the absence of a workflow, not independently confirmed
  against the actual trigger/session config, which this review can't see.

**Goal:** Ten design partners by 2026-12-31 · 114 days left · none of this
run's findings block that goal directly — the double-counting risk matters
most once real (non-demo) tenant billing data starts flowing in, which
hasn't happened yet.

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
