<!--
See CONTRIBUTING.md for the full discipline this checklist comes from.
Fill in Why/What/Testing for real — a checkbox ticked without the evidence
behind it is worse than an honest unchecked box.
-->

## Why

<!-- The problem or ask, in the requester's own words. Not a solution restated as a problem. -->

## What

<!-- What actually changed, and why this shape rather than an alternative. -->

## Testing

<!-- Commands actually run and their actual output, not what should happen. -->

## Definition of Done

- [ ] One coherent change, statable in a sentence, matching this PR's title
- [ ] Builds and passes the repo's own checks **locally** before push (`ruff check . && ruff format --check . && pytest` from `backend/`, and/or `npm run build` from `frontend/`)
- [ ] Every specific claim above (a count, a byte size, a built-output assertion) was actually reproduced, not stated from memory
- [ ] CI is green on this PR, not just locally
- [ ] Docs updated in this same PR if behavior or conventions changed
- [ ] Nothing force-pushed to a shared branch, no `--no-verify`
