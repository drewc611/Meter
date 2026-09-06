// ONE-TIME migration: converts the old JS-array (news/glossary/models) and
// per-topic-JSX (guides/cloud-architecture/claude-architecture) content into
// markdown files under src/content/entries/<type>/. Run once with
// `node scripts/migrate-to-markdown.mjs`, then spot-check the output against
// the source before deleting the old files. Not part of the ongoing build --
// safe to delete after migration, kept for now as a record of how it was done.
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import matter from "gray-matter";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stripTags } from "../src/content/lib/loadEntries.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const entriesDir = join(root, "src/content/entries");

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", emDelimiter: "_" });
turndown.use(gfm);
// A `.card` div is a styled callout in the original design -- represent it as
// a blockquote (a markdown-native "this is set apart" convention) so the
// meaning survives the round trip. A card that's just a Code.jsx wrapper
// around a single <pre> is left alone so turndown's built-in fenced-code-block
// rule handles it -- that produces a plain ``` block, which is what a Code.jsx
// block always was.
turndown.addRule("card", {
  filter: (node) =>
    node.nodeName === "DIV" &&
    node.classList.contains("card") &&
    !(node.children.length === 1 && node.children[0].nodeName === "PRE"),
  replacement: (content) =>
    "\n\n" +
    content
      .trim()
      .split("\n")
      .map((line) => (line ? `> ${line}` : ">"))
      .join("\n") +
    "\n\n",
});

function writeEntry(type, slug, frontmatter, body) {
  const dir = join(entriesDir, type);
  mkdirSync(dir, { recursive: true });
  const file = matter.stringify(body.trim() + "\n", frontmatter);
  writeFileSync(join(dir, `${slug}.md`), file);
}

// ---- News, glossary, models: already plain data arrays, no rendering needed ----
async function migrateDataArrays() {
  const { NEWS_ARTICLES } = await import("../src/content/data/news.js");
  for (const a of NEWS_ARTICLES) {
    const { slug, body, ...rest } = a;
    const md = body.map((b) => (b.type === "h2" ? `## ${b.text}` : b.text)).join("\n\n");
    writeEntry("news", slug, rest, md);
  }
  console.log(`news: ${NEWS_ARTICLES.length} entries`);

  const { GLOSSARY } = await import("../src/content/data/glossary.js");
  for (const g of GLOSSARY) {
    const { slug, definition, ...rest } = g;
    writeEntry("glossary", slug, rest, definition);
  }
  console.log(`glossary: ${GLOSSARY.length} entries`);

  const { MODELS } = await import("../src/content/data/models.js");
  for (const m of MODELS) {
    const { slug, description, ...rest } = m;
    writeEntry("models", slug, rest, description);
  }
  console.log(`models: ${MODELS.length} entries`);
}

// ---- Guides / cloud-architecture / claude-architecture: rendered JSX -> markdown ----
// tileMeta/group text as it exists today in GuidesIndex.jsx, CloudArchitectureIndex.jsx,
// and ClaudeArchitectureIndex.jsx -- transcribed here since it lives only in those
// index pages' hardcoded arrays, not on the guide page itself.
const GUIDE_META = {
  "ten-disciplines-of-governed-agentic-devsecops": {
    group: "devsecops",
    tileMeta: "The recurring control points for running Claude Code safely at enterprise scale",
  },
  "fourteen-domains-of-the-governed-agentic-platform": {
    group: "devsecops",
    tileMeta: "A map from platform operating model to GovCloud, with the service reference table",
  },
  "four-control-boundaries": {
    group: "devsecops",
    tileMeta: "Code generation is the easy part — the short version, in four boundaries",
  },
  "ai-evaluation-methods": {
    group: "systems-engineering",
    tileMeta: "Rubrics, LLM-as-judge, and benchmarks — when to use which, and how judges fail",
  },
  "rag-failure-modes": {
    group: "systems-engineering",
    tileMeta: "A debugging field guide — retrieval failure, lost-in-the-middle, reranking, chunking",
  },
  "context-engineering": {
    group: "systems-engineering",
    tileMeta: "What actually competes for space in the context window, and how to manage it",
  },
};
const CLOUD_ARCH_META = {
  "multi-cloud-and-hybrid-cloud-architecture": "What multi-cloud actually means in practice, and when the complexity tax is worth it",
  "serverless-architecture-patterns": "Cold starts, the state problem, and when serverless is actually cheaper",
  "microservices-vs-monolith": "What genuinely motivates a split, and the distributed-monolith anti-pattern",
  "event-driven-architecture": "Notification vs. state transfer vs. event sourcing, and the dual-write problem",
  "cloud-networking-fundamentals": "VPCs, subnets, peering, and the actual path a request takes to a private database",
  "disaster-recovery-and-multi-region-architecture": "RTO and RPO first, then the pilot-light-to-active-active spectrum",
  "cloud-security-architecture-zero-trust": "Why identity is the real perimeter, and the failure patterns that actually happen",
  "cloud-cost-optimization": "Architecture patterns that actually save money, not just a billing-dashboard exercise",
  "cloud-providers-compared": "AWS, Azure, GCP, and the specialized, developer-first, and edge-first alternatives",
  "choosing-a-cloud-provider": "A decision framework — the real inputs, and the switching-cost trap",
};
const CLAUDE_ARCH_META = {
  "building-agents-with-claude-the-agentic-loop": "The anatomy of one loop iteration, stopping conditions, and approval boundaries",
  "claude-tool-use-and-function-calling": "Tool descriptions as an API contract, parallel vs. sequential calls, error design",
  "claude-and-mcp": "Client and server, tools vs. resources vs. prompts, local vs. remote servers",
  "prompt-caching-architecture": "Structuring prompts so the static part actually caches, and where it pays off",
  "claude-computer-use-architecture": "When UI-driving beats an API, and why it needs tighter constraints, not looser ones",
  "extended-thinking-architecture": "Routing genuinely hard requests to deeper reasoning, not defaulting it everywhere",
};

