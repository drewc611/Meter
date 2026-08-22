import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "index.html",
  title: "Merit AC — AI Spend & Value",
  description:
    "Merit AC tells a company what it spends on AI, what that spend is actually producing, and how much of it is rework risk instead of real work.",
};

const EXPLORE = [
  { href: "/architecture", title: "Architecture", meta: "How Merit AC is built and hosted" },
  { href: "/setup/react", title: "Setup guides", meta: "Wire your AI usage in — React, Python, Node, TensorFlow/Pyro" },
  { href: "/guides", title: "Guides", meta: "General writing on doing AI work well" },
  { href: "/prompts", title: "Prompts", meta: "A 30-day AI prompt archive" },
  { href: "/challenge", title: "The 30-day challenge", meta: "Build a governed agentic delivery platform, free" },
  { href: "/community", title: "Community", meta: "Not open yet — join the interest list" },
];

export default function Home() {
  return (
    <ContentLayout wide>
      <span className="badge">
        <i /> Pre-launch prototype
      </span>
      <h1>AI spend isn&apos;t the risk. Slop wearing a good ROI number is.</h1>
      <p className="lead">
        Most tools stop at &quot;who spent what.&quot; Merit AC checks if the work was <b>any good</b> —
        reverts, rewrites, regeneration loops — before it counts as value.
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
