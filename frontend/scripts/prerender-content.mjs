// Runs after both `vite build` (client) and `vite build --ssr` (this
// entry-server) have produced their output. Reads the compiled SSR bundle,
// renders each content page, and writes it to a real .html file in dist/ --
// these are the /architecture, /setup/*, /guides, /prompts, /challenge
// pages, prerendered from React components so they ship as plain static
// HTML instead of client-only SPA routes (which would 404 on a direct
// request -- see ARCHITECTURE.md and merit-ai-team's infra-check skill).
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = join(__dirname, "..");
const distDir = join(projectRoot, "dist");
const ssrOutDir = join(projectRoot, "dist-ssr");

const { renderAll } = await import(join(ssrOutDir, "entry-server.js"));

function documentFor(meta, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<link rel="stylesheet" href="/content.css">
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

const pages = renderAll();

for (const { meta, html } of pages) {
  const outPath = join(distDir, meta.outFile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, documentFor(meta, html));
  console.log(`prerendered ${meta.outFile}`);
}

// sitemap.xml used to be a hand-maintained file in public/ -- it drifted the
// moment a page shipped without someone remembering to also touch it (see
// merit-ai-team's infra-check log). Generating it from the same outFile list
// above means every prerendered page is in the sitemap by construction.
function urlFor(outFile) {
  if (outFile === "index.html") return "https://usemeritai.com/";
  const path = outFile.endsWith("/index.html") ? outFile.slice(0, -"index.html".length) : outFile.replace(/\.html$/, "");
  return `https://usemeritai.com/${path}`;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ meta }) => `  <url><loc>${urlFor(meta.outFile)}</loc></url>`).join("\n")}
</urlset>
`;
writeFileSync(join(distDir, "sitemap.xml"), sitemap);
console.log(`generated sitemap.xml (${pages.length} urls)`);

rmSync(ssrOutDir, { recursive: true, force: true });
