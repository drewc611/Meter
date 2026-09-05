import ContentLayout from "../components/ContentLayout.jsx";
import { PROMPTS } from "../data/prompts.js";

export const meta = {
  outFile: "prompts/index.html",
  title: "Prompts — Merit AC",
  description: "A 30-day detailed AI prompt archive on governed agentic DevSecOps, adapted from our own reference handbook.",
};

const SECTIONS = [
  { label: "Days 1–10 · The ten control disciplines", days: [1, 10] },
  { label: "Days 11–24 · The fourteen domains", days: [11, 24] },
  { label: "Days 25–30 · Build the capstone project", days: [25, 30] },
];

export default function PromptsIndex() {
  return (
    <ContentLayout active="prompts">
      <span className="kicker">Content</span>
      <span className="badge">
        <i /> 30 days, all real
      </span>
      <h1>Prompts</h1>
      <p className="lead">
        A daily prompt archive on governed agentic DevSecOps — the prompt itself, why it's built
        that way, and what to do with the answer. Adapted from our own{" "}
        <em>Enterprise Agentic DevSecOps Handbook</em>: ten recurring control disciplines, a tour of
        fourteen platform domains, then six days building the capstone project behind{" "}
        <a href="/challenge">the challenge</a>.
      </p>
      <p>
        Every prompt is a full role, context, numbered-steps, constraints, and output-format brief —
        copy it as-is into ChatGPT, Claude, or any other assistant. Where a step needs your repo or
        pipeline config, the prompt tells you what to paste in first.
      </p>

      {SECTIONS.map((section) => (
        <div key={section.label}>
          <h2>{section.label}</h2>
          <div className="grid">
            {PROMPTS.filter((p) => p.day >= section.days[0] && p.day <= section.days[1]).map((p) => (
              <a key={p.day} className="tile" href={`/prompts/day-${p.day}-${p.slug}`}>
                <span className="tile-title">Day {p.day}: {p.title}</span>
                <span className="tile-meta">{p.track}</span>
              </a>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <p>
          <b>Looking for something other than the daily archive?</b> The{" "}
          <a href="/prompts/composed-and-advanced-prompts">composed &amp; advanced prompt library</a>{" "}
          has 235 more — prompts that combine multiple{" "}
          <a href="/guides/ai-system-design-patterns">AI system design patterns</a> for real,
          non-trivial work, each one naming exactly which patterns it's built from.
        </p>
      </div>
    </ContentLayout>
  );
}
