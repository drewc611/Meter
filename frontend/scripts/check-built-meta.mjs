// A regression check against dist/, run as the last step of `npm run build`.
//
// There is no frontend test runner in this repo (package.json has no `test`
// script, and no vitest/jest/testing-library anywhere), so a defect in the
// prerenderer's own output has nothing to catch it. This script is the
// assertion target instead: it walks the built HTML and fails the build if
// either of two defects this repo has actually shipped comes back --
//   1. a raw newline inside <meta name="description" content="...">, from a
//      soft-wrapped markdown source surviving stripTags unstripped
//      (see loadEntries.js's stripTags -- fixed, this checks it stays fixed)
//   2. a literal `&#39;&#39;` in the page, from a single-quoted-scalar
//      escape convention (`''`) copied into a YAML folded block scalar
//      (`dek: >-`) where it has no escape meaning
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist");

const DESCRIPTION_NEWLINE = /<meta name="description" content="[^"]*\n[^"]*"/;
const DOUBLED_APOSTROPHE = /&#39;&#39;/;

function htmlFilesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

const files = htmlFilesIn(distDir);
const newlineOffenders = [];
const apostropheOffenders = [];
let withDescription = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  if (/<meta name="description" content="/.test(html)) withDescription += 1;
  if (DESCRIPTION_NEWLINE.test(html)) newlineOffenders.push(file);
  if (DOUBLED_APOSTROPHE.test(html)) apostropheOffenders.push(file);
}

console.log(`check-built-meta: scanned ${files.length} pages, ${withDescription} carry a meta description`);

if (newlineOffenders.length > 0) {
  console.error(`check-built-meta: raw newline in meta description on ${newlineOffenders.length} page(s):`);
  for (const file of newlineOffenders) console.error(`  ${file}`);
}
if (apostropheOffenders.length > 0) {
  console.error(`check-built-meta: doubled apostrophe (&#39;&#39;) on ${apostropheOffenders.length} page(s):`);
  for (const file of apostropheOffenders) console.error(`  ${file}`);
}
if (newlineOffenders.length > 0 || apostropheOffenders.length > 0) {
  process.exit(1);
}
