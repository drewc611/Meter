import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "guides/index.html",
  title: "Guides — Merit",
  description: "General guides on doing AI work well, from the team building Merit — starting with governed agentic DevSecOps.",
};

const GUIDES = [
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
];

export default function GuidesIndex() {
  return (
    <ContentLayout active="guides">
      <span className="kicker">Content</span>
      <span className="badge">
        <i /> By Andrew Clark
      </span>
      <h1>Guides</h1>
      <p className="lead">
        General writing on doing AI work well — starting with governed agentic DevSecOps, adapted
        from Andrew Clark's <em>Enterprise Agentic DevSecOps Handbook</em> and reference materials.
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
          More guides land here over time — no invented statistics or a testimonial standing in for
          a real one, ever.
        </p>
      </div>
    </ContentLayout>
  );
}
