import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "cloud-architecture/index.html",
  title: "Cloud Architecture — Merit AC",
  description:
    "Cloud architecture patterns and providers — multi-cloud, serverless, microservices, networking, disaster recovery, security, cost, and how to actually choose a provider.",
};

const GUIDES = [
  {
    href: "/cloud-architecture/multi-cloud-and-hybrid-cloud-architecture",
    title: "Multi-cloud and hybrid cloud architecture",
    meta: "What multi-cloud actually means in practice, and when the complexity tax is worth it",
  },
  {
    href: "/cloud-architecture/serverless-architecture-patterns",
    title: "Serverless architecture patterns",
    meta: "Cold starts, the state problem, and when serverless is actually cheaper",
  },
  {
    href: "/cloud-architecture/microservices-vs-monolith",
    title: "Microservices vs. monolith",
    meta: "What genuinely motivates a split, and the distributed-monolith anti-pattern",
  },
  {
    href: "/cloud-architecture/event-driven-architecture",
    title: "Event-driven architecture on the cloud",
    meta: "Notification vs. state transfer vs. event sourcing, and the dual-write problem",
  },
  {
    href: "/cloud-architecture/cloud-networking-fundamentals",
    title: "Cloud networking fundamentals",
    meta: "VPCs, subnets, peering, and the actual path a request takes to a private database",
  },
  {
    href: "/cloud-architecture/disaster-recovery-and-multi-region-architecture",
    title: "Disaster recovery and multi-region architecture",
    meta: "RTO and RPO first, then the pilot-light-to-active-active spectrum",
  },
  {
    href: "/cloud-architecture/cloud-security-architecture-zero-trust",
    title: "Cloud security architecture: shared responsibility and zero trust",
    meta: "Why identity is the real perimeter, and the failure patterns that actually happen",
  },
  {
    href: "/cloud-architecture/cloud-cost-optimization",
    title: "Cloud cost optimization",
    meta: "Architecture patterns that actually save money, not just a billing-dashboard exercise",
  },
  {
    href: "/cloud-architecture/cloud-providers-compared",
    title: "Cloud providers compared",
    meta: "AWS, Azure, GCP, and the specialized, developer-first, and edge-first alternatives",
  },
  {
    href: "/cloud-architecture/choosing-a-cloud-provider",
    title: "Choosing a cloud provider",
    meta: "A decision framework — the real inputs, and the switching-cost trap",
  },
];

export default function CloudArchitectureIndex() {
  return (
    <ContentLayout active="cloud-architecture">
      <span className="kicker">Content</span>
      <span className="badge">
        <i /> Independent of the product
      </span>
      <h1>Cloud architecture</h1>
      <p className="lead">
        Patterns and providers — the tradeoffs that actually matter when deciding how to structure
        and where to run a cloud workload, not a vendor comparison. Same discipline as every other
        guide on this site: no invented statistics, no fabricated pricing or market-share numbers.
      </p>
      <div className="grid">
        {GUIDES.map((g) => (
          <a key={g.href} className="tile" href={g.href}>
            <span className="tile-title">{g.title}</span>
            <span className="tile-meta">{g.meta}</span>
          </a>
        ))}
      </div>
      <div className="card">
        <p>
          More lands here over time — no invented statistics or a testimonial standing in for a
          real one, ever.
        </p>
      </div>
    </ContentLayout>
  );
}
