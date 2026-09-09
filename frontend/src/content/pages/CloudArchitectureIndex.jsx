import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "cloud-architecture/index.html",
  title: "Cloud Architecture — Merit AC",
  description:
    "Cloud architecture patterns and providers — multi-cloud, serverless, microservices, networking, disaster recovery, security, cost, and how to actually choose a provider.",
};

export default function CloudArchitectureIndex({ entries }) {
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
        {entries.map((e) => (
          <a key={e.slug} className="tile" href={`/cloud-architecture/${e.slug}`}>
            <span className="tile-title">{e.title}</span>
            <span className="tile-meta">{e.tileMeta}</span>
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
