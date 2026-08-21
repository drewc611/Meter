import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// HTML entries: index.html is the React dashboard, coming-soon.html is the
// old pre-launch static page (waitlist form + ROI calculator, plain JS, no
// React) -- kept as its own entry so it still builds and gets a hashed
// styles.css reference, without being pulled into the React bundle. The
// content-site pages below (architecture, setup/*, guides, prompts,
// challenge) are the same pattern: plain static HTML + content.css, no
// React, so they stay real, crawlable pages instead of client-only SPA
// routes that would 404 on a direct request -- see ARCHITECTURE.md and the
// merit-ai-team infra-check skill for why that matters here specifically.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        comingSoon: resolve(__dirname, "coming-soon.html"),
        architecture: resolve(__dirname, "architecture.html"),
        setupReact: resolve(__dirname, "setup/react.html"),
        setupPython: resolve(__dirname, "setup/python.html"),
        setupNode: resolve(__dirname, "setup/node.html"),
        setupTensorflowPyro: resolve(__dirname, "setup/tensorflow-pyro.html"),
        guides: resolve(__dirname, "guides/index.html"),
        prompts: resolve(__dirname, "prompts/index.html"),
        challenge: resolve(__dirname, "challenge.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});
