import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "index.html",
  title: "Merit AC — AI News, Tools & Spend Tracking",
  description:
    "Merit AC is a hub for AI: sourced news, a directory of models and tools, a glossary of terms, and a tool that tracks whether a company's AI spend is producing real work or slop. Early prototype status.",
};

const EXPLORE = [
  { href: "/architecture", title: "Architecture", meta: "How Merit AC is built and hosted" },
  { href: "/cloud-architecture", title: "Cloud architecture", meta: "Patterns and providers — multi-cloud, serverless, networking, security" },
  { href: "/claude-architecture", title: "Claude architecture", meta: "Building real applications with Claude — agents, tool use, MCP, caching" },
  { href: "/setup/react", title: "Setup guides", meta: "Wire your AI usage in — React, Python, Node, TensorFlow/Pyro" },
  { href: "/news", title: "News", meta: "Sourced commentary on AI news that actually matters" },
  { href: "/models", title: "Models & tools", meta: "A directory of AI models and tools — verified and dated" },
  { href: "/glossary", title: "Glossary", meta: "Plain-English definitions for AI terms" },
  { href: "/guides", title: "Guides", meta: "General writing on doing AI work well" },
  { href: "/prompts", title: "Prompts", meta: "A 30-day AI prompt archive" },
  { href: "/challenge", title: "The 30-day challenge", meta: "Build a governed agentic delivery platform, free" },
  { href: "/community", title: "Community", meta: "Not open yet — join the interest list" },
  { href: "/operator-os", title: "Operator OS", meta: "A file-based business OS — books, cash forecasting, and agents on your own machine" },
];

export default function Home() {
  return (
    <ContentLayout wide>
      <span className="badge">
        <i /> Pre-launch prototype
      </span>
      <h1>AI moves fast, is full of hype, and hard to make sense of.</h1>
      <p className="lead">
        Merit AC is one place to follow it — news without the noise, a directory of the models and
        tools actually worth knowing, and a glossary that skips the jargon. At the center: our own
        tracker that checks if the work behind an ROI number is <b>real</b>, or wearing a good number
        to hide slop.
      </p>
      <div className="cta-row">
        <a className="btn btn-primary" href="/app">
          Sign in / sign up
        </a>
        <a className="btn btn-secondary" href="/architecture">
          See how it&apos;s built
        </a>
      </div>

      <h2>Explore</h2>
      <div className="grid">
        {EXPLORE.map((item) => (
          <a key={item.href} className="tile" href={item.href}>
            <span className="tile-title">{item.title}</span>
            <span className="tile-meta">{item.meta}</span>
          </a>
        ))}
      </div>
    </ContentLayout>
  );
}
