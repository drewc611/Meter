import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "claude-architecture/index.html",
  title: "Claude Architecture — Merit AC",
  description:
    "Architecture patterns for building real applications with Claude — agentic loops, tool use, MCP, prompt caching, computer use, and extended thinking — via Claude's public, documented capabilities.",
};

const GUIDES = [
  {
    href: "/claude-architecture/building-agents-with-claude-the-agentic-loop",
    title: "Building agents with Claude: the agentic loop",
    meta: "The anatomy of one loop iteration, stopping conditions, and approval boundaries",
  },
  {
    href: "/claude-architecture/claude-tool-use-and-function-calling",
    title: "Claude tool use and function calling architecture",
    meta: "Tool descriptions as an API contract, parallel vs. sequential calls, error design",
  },
  {
    href: "/claude-architecture/claude-and-mcp",
    title: "Claude and MCP: the Model Context Protocol",
    meta: "Client and server, tools vs. resources vs. prompts, local vs. remote servers",
  },
  {
    href: "/claude-architecture/prompt-caching-architecture",
    title: "Prompt caching architecture",
    meta: "Structuring prompts so the static part actually caches, and where it pays off",
  },
  {
    href: "/claude-architecture/claude-computer-use-architecture",
    title: "Claude computer use: architecture and safety boundaries",
    meta: "When UI-driving beats an API, and why it needs tighter constraints, not looser ones",
  },
  {
    href: "/claude-architecture/extended-thinking-architecture",
    title: "Extended thinking: architecting for Claude's reasoning mode",
    meta: "Routing genuinely hard requests to deeper reasoning, not defaulting it everywhere",
  },
];

export default function ClaudeArchitectureIndex() {
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
