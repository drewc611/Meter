# Merit frontend

The dashboard (Overview, People, Teams & Roles, Alerts, Integrations) is a
Vite + React app under `src/` — no TypeScript, plain `.jsx`, functional
components + hooks, no state library beyond React context. `coming-soon.html`
is a separate, unrelated static HTML page (the old pre-launch placeholder —
waitlist form + ROI calculator, plain JS, no React) built as its own Vite
entry so it still ships with a hashed `styles.css` reference without being
pulled into the React bundle.

The content-site pages (`architecture.html`, `setup/*.html`, `guides/`,
`prompts/`, `challenge.html`) are the same pattern: plain static HTML, no
React, sharing `content.css`. Each is its own Vite build entry (see
`vite.config.js`) so it ships as a real file at a clean path
(`/architecture`, `/setup/react`, `/guides`, …) instead of a client-only SPA
route — the latter would 404 on a direct request, per the SPA-fallback gap
tracked in `merit-ai-team`'s infra-check skill. `guides/` and `prompts/` ship
as honest "nothing published yet" index pages until real content exists;
don't add fabricated articles/prompts to make them look more finished than
they are.

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
index.html            Vite entry — React root + <link> to styles.css
coming-soon.html       Separate static Vite entry, untouched by the React app
styles.css             Shared stylesheet, referenced by both HTML entries
src/
  main.jsx             React root
  App.jsx               Top-level layout + view switching
  context/
    AppDataContext.jsx  Data fetching (live API + demo fallback), auth/session state
  lib/
    api.js              API_BASE, fetch helpers, token storage
    fallbackData.js      Embedded demo snapshot (ES module)
    format.js            Formatters shared across views
  components/            Sidebar, Topbar, AuthGate, chart components, shared table bits
  views/                 Overview, People, Teams, Alerts, Integrations
```

## Linting

No local lint script — CI runs ESLint on push. To run it yourself from the
repo root:

```bash
npx eslint . --config .eslintrc.js --ext .js,.jsx,.ts,.tsx
```
