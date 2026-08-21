import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Two build modes share this config:
//  - the normal client build (`vite build`) -- the React dashboard
//    (app.html, reachable at /app) plus coming-soon.html, the old
//    pre-launch static page. The site root ("/") is NOT this build's
//    output -- it's the prerendered `home` page below, so an anonymous
//    visitor lands on the marketing/content design instead of the
//    auth-gated dashboard. Signing in links to /app.
//  - the SSR build (`vite build --ssr src/content/entry-server.jsx`) --
//    compiles the content-site React components (home, architecture,
//    setup/*, guides, prompts, challenge) into a Node-runnable bundle,
//    which scripts/prerender-content.mjs then executes to write real
//    static HTML files into dist/ (home's output IS dist/index.html --
//    that's what makes it the site root). That's what keeps those pages
//    crawlable (a real file at each clean path) instead of client-only SPA
//    routes that would 404 on a direct request -- see ARCHITECTURE.md and
//    the merit-ai-team infra-check skill for why that distinction matters
//    here specifically.
//    `npm run build` runs both, in order (see package.json).
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: isSsrBuild
    ? {
        rollupOptions: {
          input: resolve(__dirname, "src/content/entry-server.jsx"),
        },
      }
    : {
        rollupOptions: {
          input: {
            app: resolve(__dirname, "app.html"),
            comingSoon: resolve(__dirname, "coming-soon.html"),
          },
        },
      },
  server: {
    port: 5173,
  },
}));
