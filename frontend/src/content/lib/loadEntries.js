// Turns a directory of markdown files into the same shape of array every
// content page already expects: parsed frontmatter fields plus rendered HTML.
// This is how the site now picks up new guides, news articles, glossary
// terms, and model entries -- drop a .md file in the matching
// src/content/entries/<type>/ folder and it appears on the next build, no
// other file needs to change. Nothing here ships to the browser: it only
// runs at SSR-build time, inside entry-server.jsx / prerender-content.mjs --
// which is why this reads the filesystem directly with plain Node `fs`
// rather than going through Vite's `import.meta.glob` (that transform is a
// client/browser-bundling concern this code doesn't have).
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { Marked } from "marked";
import { gfmHeadingId, getHeadingList } from "marked-gfm-heading-id";

const marked = new Marked();
marked.use(gfmHeadingId());

// `dir` is an absolute path to a src/content/entries/<type>/ folder.
export function loadEntries(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const raw = readFileSync(`${dir}/${filename}`, "utf8");
      const { data, content } = matter(raw);
      // Match Code.jsx's visual: every fenced code block sits inside a `.card`.
      const html = marked.parse(content).replace(/<pre>/g, '<div class="card"><pre>').replace(/<\/pre>/g, "</pre></div>");
      const headings = getHeadingList();
      return { slug: filename.replace(/\.md$/, ""), ...data, html, headings };
    });
}

// The `<Toc>` component wants `{href, label}` pairs -- built from the H2s
// GFM-heading-id already assigned real ids to during the parse above, so the
// anchors it links to and the ids the rendered HTML actually has always agree.
export function tocFromHeadings(headings) {
  return headings.filter((h) => h.level === 2).map((h) => ({ href: `#${h.id}`, label: h.text }));
}
