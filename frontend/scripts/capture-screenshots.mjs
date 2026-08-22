// Regenerates docs/screenshots/*.png against a running `vite preview`
// server, using the embedded fallback dataset (no backend needed -- see
// src/lib/fallbackData.js). Run via `npm run screenshot` after `npm run
// build && npm run preview`; see .github/workflows/refresh-screenshots.yml
// for how CI drives this on every merge to main.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../docs/screenshots");
// The dashboard moved to /app (app.html) when the site root became the
// marketing/content landing page -- vite preview serves that entry at its
// literal filename, unlike production's Cloudflare routing which resolves
// the extensionless /app.
const BASE_URL = process.env.SCREENSHOT_BASE_URL || "http://localhost:4173/app.html";

const VIEWS = [
  { label: "Overview", file: "overview.png" },
  { label: "People", file: "people.png" },
  { label: "Teams & Roles", file: "teams-roles.png" },
  { label: "Alerts", file: "alerts.png" },
  { label: "Integrations", file: "integrations.png" },
];
const CHART_SETTLE_MS = 300;

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });

  for (const { label, file } of VIEWS) {
    await page.locator(".sb-item").filter({ hasText: label }).click();
    await page.waitForTimeout(CHART_SETTLE_MS);
    await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
    console.log(`captured ${file}`);
  }
} finally {
  await browser.close();
}
