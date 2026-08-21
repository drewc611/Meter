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

for (const { meta, html } of renderAll()) {
  const outPath = join(distDir, meta.outFile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, documentFor(meta, html));
  console.log(`prerendered ${meta.outFile}`);
}

rmSync(ssrOutDir, { recursive: true, force: true });
