# Merit AC work-order queue

Read by `merit-apply` (`merit-ai-team/skills/merit-apply/SKILL.md`), which works
items top-down in `rank` order, skipping anything not `status: ready`, and never
touches anything marked `status: blocked` — those need Andrew's decision first,
recorded under "Blocked on Andrew" below.

This file did not exist before 2026-09-23. It was created from a first-principles
audit of `origin/main` at commit `9da2e22` — six candidate issues, each
independently verified by reading the actual current code (not assumed, not
copied from an unverified report) before being written up here. Three are
`status: ready`; three are `status: blocked` on a real decision.

## Blocked on Andrew

- **WO-4.** Backend has no dependency lockfile (`requirements.txt`/
  `requirements-dev.txt` use `>=` floors only) — frontend's `package-lock.json`
  pins exactly, backend doesn't. Fixing this means picking a tool
  (`pip-compile`/`uv pip compile`/Poetry) and a workflow, which is a real choice,
  not a one-line patch.
- **WO-5.** `tier` on `POST /admin/identity` is an unconstrained free-text
  string — `tier="frontier"` (lowercase) silently fails the exact-string
  comparison `analytics.py` uses against `TOP_TIER = "Frontier"`, so a
  differently-cased row never counts as over-tiered. Reject with 422, or
  normalize (title-case) on the way in? Changes what a CSV import does with a
  row it can't classify, and changes a number this product publishes.
- **WO-6.** The dashboard app (`frontend/styles.css`, `/app`) still runs the
  old indigo/violet theme (`--brand:#4f46e5` light, `#7c74f4` dark) — the
  lime-on-black redesign (`4d53baa`, `9da2e22`) only ever touched the content
  site (`frontend/public/content.css`). Bringing the dashboard in line is a
  real design pass (token values, but also whatever assumes the old palette
  in chart colors/status pills), not a token swap — needs scoping before
  it's a work order with a fix, not just a finding.

