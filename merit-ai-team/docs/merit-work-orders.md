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
```
