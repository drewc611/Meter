import { Fragment } from "react";
import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "index.html",
  title: "Clark X Group — Parent of Merit AC",
  description:
    "Clark X Group is a technology holding company. Merit AC is its flagship product: a hub for AI news, models, and tools, anchored by a tracker that checks whether a company's AI spend is producing real work or slop.",
};

// A step-and-arrow flow diagram: A → B → C. Same shape as the one guides'
// AI-system-patterns page already uses (see .arch-diagram in content.css) --
// reused here rather than reinvented, so a diagram reads the same wherever
// the site draws one.
function LinearDiagram({ steps }) {
  return (
    <div className="arch-diagram">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          <div className="arch-step">
            <span className="arch-step-label">{step.label}</span>
            {step.note && <span className="arch-step-note">{step.note}</span>}
          </div>
          {i < steps.length - 1 && (
            <span className="arch-arrow" aria-hidden="true">
              →
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

// One hub box branching into parallel spokes -- an ownership structure is
// the same shape as an orchestrator dispatching to specialists.
function HubDiagram({ hub, spokes }) {
  return (
    <div className="arch-hub">
      <div className="arch-step">
        <span className="arch-step-label">{hub.label}</span>
        {hub.note && <span className="arch-step-note">{hub.note}</span>}
      </div>
      <span className="arch-arrow" aria-hidden="true">
        ↓
      </span>
      <div className="arch-spokes">
        {spokes.map((spoke) => {
          const Tag = spoke.href ? "a" : "div";
          return (
            <Tag className="arch-step" key={spoke.label} href={spoke.href}>
              <span className="arch-step-label">{spoke.label}</span>
              {spoke.note && <span className="arch-step-note">{spoke.note}</span>}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

const SURFACES = [
  {
    label: "Understand",
    meta: "Sourced AI news, a dated models-and-tools directory, and plain-English definitions.",
    items: [
      { href: "/news", title: "News", meta: "Sourced commentary on AI news that actually matters" },
      { href: "/models", title: "Models & tools", meta: "A directory of AI models and tools — verified and dated" },
      { href: "/glossary", title: "Glossary", meta: "Plain-English definitions for AI terms" },
    ],
  },
  {
    label: "Build",
    meta: "Architecture references, setup guides, and hands-on prompts for building with AI well.",
    items: [
      { href: "/architecture", title: "Architecture", meta: "How Merit AC is built and hosted" },
      { href: "/cloud-architecture", title: "Cloud architecture", meta: "Multi-cloud, serverless, networking, security" },
      { href: "/claude-architecture", title: "Claude architecture", meta: "Agents, tool use, MCP, caching" },
      { href: "/guides", title: "Guides", meta: "General writing on doing AI work well" },
      { href: "/skills", title: "Skills library", meta: "A Claude Skill, Copilot chat mode, and ChatGPT GPT for every role" },
      { href: "/prompts", title: "Prompts", meta: "A 30-day AI prompt archive" },
    ],
  },
  {
    label: "Operate",
    meta: "A local-first business operating system, and the 30-day path to running one.",
    items: [
      { href: "/operator-os", title: "Operator OS", meta: "Books, cash forecasting, and agents on your own machine" },
      { href: "/challenge", title: "The 30-day challenge", meta: "Build a governed agentic delivery platform, free" },
      { href: "/community", title: "Community", meta: "Not open yet — join the interest list" },
    ],
  },
  {
    label: "Measure",
    meta: "The flagship tracker: AI spend, outcomes, and rework, rolled into one score per person.",
    items: [
      { href: "/app", title: "Open the dashboard", meta: "Spend, value per dollar, slop risk, recoverable spend" },
      { href: "/setup/react", title: "Wire up your data", meta: "React, Python, Node, TensorFlow/Pyro setup guides" },
    ],
  },
];

const PIPELINE_STEPS = [
  { label: "AI Usage", note: "Proxy/billing events, ingested per-org" },
  { label: "Work Signals", note: "GitHub, Jira, HubSpot, quality signals" },
  { label: "Identity Map", note: "External IDs resolved to one person" },
  { label: "Scoring Layer", note: "Nightly job, one row per person" },
  { label: "Dashboard API", note: "Reads the scored layer, not raw events" },
];

export default function Home() {
  return (
    <ContentLayout wide>
      <div className="hero-wash">
        <span className="kicker">Clark X Group</span>
        <span className="badge">
          <i /> Merit AC: pre-launch prototype
        </span>
        <h1>We build the systems. Merit AC proves the method.</h1>
        <p className="lead">
          Clark X Group is a technology holding company. Merit AC, its flagship product, is an AI
          intelligence hub and spend tracker built on one idea: show the work, not the hype.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#product">
            Explore Merit AC
          </a>
          <a className="btn btn-secondary" href="/architecture">
            See how it&apos;s built
          </a>
        </div>

        <a className="hero-preview" href="/app" aria-label="Open the Merit AC dashboard">
          <div className="hero-preview-bar">
            <i /> <i /> <i />
          </div>
          <img
            src="/images/dashboard-preview.png"
            alt="The Merit AC dashboard overview, showing AI spend, value per dollar, slop risk, and recoverable spend for a sample org"
            loading="lazy"
          />
        </a>
      </div>

      <div id="product" style={{ scrollMarginTop: "80px" }}>
        <span className="kicker">Flagship product</span>
        <h2 style={{ marginTop: 0 }}>One product. Four surfaces.</h2>
        <p>
          Understand what's happening in AI, build with it well, run a business on it, and measure
          whether the spend is worth it. Everything below is live today, not a roadmap.
        </p>
      </div>

      {SURFACES.map((group) => (
        <div className="grid-group" key={group.label}>
          <p className="grid-group-label">{group.label}</p>
          <p className="grid-group-desc">{group.meta}</p>
          <div className="grid">
            {group.items.map((item) => (
              <a key={item.href} className="tile" href={item.href}>
                <span className="tile-title">{item.title}</span>
                <span className="tile-meta">{item.meta}</span>
              </a>
            ))}
          </div>
        </div>
      ))}

      <span className="kicker">Engineering</span>
      <h2>The pipeline behind the score.</h2>
      <p>
        Three ingestion paths feed one nightly scoring job, which compresses everything into a
        single row per person. The dashboard reads only that scored row, never raw events — so it
        stays fast no matter how much history piles up.
      </p>
      <LinearDiagram steps={PIPELINE_STEPS} />
      <p style={{ marginTop: "var(--sp-3)" }}>
        Full writeup, including the exact data model: <a href="/architecture">/architecture</a>.
      </p>

      <span className="kicker">Parent company</span>
      <h2>Clark X owns the platform. Merit AC earns the attention.</h2>
      <p>
        Merit AC keeps its own name rather than folding into &quot;Clark X&quot; everywhere. Clark
        X Group is the parent behind it — free to take on other software, IP, or ventures without
        forcing them under one product&apos;s identity.
      </p>
      <HubDiagram
        hub={{ label: "Clark X Group LLC", note: "Ownership, IP, strategy" }}
        spokes={[
          { label: "Merit AC", note: "AI intelligence + ROI — flagship", href: "/app" },
          { label: "Operator OS", note: "Business operating system", href: "/operator-os" },
          { label: "Financert", note: "Wealth allocation vs. the Fed's own data", href: "/financert" },
          { label: "The All Dash", note: "Local-first command center", href: "/all-dash" },
          { label: "Portamp", note: "Legacy front ends, ported and proven", href: "/portamp" },
          { label: "Toneara", note: "Private, in-browser instrumental sketches", href: "/toneara" },
          { label: "PrivaShield", note: "Self-hosted security, signed AI governance", href: "/privashield" },
        ]}
      />
      <p style={{ marginTop: "var(--sp-3)" }}>
        Full list with descriptions: <a href="/products">/products</a>.
      </p>

      <div className="card" style={{ marginTop: "var(--sp-10)" }}>
        <span className="kicker" style={{ marginBottom: "var(--sp-2)" }}>
          Talk to us
        </span>
        <h2 style={{ margin: "0 0 var(--sp-2)" }}>Find the bottleneck. Build the leverage.</h2>
        <p style={{ marginBottom: "var(--sp-4)" }}>
          Use Clark X for enterprise work, architecture, and new ventures — Merit AC is the proof
          point. Tell us where execution is slowing down and we&apos;ll follow up directly.
        </p>
        <a className="btn btn-primary" href="/contact">
          Get in touch
        </a>
      </div>
    </ContentLayout>
  );
}