```markdown
## WO-1
id: WO-1
rank: 1
status: ready
kind: implement
files: backend/app/services/scoring.py
base-commit: 9da2e22
mechanism:
  recompute_all() builds raw_values over every identity_id in the org
  (scoring.py:180, `db.query(Identity.id).filter(Identity.org_id == org_id)`),
  not just ones with spend. raw_value_from_totals() (scoring.py:32-38)
  returns 0.0 for any identity with spend <= 0. normalize_value_scores()
  (scoring.py:187) takes the median of that full set -- zero-spend
  identities included -- before the spend filter ever runs. The filter
  that excludes them (`if spend_micros <= 0: continue`, scoring.py:192-193)
  only happens in the later write loop, and only skips writing a
  PersonScore row for that identity -- it does not undo the identity's
  contribution to the median already computed at line 187.
  Reachable in production today: POST /admin/identity (81b379d, live)
  provisions a person with zero usage yet -- list_identities' own
  docstring calls this out directly ("a brand-new design partner has
  provisioned people with zero usage yet"). Every such idle seat pulls
  the org's median toward zero, inflating every real spender's
  normalized value_per_dollar and understating recoverable_annual_usd
  in the same direction -- the wrong direction for a product whose
  pitch is "we find the spend you can recover."
  Verified independently (not copied from an unverified report): read
  scoring.py:170-199 directly, confirmed raw_value_from_totals's 0.0
  return path, confirmed normalize_value_scores runs before the spend
  filter.
fix:
  Build raw_values only over identities with spends_micros.get(id, 0) > 0,
  so normalize_value_scores's median is taken over people who actually
  spent something. ~4 lines at scoring.py:180-187. Identities with no
  spend still get no PersonScore row written, same as today.
acceptance:
  A test seeding 3 identities with spend and N provisioned-but-idle
  identities (N in {0, 3, 7}), recomputing, and asserting each scored
  person's value_per_dollar and the org's recoverable_annual_usd are
  identical regardless of N -- currently they are not.

## WO-2
id: WO-2
rank: 2
status: ready
kind: implement
files: backend/app/routers/admin.py
base-commit: 9da2e22
mechanism:
  create_identity (admin.py:56-93) pre-checks only Identity.email
  uniqueness (admin.py:80) before inserting a new IdentityMapping
  (source_system="manual", external_id=body.email) and committing
  (admin.py:91-93). IdentityMapping carries
  UniqueConstraint("org_id", "source_system", "external_id",
  name="uq_source_external") (models.py:94). Nothing in this file
  imports or catches sqlalchemy.exc.IntegrityError (grepped: admin.py
  only imports stdlib email.errors.MessageError). A prior manual
  mapping on the same external_id -- left behind after its owning
  Identity was deleted, or created directly via
  POST /admin/identity-mapping with external_id equal to this new
  person's email but under a different Identity -- collides on
  uq_source_external at commit and raises an unhandled IntegrityError,
  a bare 500 on the first screen a design partner uses to add someone.
fix:
  Wrap the commit in try/except IntegrityError; on collision, roll back
  and return 409 with a message naming the external_id already mapped.
  Closes the read-then-write race under a concurrent double-submit too,
  which a pre-check alone can't.
acceptance:
  A test reproducing the collision above and asserting 409 (not 500),
  plus a test asserting no Identity or Team row is left behind after
  the rejected call.

## WO-3
id: WO-3
rank: 3
status: ready
kind: implement
files: frontend/public/images/dashboard-preview.png, .github/workflows/refresh-screenshots.yml
base-commit: 9da2e22
mechanism:
  Home.jsx's hero embeds frontend/public/images/dashboard-preview.png
  as "the actual dashboard, not a mockup." git log --follow on that
  file shows exactly two commits, both 2026-09-07 -- it has not been
  touched since. The lime-on-black content-site redesign landed 14
  days later (4d53baa, 2026-09-21) and never touched the dashboard app
  itself (see WO-6), so this screenshot is doubly stale: it's an old
  capture of the pre-redesign dashboard, sitting inside a hero that's
  now lime-and-black around it.
  .github/workflows/refresh-screenshots.yml already exists and fires on
  push to main touching frontend/src/**/styles.css/capture-screenshots.mjs,
  but it runs npm run screenshot -> capture-screenshots.mjs, whose
  OUT_DIR is docs/screenshots/ (5 files for the README: overview,
  people, teams-roles, alerts, integrations) and only git adds that
  directory (workflow line 61) -- it never writes or commits
  frontend/public/images/dashboard-preview.png. There is no automated
  path that keeps the hero image current.
fix:
  Regenerate dashboard-preview.png against the current build and
  extend capture-screenshots.mjs (or the workflow) to also write and
  commit it alongside the docs/screenshots/ set, so a future dashboard
  or theme change can't silently leave the homepage hero stale again.
acceptance:
  dashboard-preview.png visibly matches the current dashboard build at
  merge time, and a subsequent push touching styles.css regenerates it
  automatically (verified by checking the workflow run's diff, not just
  that the job succeeded).

## WO-12
id: WO-12
rank: 4
status: ready
kind: implement
files: backend/Dockerfile
base-commit: e013e24
mechanism:
  The measure this project is ranked against is "live ingestion AND at least
  one scored period." The only SCHEDULED producer of a scored period is
  .github/workflows/nightly-recompute.yml:31, which runs
  `flyctl ssh console -a meter -C "python recompute.py"` on cron
  `0 7 * * *` (:12). github-sync.yml:31 runs
  `flyctl ssh console -a meter -C "python github_sync.py"` on `0 */6 * * *`
  (:12).
  backend/Dockerfile sets WORKDIR /app (:9) and COPYs exactly three things:
    13:COPY requirements.txt .
    16:COPY app ./app
    17:COPY seed.py entrypoint.sh ./
  `ls backend/*.py` returns github_sync.py, personal.py, proxy_example.py,
  recompute.py, seed.py, sync_content.py. Both scheduled scripts exist in the
  repo and neither is in the COPY list, so `python recompute.py` inside the
  container resolves /app/recompute.py, which the image does not contain.
  Nothing else is missing. Every import in both scripts was traced: recompute.py
  imports app.database, app.models, app.periods and app.services.scoring;
  github_sync.py imports argparse, os, sys, httpx plus app.database, app.models,
  app.periods, app.services.github_ingest and app.services.scoring. All app.*
  modules live under backend/app/, already copied at :16. httpx is already
  pinned in backend/requirements.txt (`httpx>=0.28.1`). Neither file contains a
  path literal resolving outside backend/. github_sync.py takes
  MERIT_GITHUB_OWNER / MERIT_GITHUB_REPO / MERIT_GITHUB_TOKEN from the
  environment, supplied as Fly secrets at runtime, not baked into the image.
  DO NOT add sync_content.py to this COPY. sync_content.py:15 reads
  `ENTRIES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" /
  "content" / "entries"`, which resolves to the repo root's frontend/ tree --
  outside the backend/ build context that docker-compose.yml:11
  (`build: ./backend`) and backend/fly.toml:9 (empty `[build]`, so Fly builds
  from the directory fly.toml lives in) both define. A repo-wide grep finds no
  `context:` or `dockerfile:` override anywhere. Copying it in without a
  build-topology change produces a script that imports fine and then reads an
  empty directory -- see OOS-20 below.
  MEASURED: the Dockerfile COPY list, the two workflow commands and crons, the
  import and path-literal trace of both scripts, sync_content.py:15, the
  absence of any context override. INFERRED, and labeled as such: that the two
  scheduled runs are currently failing in production -- the GitHub Actions API
  403s from this environment, so their run history has not been read.
fix:
  One line in backend/Dockerfile, beside :17:
    COPY recompute.py github_sync.py ./
acceptance:
  `docker build -t merit-backend backend/` then
  `docker run --rm merit-backend ls /app/recompute.py /app/github_sync.py`
  exits 0 and prints both paths. Assert the same for seed.py so the existing
  COPY is not regressed. Do NOT assert that either script runs to completion --
  both need a live database.

## WO-17
id: WO-17
rank: 5
status: ready
kind: implement
files: frontend/src/content/lib/loadEntries.js
base-commit: e013e24
mechanism:
  31 of the 360 built pages that carry a meta description contain a raw
  newline inside the content="" attribute -- all under skills/ (22) and
  models/ (9). Reproduced by running `npm ci && npm run build` in frontend/
  and scanning dist/**/*.html.
  The chain, read at the files:
    frontend/src/content/pages/SkillEntry.jsx:8
      description: stripTags(entry.html).slice(0, 200),
    frontend/src/content/pages/ModelEntry.jsx:8
      description: stripTags(entry.html).slice(0, 200),
    frontend/src/content/lib/loadEntries.js:89-97
      export function stripTags(html) {
        let prev;
        let result = html;
        do {
          prev = result;
          result = result.replace(/<[^>]+>/g, "");
        } while (result !== prev);
        return result;
      }
    frontend/scripts/prerender-content.mjs:43
      <meta name="description" content="${escapeHtml(meta.description)}">
    frontend/scripts/prerender-content.mjs:26-33  escapeHtml(), which
      replaceAll's & < > " and ' and touches no whitespace.
  Source markdown in frontend/src/content/entries/skills/*.md and models/*.md
  is soft-wrapped across editor lines. `marked` preserves a soft line break as
  a literal \n in the rendered <p> text (CommonMark default; no `breaks`
  option is set). stripTags removes tags and nothing else, escapeHtml escapes
  five characters and nothing else, so the \n survives into the attribute.
  `grep -rn stripTags frontend/src/` returns exactly two call sites, both the
  `description:` derivations above, so collapsing whitespace inside stripTags
  cannot affect rendered body content.
  This is a source-data shape meeting a writer gap, NOT double-escaping.
  escapeHtml is called once per page; there is no second escaping pass in
  entry-server.jsx.
fix:
  In loadEntries.js:89-97, return `result.replace(/\s+/g, " ").trim()` instead
  of `result`. One line.
acceptance:
  After `npm run build` in frontend/, no file in dist/ matches
  `<meta name="description" content="[^"]*\n`. Assert the count is 0, having
  first asserted it is 31 at the base commit so the check is proved to fire.
  Do not assert a unit test -- there is no frontend test runner in this repo.

## WO-19
id: WO-19
rank: 6
status: ready
kind: implement
files: frontend/scripts/check-built-meta.mjs, frontend/package.json
base-commit: e013e24
depends-on: WO-17 -- this check fails the build until it has landed. Work it
  last, or the gate breaks main on its own first run. (An earlier draft of
  this work order also depended on a WO-18 for the doubled-apostrophe defect;
  WO-18 was resolved directly rather than queued -- see the note at the
  bottom of this file, below "Blocked on Andrew" history -- so this item
  depends on WO-17 alone now.)
mechanism:
  merit-apply works an item tests-first against the full gate. For a frontend
  item there is no gate: ci.yml's frontend job is `npm ci` then `npm run
  build`; frontend/package.json has exactly four scripts (dev, build, preview,
  screenshot) and no `test`; and a repo-wide grep for vitest, jest or
  testing-library across package.json files exits 1. All 220 `def test_`
  functions under backend/tests/ are backend.
  This has been recorded as a reason frontend items have no assertable
  acceptance. It is only half true. A test RUNNER is absent; an assertion
  TARGET is not. `npm run build` already produces dist/ via
  prerender-content.mjs and build-csp.mjs, and an open frontend defect like
  the raw newlines above is a property of dist/ that a script can assert in
  one pass.
fix:
  Add frontend/scripts/check-built-meta.mjs: walk dist/**/*.html, and exit
  non-zero with the offending filenames if any page's
  <meta name="description" content="..."> contains a raw newline, or if any
  page contains `&#39;&#39;`. Print the count of pages scanned and the count
  carrying a description so a future regression in the prerenderer is visible
  rather than silent. Append ` && node scripts/check-built-meta.mjs` to the
  `build` script in package.json.
