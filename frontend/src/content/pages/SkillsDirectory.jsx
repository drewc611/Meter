import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "skills.html",
  title: "AI Skills Library — Merit AC",
  description:
    "A library of role-specific AI skills and agents -- a real Claude Skill, a real GitHub Copilot custom chat mode, and a ChatGPT Custom GPT config for every role, from backend engineer to CEO.",
};

const CATEGORY_LABELS = {
  engineering: "Engineering",
  "product-design": "Product & design",
  marketing: "Marketing & growth",
  "data-analytics": "Data & analytics",
  "leadership-ops": "Leadership & operations",
};

const CATEGORY_ORDER = ["engineering", "product-design", "marketing", "data-analytics", "leadership-ops"];

export default function SkillsDirectory({ entries }) {
  return (
    <ContentLayout active="skills">
      <span className="kicker">Reference</span>
      <h1>AI skills library</h1>
      <p className="lead">
        One role, three real artifacts: a Claude Skill you drop in <code>.claude/skills/</code>, a
        GitHub Copilot custom chat mode you drop in <code>.github/chatmodes/</code>, and a config you
        paste straight into ChatGPT's Custom GPT builder. Not prompt snippets to retype -- files built
        to each platform's actual spec, ready to install.
      </p>

      <div className="card">
        <p className="tile-title" style={{ marginBottom: "6px" }}>
          How to use one
        </p>
        <p style={{ marginBottom: "6px" }}>
          <b>Claude Skill</b> — save the file as <code>.claude/skills/&lt;name&gt;/SKILL.md</code> in
          your project (or <code>~/.claude/skills/&lt;name&gt;/SKILL.md</code> for every project),
          restart Claude Code, then call it by name or let it trigger on its own.
        </p>
        <p style={{ marginBottom: "6px" }}>
          <b>Copilot chat mode</b> — save the file as{" "}
          <code>.github/chatmodes/&lt;name&gt;.chatmode.md</code> in your repo. In VS Code's Copilot
          Chat, pick it from the chat-mode dropdown.
        </p>
        <p style={{ marginBottom: 0 }}>
          <b>ChatGPT Custom GPT</b> — open <i>Create a GPT</i> in ChatGPT, switch to the Configure tab,
          and paste the Name, Description, and Instructions fields exactly as given.
        </p>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const items = entries.filter((s) => s.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h2>{CATEGORY_LABELS[category]}</h2>
            <div className="grid">
              {items.map((s) => (
                <a key={s.slug} id={s.slug} className="tile" href={`/skills/${s.slug}`}>
                  <span className="tile-title">{s.role}</span>
                  <span className="tile-meta">{s.tagline}</span>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </ContentLayout>
  );
}
