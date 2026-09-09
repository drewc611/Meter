import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "guides/index.html",
  title: "Guides — Merit AC",
  description: "General guides on doing AI work well, from the team building Merit AC — governed agentic DevSecOps, and independent field guides on AI systems engineering.",
};

const SECTION_LABELS = {
  devsecops: {
    label: "Governed agentic DevSecOps",
    meta: "Adapted from our own Enterprise Agentic DevSecOps Handbook",
  },
  "systems-engineering": {
    label: "AI systems & engineering",
    meta: "Independent field guides — how AI systems actually work, break, and get evaluated",
  },
};
const SECTION_ORDER = ["devsecops", "systems-engineering"];

// AISystemPatterns.jsx keeps its own hand-built diagrams -- it stays a JSX page
// rather than markdown, so it isn't in `entries`. This is its one manual tile,
// spliced in first (its historical position in this group).
const AI_SYSTEM_PATTERNS_TILE = {
  href: "/guides/ai-system-design-patterns",
  title: "AI system design patterns",
  meta: "Twelve archetypes, six complex agent patterns, and the ML/AI software landscape",
};

export default function GuidesIndex({ entries }) {
  return (
    <ContentLayout active="guides">
      <span className="kicker">Content</span>
      <span className="badge">
        <i /> From the Merit AC team
      </span>
      <h1>Guides</h1>
      <p className="lead">
        General writing on doing AI work well — governed agentic DevSecOps adapted from our own{" "}
        <em>Enterprise Agentic DevSecOps Handbook</em>, plus standalone field guides on how AI
        systems actually work, break, and get evaluated. Looking for{" "}
        <a href="/cloud-architecture">cloud architecture</a> or{" "}
        <a href="/claude-architecture">building with Claude</a>? Those moved to their own sections.
      </p>

      {SECTION_ORDER.map((group) => {
        const section = SECTION_LABELS[group];
        const guides = entries
          .filter((e) => e.group === group)
          .map((e) => ({ href: `/guides/${e.slug}`, title: e.title, meta: e.tileMeta }));
        if (group === "systems-engineering") guides.unshift(AI_SYSTEM_PATTERNS_TILE);
        return (
          <section key={group}>
            <h2>{section.label}</h2>
            <p>{section.meta}</p>
            <div className="grid">
              {guides.map((g) => (
                <a key={g.href} className="tile" href={g.href}>
                  <span className="tile-title">{g.title}</span>
                  <span className="tile-meta">{g.meta}</span>
                </a>
              ))}
            </div>
          </section>
        );
      })}

      <div className="card">
        <p>
          More guides land here over time — no invented statistics or a testimonial standing in for
          a real one, ever.
        </p>
      </div>
    </ContentLayout>
  );
}
