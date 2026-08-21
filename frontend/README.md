# Merit frontend

The dashboard (Overview, People, Teams & Roles, Alerts, Integrations) is a
Vite + React app under `src/` — no TypeScript, plain `.jsx`, functional
components + hooks, no state library beyond React context. `coming-soon.html`
is a separate, unrelated static HTML page (the old pre-launch placeholder —
waitlist form + ROI calculator, plain JS, no React) built as its own Vite
entry so it still ships with a hashed `styles.css` reference without being
pulled into the React bundle.

The content-site pages (`/architecture`, `/setup/*`, `/guides`, `/prompts`,
`/challenge`) are real React components under `src/content/` — but they
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
needing Vite's HTML-entry asset pipeline. `guides/` and `prompts/` render as
honest "nothing published yet" pages until real content exists — don't add
fabricated articles/prompts to make them look more finished than they are.

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
index.html             Vite entry — React root + <link> to styles.css
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
    pages/                Architecture, SetupReact/Python/Node/TensorflowPyro,
                           GuidesIndex, PromptsIndex, Challenge
```

## Linting

No local lint script — CI runs ESLint on push. To run it yourself from the
repo root:

```bash
npx eslint . --config .eslintrc.js --ext .js,.jsx,.ts,.tsx
```
