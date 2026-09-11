import ContentLayout from "../components/ContentLayout.jsx";
import { stripTags } from "../lib/loadEntries.js";

export function skillMeta(entry) {
  return {
    outFile: `skills/${entry.slug}.html`,
    title: `${entry.role} — Merit AC Skills Library`,
    description: stripTags(entry.html).slice(0, 200),
  };
}

const CATEGORY_LABELS = {
  engineering: "Engineering",
  "product-design": "Product & design",
  marketing: "Marketing & growth",
  "data-analytics": "Data & analytics",
  "leadership-ops": "Leadership & operations",
};

const ARTIFACTS = [
  {
    key: "claude",
    label: "Claude Skill",
    file: "claude-skill/SKILL.md",
    install: (
      <>
        Save as <code>.claude/skills/&lt;name&gt;/SKILL.md</code> in your project, or under{" "}
        <code>~/.claude/skills/</code> to use it everywhere.
      </>
    ),
  },
  {
    key: "copilot",
    label: "Copilot chat mode",
    file: "copilot.chatmode.md",
    install: (
      <>
        Save as <code>.github/chatmodes/&lt;name&gt;.chatmode.md</code> in your repo, then pick it
        from Copilot Chat's mode dropdown in VS Code.
      </>
    ),
  },
  {
    key: "chatgpt",
    label: "ChatGPT Custom GPT",
    file: "chatgpt-custom-gpt.md",
    install: (
      <>
        Open <i>Create a GPT</i> in ChatGPT, open the Configure tab, and paste in the Name,
        Description, and Instructions exactly as given.
      </>
    ),
  },
];

export default function SkillEntry({ entry }) {
  return (
    <ContentLayout active="skills">
      <span className="kicker">{CATEGORY_LABELS[entry.category]}</span>
      <h1>{entry.role}</h1>
      <p className="lead">{entry.tagline}</p>

      <div className="card">
        <div dangerouslySetInnerHTML={{ __html: entry.html }} />
      </div>

      <h2>Download</h2>
      <div className="grid">
        {ARTIFACTS.map((a) => (
          <div key={a.key} className="tile" style={{ display: "block" }}>
            <span className="tile-title">
              <a href={`/skills/${entry.slug}/${a.file}`} download>
                {a.label}
              </a>
            </span>
            <span className="tile-meta">{a.install}</span>
          </div>
        ))}
      </div>

      <p>
        <a href="/skills">← All skills</a>
      </p>
    </ContentLayout>
  );
}
