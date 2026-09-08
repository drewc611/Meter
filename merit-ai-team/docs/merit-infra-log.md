# Merit AC infra log

Maintained by `merit-infra-check`. Dated findings only — each run appends a
new section below, oldest at the bottom flipped to newest-first is fine as
long as it's consistent; don't rewrite prior entries.

## Log

### 2026-09-08

**Status:** frontend 200 (0.49s) · api /healthz 200 (0.53s) · TLS cert live and
valid (this session's own egress proxy re-terminates TLS, so the cert chain
observed here is the proxy's, not usemeritai.com's own — expiry can't be
independently confirmed from this environment; nothing else suggests a
problem).

**Changed since last run (2026-09-04 eng-log entry, no infra-check since
2026-08-21)**
- The dashboard SPA moved off the root domain to `/app` as part of the site
  redesign (PR #100/#101) — bundle is now `app-*.{js,css}` at `/app`, not
  `main-*.{js,css}` at `/`. The old bundle-drift baseline (`main-CtPKB2qh.js`,
  235,537 bytes) is stale; new baseline: `app-CBXmwqid.js` 243,479 bytes,
  `app-BLGyitf4.css` 22,408 bytes.
- `/openapi.json`, `/docs`, `/redoc` all confirmed 404 in production — the
  2026-09-04 `MERIT_DISABLE_API_DOCS` fix is holding.
- Root (`/`) now serves the new content homepage (`Home.jsx`), not the
  dashboard shell — confirmed real prerendered HTML (6,484 bytes, correct
  `<title>`), not an empty `id="root"` SPA shell.
- Content-site routes all healthy: `/architecture`, `/setup/*`, `/challenge`,
  `/models`, `/glossary`, `/community`, `/operator-os` → 200. `/guides`,
  `/prompts`, `/news`, `/cloud-architecture`, `/claude-architecture` → 307 to
  their trailing-slash index (same documented Cloudflare directory-index
  behavior noted 2026-08-21, not a bug) → 200 on the real page.
- **`sitemap.xml` was stale and only listed 9 of the site's ~130+ real
  routes** — hand-maintained since 2026-08-21, never updated as `/news`,
  `/models`, `/glossary`, `/community`, `/operator-os`,
  `/cloud-architecture`, `/claude-architecture`, and every individual
  guide/prompt/news/model entry page shipped. This is exactly the kind of
  regression `merit-growth`'s "site is invisible to crawlers" standing
  priority warns about — a sitemap that's wrong is close to as bad as no
  sitemap, since it actively tells crawlers a wrong, smaller site exists.
  **Fixed this run**: `frontend/scripts/prerender-content.mjs` now generates
  `dist/sitemap.xml` directly from the same page list it prerenders from
  (`entry-server.jsx`'s `renderAll()`), so every shipped page is in the
  sitemap by construction and it can't drift out of sync with the build
  again. Verified via a real `npm run build` — 134 URLs generated, no
  duplicates, correct trailing-slash handling on index pages. The old
  hand-maintained `frontend/public/sitemap.xml` (9 URLs) was deleted since
  the generated one now supersedes it on every build.
- DNS: apex has no MX or TXT records at all (confirmed via DoH query — no
  Answer section, only the zone's SOA in Authority). No SPF/DMARC still
  holds as flagged before; also no mail exchanger configured, worth
  confirming that's intentional given `/admin/notify-waitlist` sends mail
  through some other authenticated path.
- Advisory watch: **CVE-2026-48710 ("BadHost")**, a Host-header
  authentication-bypass in Starlette (affects 0.8.3–1.0.0, fixed 1.0.1+),
  disclosed this month and directly relevant since this API runs on
  FastAPI/Starlette. Checked whether it's reachable here: `backend/requirements.txt`
  pins `fastapi>=0.141.1` and doesn't pin `starlette` directly; resolving
  that requirement (`pip install --dry-run`) pulls `starlette==1.6.0`, well
  past the patched floor. **Not exposed as currently specified** — no code
  change needed, but `starlette` still isn't pinned explicitly, so this is
  worth a defensive floor pin (`starlette>=1.0.1`) the next time
  `requirements.txt` is touched, rather than relying on FastAPI's own
  transitive floor staying ahead of it. No other new advisories found
  against Uvicorn, Pydantic, React, Vite, or Fly.io's platform that are
  reachable given how this app uses them (the Vite dev-server WebSocket
  file-read CVEs, and the React Server Components DoS advisory, both need
  features this app doesn't use — dev server exposed publicly, or RSC).

**Open**
| Issue | Severity | Age |
| --- | --- | --- |
| No SPF/DMARC/MX on usemeritai.com apex | Medium | since 2026-08-15 |
| CSP still absent (3 inline-script sites need hashes/nonces) | Medium | since 2026-08-15 |
| Single API region (`ord`), backup posture undocumented | Low | since 2026-08-15 |
| `starlette` not explicitly pinned in requirements.txt | Low | new this run |

**This week's one thing:** the sitemap fix — it's shipped and self-correcting
now, but it was actively wrong (not just incomplete) for at least two and a
half weeks while `/news`, `/models`, `/glossary`, and ~120 individual content
pages went live without ever reaching a crawler through the sitemap.

**Goal:** Ten design partners by 2026-12-31 · 114 days left · this check
doesn't move that measure directly, but the sitemap fix is the single
highest-leverage thing blocking the content arm from indexing, which
`merit-growth` has flagged as its top standing priority since 2026-08-15.

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
