# Merit AC engineering log

Maintained by `merit-eng-review`. Dated findings from code/API reviews —
defects, their location, and their fix. Append, don't overwrite.

## Log

### 2026-09-11 — repo mode

Second-look review of the two PRs merged since last run: #104 (22-role skills
library + shadow-AI detection + 55 news articles) and #105 (ten-fix security
audit). 184 backend tests pass (up from 149), ruff clean.

**Confirmed**
| Finding | Severity | Where |
| --- | --- | --- |
| `operator-os-desktop.yml` has no `permissions:` block — the one workflow PR #105 missed. It's also the one that most needs a scoped grant: it runs `tauri-apps/tauri-action@v0` with `GITHUB_TOKEN` and `releaseDraft: true`, i.e. it creates GitHub releases, which needs `contents: write`. Every other workflow in `.github/workflows/` (`ci.yml`, `codeql.yml`, `dependency-audit.yml`, `github-sync.yml`, `nightly-recompute.yml`, `backup-verification.yml`, etc.) has an explicit `permissions:` block, several literally `permissions: {}` with a comment explaining why. This one silently inherits whatever the repo/org sets as the default `GITHUB_TOKEN` permission. If that default is the classic "read and write," this token has broader scope than every other workflow's explicit grant, contradicting the PR's own "least-privilege GITHUB_TOKEN on all workflows" description. If the org default is instead read-only, this workflow's release step (`releaseDraft: true`) will fail on next run — a functional bug hiding behind the same gap. Either reading, it's not "all workflows." | Medium | `.github/workflows/operator-os-desktop.yml` (no `permissions:` key at all; contrast every other file under `.github/workflows/`) |
| A retried failed ingest call against an already-known-unmapped identity writes a fresh `UnmappedIdentityEvent` row every time, with no dedup — this is the same missing-idempotency-key gap flagged last run (`backend/app/models.py:97-149`), now extended to the new shadow-AI table. Concretely: a billing proxy that retries on non-2xx (422 counts) for a not-yet-provisioned API key inflates `attempt_count` in `GET /admin/shadow-ai-candidates`, and — more consequentially — inflates `known_cost_usd`/`get_shadow_ai_observed_cost()`, which feeds directly into `get_overview()`'s headline `recoverable_annual_usd` figure (the "recover 24%" pitch number). A shadow-AI estimate that's supposed to be the one *measured* (not heuristic) component of that number can overstate itself the more aggressively an integration retries. | Medium | `backend/app/services/ingest.py:58-73` (`resolve_identity`); consumed by `backend/app/services/analytics.py:461-474` (`get_shadow_ai_observed_cost`) and `backend/app/services/analytics.py:193-195` (`get_overview`'s `shadow_ai_recoverable`) |

Everything else checked out as claimed, verified by reading the code rather
than trusting either PR's description:

- **Shadow-AI org scoping is airtight.** `UnmappedIdentityEvent` recording in
  `resolve_identity` uses the same `org_id` resolution every other ingest
  path already uses (`dependencies.require_api_key`); `GET
  /admin/shadow-ai-candidates` derives its `org_id` from the logged-in
  admin's own token via `resolve_org_id`, never a query param, and the whole
  `/admin/*` router is gated by `require_admin` at the router level
  (`main.py:121`) — the endpoint itself has no gate of its own, which looked
  like a gap on first read of `routers/admin.py` until checking `main.py`.
  `tests/test_multi_tenant_isolation.py::test_shadow_ai_candidates_stay_within_their_own_org`
  exercises this directly (org B never sees org A's unmapped attempts) —
  not just plausible from reading the code, actually tested.
- **STARTTLS cert verification is real.** `services/email.py`'s
  `_tls_context()` calls `ssl.create_default_context()` (`CERT_REQUIRED` +
  hostname checking on by default), replacing the prior default context
  `starttls()` builds on its own, which is `CERT_NONE`. The docstring's
  claimed vulnerability (anyone answering for `MERIT_SMTP_HOST` reads the
  session and the SMTP AUTH credentials) is the real behavior of the old
  code, and the fix closes it.
- **OAuth CSRF nonce is real, not decorative.** `new_oauth_state` mints the
  nonce, `google_login` sets it `httponly=True`, `secure=` (conditional on
  the redirect URI's scheme), `samesite="lax"`, scoped to `/auth`;
  `read_oauth_state` compares it against the returned `state` with
  `secrets.compare_digest` (constant-time) and raises on any mismatch;
  `_clear_state_cookie` expires it on both the success and failure path so a
  captured `state` can't be replayed. The session JWT itself now rides in
  the redirect's URL fragment (`/app#token=...`), confirmed read out of
  `location.hash` (not `location.search`) in
  `frontend/src/context/AppDataContext.jsx:78`, and wiped from the address
  bar immediately after.
- **Rate limiting is real and correctly scoped.** `services/ratelimit.py`'s
  fixed-window-per-caller limiter is wired via `dependencies=[...]` on
  `/auth/login` (10/5min), `/auth/signup` (10/hr), and — per
  `routers/waitlist.py` — `/waitlist`; keyed on `Fly-Client-IP` specifically
  (not general `X-Forwarded-For`, which a client can spoof).
- **`check_startup_environment()` genuinely blocks.** A weak/missing
  `MERIT_JWT_SECRET` or `MERIT_CORS_ORIGINS` left as `*` raises
  `RuntimeError` when `FLY_APP_NAME` or `MERIT_ENV=production` is set, warns
  only otherwise — confirmed by reading `main.py:36-90`, matching the PR
  description exactly.
- **CSP hashing is sound.** `build-csp.mjs` hashes inline `<script>` bodies
  verbatim (no trim/normalize) from the actual built `dist/` HTML, replaces
  rather than appends on a re-run (avoiding the browser's CSP-intersection
  footgun on duplicate headers), and ties the block to Cloudflare's `_headers`
  `/*` path — matches `CLAUDE.md`'s own warning that hand-maintained hashes
  would silently start blocking a page.

**Autonomous news pipeline (§6 checklist, re-checked against current state)**
- `corrections` support is structural, not a special case: `loadEntries.js`
  spreads gray-matter's full parsed frontmatter (`...data`) onto every
  entry with no field allowlist, so any `corrections:` array in a `.md`
  file's frontmatter reaches `NewsArticle.jsx` automatically. Render logic
  unchanged and still correct: visible, unconditional, not behind a click
  (`NewsArticle.jsx:20-33`).
- Still never exercised. 110 news entries now on disk (55 + the 55 PR #104
  added) — zero (`0`) carry a `corrections` field. The render path and the
  frontmatter plumbing are both provably correct by inspection; the
  publish-time *append* path (something that actually edits a live `.md`
  file to add a correction after the fact) has no code or automation
  artifact in this repo to point to at all — same gap as last run, now
  against double the article count with the same zero real exercises.
- Judge pass keeps rejecting things, at a similar rate: **16 rejected / 125
  total verdicts** in `merit-news-judge-log.md` (was 6/54 last run) — real
  reasons each time (unconfirmed byline, stale/out-of-recency-window story,
  primary source unconfirmable, rumor not yet on the record), not a rubber
  stamp. Confirmed by reading actual rejected entries, not the aggregate
  count alone.
- No static publish credential for `/news` found this run either — grepped
  `.github/workflows/` for anything news-related and found nothing, same as
  last run's finding by absence. Still inferred, not independently
  confirmed against the actual session/trigger config, which this review
  has no visibility into.

**Carried over**
| Finding | Age |
| --- | --- |
| No idempotency key on `/ingest/usage`/`/ingest/outcome`/`/ingest/quality-signal` — retried delivery double-counts spend/outcome/quality | since 2026-09-01 (first logged 2026-09-08) |
| `cost_usd`/`spend_usd`/`value_per_dollar`/`slop_risk` all `Float`, not `Decimal`/cents-as-integer | since 2026-09-08 |
| `starlette` not pinned explicitly (not currently exploitable — `fastapi>=0.141.1` still resolves past the CVE-2026-48710 floor) | since 2026-09-08 |
| News pipeline correction-append path exists only as a rendering/schema capability, never actually run end-to-end | since 2026-08-22 |

**Closed since last run**
- Nothing from the prior "Carried over" list closes this run — all three
  (no CSP, no `/auth/signup`/`/waitlist` rate limiting, OAuth token in query
  string) were exactly what PR #105 shipped and are now verified fixed
  above, so they move out of Carried over rather than being listed as
  newly-found.

**Goal:** Ten design partners by 2026-12-31 · 111 days left · none of this
run's findings block that goal directly — the shadow-AI retry-inflation
finding matters most once real integrations are actually retrying against
this endpoint, which hasn't happened with real (non-demo) tenant data yet;
the `operator-os-desktop.yml` permissions gap is Operator OS release
tooling, not the Merit AC product surface the design-partner goal tracks.

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
