// Builds skills-marketplace/plugins/ and .claude-plugin/marketplace.json from
// the SKILL.md files under frontend/public/skills/<role>/claude-skill/SKILL.md
// -- that folder is the single source of truth (it's also what the website's
// download links point at), so this script generates the marketplace rather
// than hand-duplicating each skill's content a second time. Safe to re-run;
// it fully regenerates plugins/ and marketplace.json each time.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SKILLS_SRC = join(ROOT, "frontend", "public", "skills");
const MARKETPLACE_DIR = join(__dirname, "..");
const PLUGINS_DIR = join(MARKETPLACE_DIR, "plugins");

// Minimal YAML reader for exactly the shapes this repo's SKILL.md frontmatter
// actually uses: `key: value` and a folded block scalar (`key: >` followed by
// indented continuation lines, folded to a single space-joined string) --
// not a general YAML parser.
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split("\n");
  const fields = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rest] = m;
    if (rest === ">" || rest === "|") {
      const folded = [];
      while (i + 1 < lines.length && (lines[i + 1].startsWith("  ") || lines[i + 1].trim() === "")) {
        i++;
        folded.push(lines[i].trim());
      }
      fields[key] = folded.filter(Boolean).join(" ");
    } else {
      fields[key] = rest.trim();
    }
  }
  return fields;
}

if (!existsSync(SKILLS_SRC)) {
  console.error(`No skills found at ${SKILLS_SRC} -- run this after the skills library content is built.`);
  process.exit(1);
}

rmSync(PLUGINS_DIR, { recursive: true, force: true });
mkdirSync(PLUGINS_DIR, { recursive: true });

const plugins = [];
for (const roleSlug of readdirSync(SKILLS_SRC).sort()) {
  const skillPath = join(SKILLS_SRC, roleSlug, "claude-skill", "SKILL.md");
  if (!existsSync(skillPath)) continue;

  const content = readFileSync(skillPath, "utf8");
  const fm = parseFrontmatter(content);
  const name = fm.name || roleSlug;

  const pluginDir = join(PLUGINS_DIR, roleSlug);
  const pluginSkillDir = join(pluginDir, "skills", name);
  mkdirSync(pluginSkillDir, { recursive: true });
  mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
  writeFileSync(join(pluginSkillDir, "SKILL.md"), content);

  // description in plugin.json is a short, single-line summary; SKILL.md's
  // own frontmatter description is the fuller triggering description Claude
  // reads, so pull just the first sentence for plugin.json's own metadata.
  const shortDescription = (fm.description || "").split(/(?<=\.)\s/)[0] || `Skill for ${name}`;

  writeFileSync(
    join(pluginDir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name, description: shortDescription, version: "1.0.0" }, null, 2) + "\n"
  );

  plugins.push({ name, source: `./plugins/${roleSlug}`, description: shortDescription });
}

writeFileSync(
  join(MARKETPLACE_DIR, ".claude-plugin", "marketplace.json"),
  JSON.stringify(
    {
      name: "merit-ac-skills-library",
      owner: { name: "Merit AC" },
      metadata: {
        description: "Role-specific Claude Skills -- backend, frontend, security, product, marketing, and more.",
      },
      plugins,
    },
    null,
    2
  ) + "\n"
);

console.log(`Built ${plugins.length} plugin(s) into ${PLUGINS_DIR}`);
console.log(`Wrote ${join(MARKETPLACE_DIR, ".claude-plugin", "marketplace.json")}`);
