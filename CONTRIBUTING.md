# Contributing

The development discipline for this repo — human or agent, same rules. Lightweight
on purpose: this is a solo-owned project (see `CODEOWNERS`), not a multi-team org, so
this is agile-hygiene-sized, not SAFe-sized. No sprints, no story points, no PI
planning. What it keeps is the part that actually prevents damage: nothing lands on
`main` without a green build behind it, every change is small enough to review in one
sitting, and every change states up front what "done" means before anyone starts.

## The backlog

Two queues, and they don't overlap:

- **`merit-ai-team/docs/merit-work-orders.md`** — machine-written, machine-read. The
  `merit-*` audit skills find defects and write them up there; `merit-apply` reads it
  and works `status: ready` items top-down by `rank`, never touching `status: blocked`.
  Don't hand-edit an item's substance without re-verifying it yourself first — see the
  file's own header.
- **GitHub Issues** — everything else: features, redesigns, product decisions,
  anything a human is deciding rather than an audit loop discovering. Use the
  templates under `.github/ISSUE_TEMPLATE/`. This is the backlog for the kind of work
  this repo has actually seen most of so far (new pages, pricing changes, whole
  product launches) — small enough that a Projects board hasn't been needed yet; add
  one if the open-issue count ever makes that worth it, not before.

## Definition of Ready

Before starting work on anything beyond a trivial fix, be able to state:

1. **The problem or ask**, in the requester's own words, not a rephrasing that already
   assumes the solution.
2. **Acceptance criteria** — what a reviewer (or the user) can check, concretely, to
   confirm this is actually done. "Looks good" isn't one; "the built page shows X" or
   "`pytest` covers Y" is.
3. **Scope small enough for one PR.** If the honest answer is "this is actually three
   things," split it before starting, not after — see "Small PRs" below.

If any of the three is missing, that's the actual next step (ask, don't guess) —
this mirrors `merit-work-orders.md`'s own blocked-vs-ready distinction: an item with
a real open question is `blocked`, not `ready` with a guess baked in.

## Definition of Done

A change is done when, and only when:

- [ ] It does one coherent thing, statable in a sentence, matching the PR title.
- [ ] It builds and passes the repo's own checks **locally**, before push — not just
      "CI will catch it": `ruff check . && ruff format --check . && pytest` from
      `backend/` for backend changes, `npm run build` from `frontend/` for frontend
      changes (this is also what proves the CSP hashes and sitemap are still correct,
      not just that the code compiles).
- [ ] Every specific, checkable claim in the PR description (a count, a byte size, a
      built-output assertion) was actually run and reproduced, not stated from memory
      of what it should be.
- [ ] CI is green on GitHub, not just locally — the two environments differ (pinned
      dependency versions, a clean checkout) often enough that this step has caught
      real bugs the local run didn't.
- [ ] Nothing was pushed straight to `main`. Every change ships branch → PR → CI green
      → merge, even a one-line fix, even from an agent session with direct push
      access. The PR is the audit trail; skipping it deletes that trail for free.
- [ ] Docs that describe the changed behavior are updated in the same PR — a stale
      `CLAUDE.md`/`README.md` is worse than a missing one, because it's actively
      wrong instead of visibly absent.

## Small PRs

One logical change per PR, reviewable in one sitting. A "site redesign" is a stack of
small PRs (design tokens, then hero, then nav, then per-section rollout), not one
enormous diff — this repo's own history already does this (see the sequence of
redesign PRs through `main`'s log); keep doing it that way rather than batching
unrelated changes because they happened to land the same session.

If a change is genuinely one atomic thing and happens to be large (a data migration,
a generated file), say so in the PR description rather than force-splitting something
that doesn't split cleanly.

## The pipeline

```
git fetch origin main
git checkout -B <branch> origin/main       # never build on top of stale local state
# implement, run the repo's own checks locally (see Definition of Done)
git add <specific files>                   # not -A — review what's actually staged
git commit -m "<why, not just what>"
git push -u origin <branch>
# open a PR — draft if CI hasn't run yet, ready once it's green and self-checked
# wait for CI, fix red before asking for merge, never force through
# merge (squash), sync local main, delete the branch
```

No `--no-verify`, no `git push --force` to a shared branch, no amending a commit
that's already pushed and reviewed. If a hook or a check is wrong, fix the check in
its own PR — don't route around it in the PR it's blocking.

## Commit and PR messages

State the *why*, not a restatement of the diff — the diff already says what changed.
"Fix scoring median to exclude idle seats" beats "Update scoring.py". A PR
description that includes independently-reproduced evidence (a command and its
actual output) is worth more than one that states a conclusion — see recent PR
descriptions in this repo's history for the pattern.

## What this deliberately doesn't add

No estimation, no velocity tracking, no sprint boundaries, no formal ceremony beyond
what's above. If this project's shape changes enough that those start paying for
themselves — more contributors, a shared roadmap that needs coordinating — revisit
this file then. Adding process ahead of the need it serves is the same mistake as
adding an abstraction ahead of the duplication that justifies it (see `CLAUDE.md`'s
own "Abstraction threshold").
