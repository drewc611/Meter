import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Two HTML entries: index.html is the React dashboard, coming-soon.html is
// the old pre-launch static page (waitlist form + ROI calculator, plain JS,
// no React) -- kept as its own entry so it still builds and gets a hashed
// styles.css reference, without being pulled into the React bundle.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        comingSoon: resolve(__dirname, "coming-soon.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});
