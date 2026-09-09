import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "claude-architecture/index.html",
  title: "Claude Architecture — Merit AC",
  description:
    "Architecture patterns for building real applications with Claude — agentic loops, tool use, MCP, prompt caching, computer use, and extended thinking — via Claude's public, documented capabilities.",
};

export default function ClaudeArchitectureIndex({ entries }) {
  return (
    <ContentLayout active="claude-architecture">
      <span className="kicker">Content</span>
      <span className="badge">
        <i /> Public, documented capabilities only
      </span>
      <h1>Claude architecture</h1>
      <p className="lead">
        Architecture patterns for building real applications <em>with</em> Claude — agentic loops,
        tool use, MCP, prompt caching, computer use, and extended thinking. This is about how to
        design systems around Claude's public API, not Claude's internal model architecture, which
        Anthropic doesn't publish and this site never guesses at.
      </p>
      <div className="grid">
        {entries.map((e) => (
          <a key={e.slug} className="tile" href={`/claude-architecture/${e.slug}`}>
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
