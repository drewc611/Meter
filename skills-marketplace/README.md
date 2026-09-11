# Merit AC skills marketplace

A Claude Code plugin marketplace, generated from the same SKILL.md files that
back [usemeritai.com/skills](https://usemeritai.com/skills) -- one source of
truth, not two copies to keep in sync.

## Install

```
/plugin marketplace add drewc611/Meter --path skills-marketplace
```

(or point it at a local clone: `/plugin marketplace add ./skills-marketplace`
from the repo root). Then browse and install individual role skills with
`/plugin install <role-slug>`.

## Regenerating

Nothing in `plugins/` or `.claude-plugin/marketplace.json` is hand-edited --
both are generated from `frontend/public/skills/<role>/claude-skill/SKILL.md`.
After adding or editing a role's skill:

```
node scripts/build_marketplace.mjs
```

Safe to re-run any number of times; it fully regenerates `plugins/` and
`marketplace.json` from whatever's currently under `frontend/public/skills/`.

## A note on confidence

This follows the plugin-marketplace shape (`.claude-plugin/marketplace.json`
+ per-plugin `.claude-plugin/plugin.json` + `skills/<name>/SKILL.md`) as best
understood at the time this was built. Validate with a real
`/plugin marketplace add` + `/plugin install` before treating this as a
finished, publish-ready listing -- if Claude Code's plugin schema has moved
since, the fix is almost certainly a small one in `build_marketplace.mjs`,
not a rewrite of the SKILL.md content itself.
