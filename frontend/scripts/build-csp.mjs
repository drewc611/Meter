// Writes the Content-Security-Policy into dist/_headers, after the client
// build and the prerender have both produced their HTML.
//
// The CSP can't just be hand-written into public/_headers, because four pages
// ship an inline <script> -- app.html's pre-paint theme switch, coming-soon's
// ROI calculator, and the waitlist forms on /community and /challenge. Hashing
// them by hand means the policy silently starts blocking the page the first
// time someone edits one of those blocks by a character. Hashing them here,
// from the built output, means it can't go stale.
//
// Everything else is deliberately tight: no 'unsafe-eval', no external script
// origin at all, and frame-ancestors 'none' to match the X-Frame-Options
// header alongside it.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist");
const headersFile = join(distDir, "_headers");

// A <script> with no src= is an inline block; one with src= is a file request
// and is covered by 'self' instead.
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;

function htmlFilesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

function inlineScriptHashes() {
  const hashes = new Set();
  for (const file of htmlFilesIn(distDir)) {
    for (const [, body] of readFileSync(file, "utf8").matchAll(INLINE_SCRIPT)) {
      // The hash covers the element's text content exactly as it appears --
      // no trimming, no normalising. Anything else and the browser's digest
      // won't match ours.
      if (body) hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
    }
  }
  return [...hashes].sort();
}

// styles.css and content.css both @import Google Fonts, which serves the CSS
// from fonts.googleapis.com and the font files themselves from fonts.gstatic.com.
const FONT_CSS = "https://fonts.googleapis.com";
const FONT_FILES = "https://fonts.gstatic.com";
// The dashboard's API. localhost is listed because the same dist/ is what
// `wrangler dev` serves, and api.js points at the local backend whenever the
// page is on localhost (see src/lib/api.js).
const API_ORIGINS = ["https://api.usemeritai.com", "http://localhost:8000"];

function policy() {
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes().join(" ")}`.trim(),
    // 'unsafe-inline' rather than hashes: the charts set style attributes on
    // elements they render, and a hash can't cover an attribute without
    // 'unsafe-hashes'. Inline CSS is a far weaker sink than inline JS, and
    // script-src -- the one that matters -- takes no 'unsafe-inline' at all.
    `style-src 'self' 'unsafe-inline' ${FONT_CSS}`,
    `font-src 'self' ${FONT_FILES}`,
    "img-src 'self' data:",
    `connect-src 'self' ${API_ORIGINS.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const header = `  Content-Security-Policy: ${policy()}`;
// Replace rather than append, so running this twice against the same dist/
// (a re-run, a partial rebuild) doesn't emit two CSP headers -- a browser
// intersects duplicates, so the second one would quietly tighten the first.
const lines = readFileSync(headersFile, "utf8")
  .split("\n")
  .filter((line) => !/^\s*Content-Security-Policy:/i.test(line));
// Cloudflare's _headers format is a path line followed by indented headers.
// The site-wide block is "/*"; attach to that one rather than anywhere else.
const start = lines.findIndex((line) => line.trim() === "/*");
if (start === -1) throw new Error("dist/_headers has no /* block to attach the CSP to");
let end = start + 1;
while (end < lines.length && lines[end].startsWith("  ")) end += 1;
lines.splice(end, 0, header);
writeFileSync(headersFile, lines.join("\n"));

console.log(`csp: ${header.trim().length} bytes over ${inlineScriptHashes().length} inline script hash(es)`);
