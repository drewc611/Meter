import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "guides/index.html",
  title: "Guides — Merit AC",
  description: "General guides on doing AI work well, from the team building Merit AC — governed agentic DevSecOps, and independent field guides on AI systems engineering.",
};

const SECTIONS = [
  {
    label: "Governed agentic DevSecOps",
    meta: "Adapted from our own Enterprise Agentic DevSecOps Handbook",
    guides: [
      {
        href: "/guides/ten-disciplines-of-governed-agentic-devsecops",
        title: "The ten disciplines of governed agentic DevSecOps",
        meta: "The recurring control points for running Claude Code safely at enterprise scale",
      },
      {
        href: "/guides/fourteen-domains-of-the-governed-agentic-platform",
        title: "Fourteen domains of the governed agentic platform",
        meta: "A map from platform operating model to GovCloud, with the service reference table",
      },
      {
        href: "/guides/four-control-boundaries",
        title: "Four control boundaries for agentic DevSecOps",
        meta: "Code generation is the easy part — the short version, in four boundaries",
      },
    ],
  },
  {
    label: "AI systems & engineering",
    meta: "Independent field guides — how AI systems actually work, break, and get evaluated",
    guides: [
      {
        href: "/guides/ai-system-design-patterns",
        title: "AI system design patterns",
        meta: "Twelve archetypes, six complex agent patterns, and the ML/AI software landscape",
      },
      {
        href: "/guides/ai-evaluation-methods",
        title: "AI evaluation methods",
        meta: "Rubrics, LLM-as-judge, and benchmarks — when to use which, and how judges fail",
      },
      {
        href: "/guides/rag-failure-modes",
        title: "RAG failure modes",
        meta: "A debugging field guide — retrieval failure, lost-in-the-middle, reranking, chunking",
      },
      {
        href: "/guides/context-engineering",
        title: "Context engineering",
        meta: "What actually competes for space in the context window, and how to manage it",
      },
    ],
  },
];

export default function GuidesIndex() {
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

      {SECTIONS.map((section) => (
        <section key={section.label}>
          <h2>{section.label}</h2>
          <p>{section.meta}</p>
          <div className="grid">
            {section.guides.map((g) => (
              <a key={g.href} className="tile" href={g.href}>
                <span className="tile-title">{g.title}</span>
                <span className="tile-meta">{g.meta}</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <div className="card">
        <p>
          More guides land here over time — no invented statistics or a testimonial standing in for
          a real one, ever.
        </p>
      </div>
    </ContentLayout>
  );
}
