# Merit AC frontend

The dashboard (Overview, People, Teams & Roles, Alerts, Integrations) is a
Vite + React app under `src/` — no TypeScript, plain `.jsx`, functional
components + hooks, no state library beyond React context. Its HTML entry is
`app.html`, deployed at `/app`, **not the site root** — see below for what
lives at `/` instead. `coming-soon.html` is a separate, unrelated static
HTML page (the old pre-launch placeholder — waitlist form + ROI calculator,
plain JS, no React) built as its own Vite entry so it still ships with a
hashed `styles.css` reference without being pulled into the React bundle.
Being a build input, it ships to `dist/coming-soon.html` and is reachable
live at `/coming-soon.html` — it just isn't linked from anywhere in the
site's navigation.

The content-site pages (`/`, `/architecture`, `/setup/*`, `/news`,
`/newsletter`, `/models`, `/glossary`, `/guides`, `/prompts`, `/challenge`,
`/community`, `/operator-os`) are real React components under `src/content/`
— but they
**prerender to plain static HTML at build time**, not client-rendered SPA
routes, so each one ships as a real, crawlable file at its clean path
instead of an empty shell that would 404 on a direct request (the
SPA-fallback gap tracked in `merit-ai-team`'s infra-check skill). `npm run
build` does this in three steps (see `package.json`): the normal client
build, an SSR build of `src/content/entry-server.jsx`
(`vite build --ssr … --outDir dist-ssr`), then
`scripts/prerender-content.mjs`, which imports that compiled bundle, calls
`renderToStaticMarkup` on each page, and writes the result straight into
`dist/` at the right path — `dist-ssr/` itself is a build-time scratch
directory, gitignored and deleted automatically once prerendering finishes.
Shared layout lives in `src/content/components/` (`ContentLayout.jsx` for
the header/nav/footer, `Toc.jsx`, `Code.jsx`); `content.css` lives in
`public/` so it copies through as a stable, unhashed `/content.css` without
needing Vite's HTML-entry asset pipeline.

**Guides, news, glossary, and models are markdown-driven.** Each entry is one
`.md` file under `src/content/entries/<type>/` (`news/`, `glossary/`,
`models/`, `guides/`, `cloud-architecture/`, `claude-architecture/`) —
YAML frontmatter for the structured fields, a markdown body for the prose.
Adding a new one is dropping a file in the right folder and running
`npm run build`; no JS array or JSX component needs to change, and it shows
up on the matching index page automatically. `src/content/lib/loadEntries.js`
reads the directory, parses frontmatter with `gray-matter`, and renders the
body with `marked` (plus `marked-gfm-heading-id` so heading anchors match
what `<Toc>` links to); `entry-server.jsx` calls it once per type and feeds
the results through the same template-component pattern `NEWS_ARTICLES` used
before this refactor — one shared page component per content type
(`GuidePage.jsx`, `ModelEntry.jsx`, `NewsArticle.jsx`) rendered once per
markdown file. The one exception is `pages/guides/AISystemPatterns.jsx`,
which keeps its own hand-built diagram components (`LinearDiagram`,
`LoopDiagram`, `HubDiagram`) that markdown can't represent — it stays a
normal JSX page, imported into `entry-server.jsx` directly.

Every content type still carries its own sourcing discipline regardless of
format: news needs a real citation in `sources`, models need a `sourceUrl`
and `verifiedDate`. Don't add fabricated articles/entries/prompts to any of
them to make them look more finished than they are — the markdown format
makes adding a *real* entry easier, not the bar for what counts as one
lower.

**Newsletter posts sync automatically from an RSS/Atom feed.**
`scripts/sync-newsletter.mjs` runs as the first step of `npm run build`: it
reads `MERIT_NEWSLETTER_RSS_URL`, fetches that feed, and writes any post not
already on disk into `src/content/entries/newsletter/<slug>.md` — same
frontmatter-plus-body shape `loadEntries.js` already expects, so `/newsletter`
and each post's own page (`NewsletterIndex.jsx` / `NewsletterEntry.jsx`) work
exactly like every other markdown-driven section above. The env var is unset
by default, which makes the script a no-op (`/newsletter` just renders its
empty state) rather than a build failure — set it locally or in the deploy
environment to point it at a real feed. It's additive and idempotent: an
existing post on disk is never overwritten or deleted, so a hand-edited
synced post, or one whose upstream post disappeared, stays put across
reruns. The post body it writes is the feed's own excerpt, not full
republished content — each entry links out to the real post via its `link`
frontmatter field (validated with `isSafeUrl`, since feed content is
untrusted external input, same treatment `sources[].url` gets in `/news`).

## Commands

```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173
npm run build       # production build -> dist/
npm run preview     # serve the dist/ build locally
```

`npm run dev` and `npm run build` both need the backend running at
`http://localhost:8000` to show live data (`cd ../backend && make run`) —
without it, the dashboard falls back to the embedded demo snapshot in
`src/lib/fallbackData.js` and the sidebar badge shows DEMO instead of LIVE.

Set `MERIT_NEWSLETTER_RSS_URL` before `npm run build` to sync newsletter
posts from a real feed (see "Newsletter posts sync automatically" above);
leave it unset for a build with an empty `/newsletter` section.

## Layout

```
app.html                Vite entry for the dashboard — React root + <link> to styles.css, deployed at /app
coming-soon.html        Separate static Vite entry, untouched by the React app — ships to /coming-soon.html, unlinked
styles.css              Shared stylesheet, referenced by both HTML entries
public/
  content.css           Shared stylesheet for the content-site pages
  robots.txt             Static; sitemap.xml is generated (see below), not hand-maintained
scripts/
  sync-newsletter.mjs    Pre-build: fetches MERIT_NEWSLETTER_RSS_URL (if set) and writes any
                         new post into src/content/entries/newsletter/ -- see above
  prerender-content.mjs Post-build: renders src/content pages to dist/*.html, then writes
                         dist/sitemap.xml from that same page list -- every prerendered
                         page (including individual guide/prompt/news/model/newsletter
                         entries) is in the sitemap by construction, so it can't go stale
                         the way the old hand-maintained public/sitemap.xml did
src/
  main.jsx              React root
  App.jsx                Top-level layout + view switching
  context/
    AppDataContext.jsx   Data fetching (live API + demo fallback), auth/session state
  lib/
    api.js               API_BASE, fetch helpers, token storage
    fallbackData.js       Embedded demo snapshot (ES module)
    format.js             Formatters shared across views
  components/             Sidebar, Topbar, AuthGate, chart components, shared table bits
  views/                  Overview, People, Teams, Alerts, Integrations
  content/                Prerendered content-site pages (see above)
    entry-server.jsx      SSR entry — renderAll(), consumed by the prerender script
    components/           ContentLayout, Toc, Code
    lib/
      loadEntries.js       Reads a src/content/entries/<type>/ dir -> parsed {slug, ...frontmatter, html} array
    pages/                Home (site root), Architecture,
                           SetupReact/Python/Node/TensorflowPyro,
                           NewsIndex/NewsArticle, NewsletterIndex/NewsletterEntry,
                           ModelsDirectory/ModelEntry, Glossary,
                           GuidesIndex/GuidePage, CloudArchitectureIndex, ClaudeArchitectureIndex,
                           guides/AISystemPatterns.jsx (hand-built diagrams, not markdown-driven),
                           PromptsIndex/PromptDay, Challenge, Community, OperatorOS
    entries/                One .md file per entry -- news/, newsletter/ (synced, see above),
                           glossary/, models/, guides/, cloud-architecture/, claude-architecture/
    data/                  prompts.js, paidTrack.js -- still plain exported arrays
```

## Linting

No local lint script — CI runs ESLint on push. To run it yourself from the
repo root:

```bash
npx eslint . --config .eslintrc.js --ext .js,.jsx,.ts,.tsx
```
