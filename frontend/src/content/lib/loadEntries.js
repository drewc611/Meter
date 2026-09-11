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
import sanitizeHtml from "sanitize-html";

const marked = new Marked();
marked.use(gfmHeadingId());

// marked renders inline HTML in the markdown source verbatim -- it has no
// "escape everything" mode (that option was removed upstream years ago),
// so a `<script>`/`onerror=`/etc. fragment inside a .md file's body would
// otherwise reach the browser unescaped via the dangerouslySetInnerHTML
// calls in GuidePage/Glossary/ModelEntry/NewsArticle. That matters most for
// /news: those entries are drafted and merged by an unattended pipeline
// with no human review gate (see merit-ai-team/docs/merit-news-goal.md),
// so "content this team authored" isn't a safety guarantee for that folder
// the way it is for hand-written guides. Sanitizing every entry type here,
// not just news, keeps this one function the single place that guarantee
// actually holds, rather than something the next new entry type has to
// remember to opt into. Allowlist matches exactly what marked + the
// .card-wrapping below actually produce -- nothing from raw markdown HTML
// survives that isn't already in this list.
const SANITIZE_OPTIONS = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "a", "strong", "em", "code", "pre", "div", "span",
    "ul", "ol", "li", "blockquote", "hr", "br",
    "table", "thead", "tbody", "tr", "th", "td", "img",
  ],
  allowedAttributes: {
    "*": ["id"],
    a: ["href", "title"],
    img: ["src", "alt", "title"],
    code: ["class"], // marked's language-xxx class on fenced code blocks
    div: ["class"], // the .card wrapper added below
  },
  allowedSchemes: ["http", "https", "mailto"],
};

// `dir` is an absolute path to a src/content/entries/<type>/ folder.
export function loadEntries(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const raw = readFileSync(`${dir}/${filename}`, "utf8");
      const { data, content } = matter(raw);
      // Match Code.jsx's visual: every fenced code block sits inside a `.card`.
      const rendered = marked
        .parse(content)
        .replace(/<pre>/g, '<div class="card"><pre>')
        .replace(/<\/pre>/g, "</pre></div>");
      const html = sanitizeHtml(rendered, SANITIZE_OPTIONS);
      const headings = getHeadingList();
      return { slug: filename.replace(/\.md$/, ""), ...data, html, headings };
    });
}

// The `<Toc>` component wants `{href, label}` pairs -- built from the H2s
// GFM-heading-id already assigned real ids to during the parse above, so the
// anchors it links to and the ids the rendered HTML actually has always agree.
// Use `h.raw`, not `h.text` -- `text` is the heading's *rendered* inline HTML
// (an apostrophe comes back as the literal string "&#39;"), while `raw` is
// the actual markdown source text. <Toc> renders label as plain React text
// (no dangerouslySetInnerHTML), so `text` would show those five characters
// literally on the page instead of an apostrophe.
export function tocFromHeadings(headings) {
  return headings.filter((h) => h.level === 2).map((h) => ({ href: `#${h.id}`, label: h.raw }));
}

// A single-pass `<[^>]+>` strip can be bypassed by a crafted nested tag
// (e.g. "<<script>script>" survives one pass as "<script>"), which is
// exactly the "incomplete multi-character sanitization" class CodeQL flags.
// Looping until a pass makes no further change closes that gap. This is
// only ever used to derive short plain-text (a meta description, a
// frontmatter field) from content this team authored, not to sanitize
// untrusted input for safe rendering -- if that need ever comes up, use a
// real HTML parser instead of a regex.
export function stripTags(html) {
  let prev;
  let result = html;
  do {
    prev = result;
    result = result.replace(/<[^>]+>/g, "");
  } while (result !== prev);
  return result;
}