const GUIDE_FILES = [
  ["guides", "TenDisciplines"],
  ["guides", "FourteenDomains"],
  ["guides", "FourControlBoundaries"],
  ["guides", "AIEvaluationMethods"],
  ["guides", "RagFailureModes"],
  ["guides", "ContextEngineering"],
  ["cloud-architecture", "MultiCloudHybridArchitecture"],
  ["cloud-architecture", "ServerlessArchitecturePatterns"],
  ["cloud-architecture", "MicroservicesVsMonolith"],
  ["cloud-architecture", "EventDrivenArchitecture"],
  ["cloud-architecture", "CloudNetworkingFundamentals"],
  ["cloud-architecture", "DisasterRecoveryMultiRegion"],
  ["cloud-architecture", "CloudSecurityZeroTrust"],
  ["cloud-architecture", "CloudCostOptimization"],
  ["cloud-architecture", "CloudProvidersCompared"],
  ["cloud-architecture", "ChoosingACloudProvider"],
  ["claude-architecture", "AgenticLoopWithClaude"],
  ["claude-architecture", "ClaudeToolUse"],
  ["claude-architecture", "ClaudeAndMCP"],
  ["claude-architecture", "PromptCachingArchitecture"],
  ["claude-architecture", "ClaudeComputerUse"],
  ["claude-architecture", "ExtendedThinkingArchitecture"],
];

function clean(text) {
  if (!text) return text;
  return stripTags(text)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function extractTag(html, tagRegex) {
  const m = html.match(tagRegex);
  return m ? { text: m[1], html: html.slice(0, m.index) + html.slice(m.index + m[0].length) } : { text: null, html };
}

async function migrateGuides(vite) {
  for (const [section, name] of GUIDE_FILES) {
    const modPath = `/src/content/pages/${section}/${name}.jsx`;
    const mod = await vite.ssrLoadModule(modPath);
    const rendered = renderToStaticMarkup(mod.default());
    const wide = /<main class="content wide"/.test(rendered);

    let html = rendered.match(/<main[^>]*>([\s\S]*)<\/main>/)[1];
    let r;
    r = extractTag(html, /<span class="kicker">([\s\S]*?)<\/span>/);
    const kicker = r.text;
    html = r.html;
    r = extractTag(html, /<span class="badge">([\s\S]*?)<\/span>/);
    const badge = r.text ? r.text.replace(/<i><\/i>\s*/, "").trim() : null;
    html = r.html;
    r = extractTag(html, /<h1>([\s\S]*?)<\/h1>/);
    const title = r.text;
    html = r.html;
    r = extractTag(html, /<p class="lead">([\s\S]*?)<\/p>/);
    const lead = r.text;
    html = r.html;
    html = html.replace(/<nav class="toc"[\s\S]*?<\/nav>/, "");

    const slug = mod.meta.outFile.split("/").pop().replace(".html", "");
    const body = turndown.turndown(html);

    const extra =
      section === "guides"
        ? GUIDE_META[slug]
        : section === "cloud-architecture"
          ? { tileMeta: CLOUD_ARCH_META[slug] }
          : { tileMeta: CLAUDE_ARCH_META[slug] };

    const cleanLead = clean(lead);
    const frontmatter = {
      title: clean(title),
      description: mod.meta.description,
      kicker: clean(kicker),
      ...(badge ? { badge: clean(badge) } : {}),
      ...(cleanLead && cleanLead !== mod.meta.description ? { lead: cleanLead } : {}),
      ...(wide ? { wide: true } : {}),
      ...extra,
    };
    writeEntry(section, slug, frontmatter, body);
  }
  console.log(`guides/cloud-architecture/claude-architecture: ${GUIDE_FILES.length} entries`);
}

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", root });
try {
  await migrateDataArrays();
  await migrateGuides(vite);
} finally {
  await vite.close();
}
