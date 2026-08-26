# Merit AC frontend

The dashboard (Overview, People, Teams & Roles, Alerts, Integrations) is a
Vite + React app under `src/` — no TypeScript, plain `.jsx`, functional
components + hooks, no state library beyond React context. Its HTML entry is
`app.html`, deployed at `/app`, **not the site root** — see below for what
lives at `/` instead. `coming-soon.html` is a separate, unrelated static
HTML page (the old pre-launch placeholder — waitlist form + ROI calculator,
plain JS, no React) built as its own Vite entry so it still ships with a
hashed `styles.css` reference without being pulled into the React bundle;
it isn't linked from anywhere live, just still present in the repo.

The content-site pages (`/`, `/architecture`, `/setup/*`, `/news`,
`/models`, `/glossary`, `/guides`, `/prompts`, `/challenge`, `/community`)
are real React components under `src/content/` — but they
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
needing Vite's HTML-entry asset pipeline. `/guides` and `/prompts` are
published (three long-form guides, a 30-day prompt archive); `/news` and
`/models` carry a sourcing discipline of their own (every entry needs a
real citation, `/models` entries also a `verifiedDate`) — don't add
fabricated articles/entries/prompts to any of them to make them look more
finished than they are.

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

## Layout

```
app.html                Vite entry for the dashboard — React root + <link> to styles.css, deployed at /app
coming-soon.html        Separate static Vite entry, untouched by the React app
styles.css              Shared stylesheet, referenced by both HTML entries
public/
  content.css           Shared stylesheet for the content-site pages
  robots.txt, sitemap.xml
scripts/
  prerender-content.mjs Post-build: renders src/content pages to dist/*.html
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
    pages/                Home (site root), Architecture,
                           SetupReact/Python/Node/TensorflowPyro,
                           NewsIndex/NewsArticle, ModelsDirectory, Glossary,
                           GuidesIndex + 3 guide pages, PromptsIndex/PromptDay,
                           Challenge, Community
    data/                  news.js, models.js, glossary.js, prompts.js —
                           plain exported arrays the index/detail pages read
```

## Linting

No local lint script — CI runs ESLint on push. To run it yourself from the
repo root:

```bash
npx eslint . --config .eslintrc.js --ext .js,.jsx,.ts,.tsx
```
