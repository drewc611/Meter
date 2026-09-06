import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "guides/index.html",
  title: "Guides — Merit AC",
  description: "General guides on doing AI work well, from the team building Merit AC — governed agentic DevSecOps, AI systems engineering, cloud architecture, and building with Claude.",
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
  {
    label: "Cloud architecture",
    meta: "Patterns, providers, and the tradeoffs that actually matter when choosing between them",
    guides: [
      {
        href: "/guides/multi-cloud-and-hybrid-cloud-architecture",
        title: "Multi-cloud and hybrid cloud architecture",
        meta: "What multi-cloud actually means in practice, and when the complexity tax is worth it",
      },
      {
        href: "/guides/serverless-architecture-patterns",
        title: "Serverless architecture patterns",
        meta: "Cold starts, the state problem, and when serverless is actually cheaper",
      },
      {
        href: "/guides/microservices-vs-monolith",
        title: "Microservices vs. monolith",
        meta: "What genuinely motivates a split, and the distributed-monolith anti-pattern",
      },
      {
        href: "/guides/event-driven-architecture",
        title: "Event-driven architecture on the cloud",
        meta: "Notification vs. state transfer vs. event sourcing, and the dual-write problem",
      },
      {
        href: "/guides/cloud-networking-fundamentals",
        title: "Cloud networking fundamentals",
        meta: "VPCs, subnets, peering, and the actual path a request takes to a private database",
      },
      {
        href: "/guides/disaster-recovery-and-multi-region-architecture",
        title: "Disaster recovery and multi-region architecture",
        meta: "RTO and RPO first, then the pilot-light-to-active-active spectrum",
      },
      {
        href: "/guides/cloud-security-architecture-zero-trust",
        title: "Cloud security architecture: shared responsibility and zero trust",
        meta: "Why identity is the real perimeter, and the failure patterns that actually happen",
      },
      {
        href: "/guides/cloud-cost-optimization",
        title: "Cloud cost optimization",
        meta: "Architecture patterns that actually save money, not just a billing-dashboard exercise",
      },
      {
        href: "/guides/cloud-providers-compared",
        title: "Cloud providers compared",
        meta: "AWS, Azure, GCP, and the specialized, developer-first, and edge-first alternatives",
      },
      {
        href: "/guides/choosing-a-cloud-provider",
        title: "Choosing a cloud provider",
        meta: "A decision framework — the real inputs, and the switching-cost trap",
      },
    ],
  },
  {
    label: "Building with Claude",
    meta: "Architecture patterns for applications built on Claude, via its public, documented capabilities",
    guides: [
      {
        href: "/guides/building-agents-with-claude-the-agentic-loop",
        title: "Building agents with Claude: the agentic loop",
        meta: "The anatomy of one loop iteration, stopping conditions, and approval boundaries",
      },
      {
        href: "/guides/claude-tool-use-and-function-calling",
        title: "Claude tool use and function calling architecture",
        meta: "Tool descriptions as an API contract, parallel vs. sequential calls, error design",
      },
      {
        href: "/guides/claude-and-mcp",
        title: "Claude and MCP: the Model Context Protocol",
        meta: "Client and server, tools vs. resources vs. prompts, local vs. remote servers",
      },
      {
        href: "/guides/prompt-caching-architecture",
        title: "Prompt caching architecture",
        meta: "Structuring prompts so the static part actually caches, and where it pays off",
      },
      {
        href: "/guides/claude-computer-use-architecture",
        title: "Claude computer use: architecture and safety boundaries",
        meta: "When UI-driving beats an API, and why it needs tighter constraints, not looser ones",
      },
      {
        href: "/guides/extended-thinking-architecture",
        title: "Extended thinking: architecting for Claude's reasoning mode",
        meta: "Routing genuinely hard requests to deeper reasoning, not defaulting it everywhere",
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
        systems actually work, cloud architecture patterns and providers, and how to build real
        applications with Claude.
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
