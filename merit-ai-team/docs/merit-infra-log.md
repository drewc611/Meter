# Merit AC infra log

Maintained by `merit-infra-check`. Dated findings only — each run appends a
new section below, oldest at the bottom flipped to newest-first is fine as
long as it's consistent; don't rewrite prior entries.

## Log

### 2026-08-21

New content routes (`/architecture`, `/setup/react`, `/setup/python`,
`/setup/node`, `/setup/tensorflow-pyro`, `/guides`, `/prompts`, `/challenge`)
were built as real static Vite entries (`frontend/*.html`,
`frontend/setup/*.html`, `frontend/guides/index.html`,
`frontend/prompts/index.html`), not client-only SPA routes — confirmed via a
local `npm run build` that each produces a real file at the matching path in
`dist/`. This is the fix `merit-infra-check`'s standing item #4 (zero
crawlable content, SPA-fallback 404s) asks for, applied at creation time
instead of retrofitted later. Also added `frontend/public/robots.txt` and
`sitemap.xml` listing the real routes above.

Not yet verified against the live deployment — this was checked against a
local build only. Next `merit-infra-check` run should re-verify status 200
(not a redirect loop or 404) on all eight routes once this ships to
`usemeritai.com`.

**Update, same day:** confirmed against the actual deployed Cloudflare
branch preview — `/architecture`, `/setup/python`, `/challenge` return
direct 200s; `/guides` and `/prompts` 307-redirect to their trailing-slash
index (`/guides/`, `/prompts/`), which then returns 200 with the real page
— not a client-only SPA fallback. That's Cloudflare Workers' default
`html_handling` behavior for a directory with an `index.html`, not a bug.

**Update, later same day:** the eight pages were rebuilt as React components
under `frontend/src/content/` (plain HTML entries → prerendered React, per
The founder's request), but the *output* is unchanged — `npm run build` still
runs a prerender step (`vite build --ssr` + `scripts/prerender-content.mjs`)
that writes each one to a real file at the same path in `dist/` before
Cloudflare ever serves it, so this finding still holds. Re-verify against
the live deployment once this ships, same as noted above.