acceptance:
  `npm run build` exits 0 on a tree with WO-17 applied, and exits non-zero
  with the offending filenames if either the raw-newline or the
  doubled-apostrophe check is deliberately reverted. Verify both directions;
  a check that has never failed has not been tested.
```

## Out of scope for merit-apply

These need a browser tab, a terminal on Andrew's Mac, or Andrew's judgment.
They are not work orders and are not ranked in the queue above.

- **OOS-7.** Send the outreach. The test date Andrew set (three names by
  2026-09-27) is imminent with zero sent as of this writing.
- **OOS-2.** Set a monthly spend limit on the Anthropic key in the Anthropic
  Console -- `POST /assistant/ask` runs a live model call per request, ungated,
  linked from the nav on every page, and nothing in `backend/app/` enforces a
  cap. Zero code, survives every commit.
- **OOS-1.** `fly releases -a meter`, and if any release sits between
  2026-09-18 and 2026-09-21, check `usage_events` for rows where
  `cost_usd_micros IS NULL` (the migration-order gap noted elsewhere in this
  project's logs).
- **OOS-3.** `fly secrets list -a meter` to confirm `ANTHROPIC_API_KEY` and
  `MERIT_ADMIN_EMAILS` are set as expected.
- **OOS-20.** Making `sync_content.py` runnable in production (see WO-12's
  "DO NOT" clause) needs the Docker build context moved from `backend/` to the
  repo root, plus matching edits to `backend/fly.toml` and
  `docker-compose.yml`. That's a build-topology change across three files
  whose effect on `fly deploy` hasn't been verified by an actual build --
  not safe to hand to an unsupervised agent. Not currently scheduled anywhere
  (only `backend/Makefile` and `backend/README.md` reference it), so unlike
  WO-12 nothing is silently failing on a cron today.

**WO-18 note (2026-09-26):** a fenced block for WO-18 (the doubled-apostrophe
`dek` fields) was drafted against base `e013e24` naming 4 news entries. Before
pasting it, the claim was re-checked against the current tree and found stale:
5 more news entries added after `e013e24` (this repo's own 2026-09-26 news
batch) carried the identical defect, for the same reason -- `''` copied from
the `title:`/`label:` single-quoted-scalar convention into a `dek: >-` folded
block scalar, where it has no escape meaning and renders as two literal
apostrophes. All 9 were fixed directly in this same change rather than queued,
since the fix is a single-character edit per file and re-verified via
`npm run build` (`grep -rl '&#39;&#39;' dist/` now exits 1). WO-19 above still
queues the regression check so this can't silently reappear.

