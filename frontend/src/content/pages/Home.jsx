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
          Clark X Group is a technology holding company. Merit AC is its flagship product — an AI
          intelligence hub and spend/value tracker built around one principle: show the work, not
          the hype. Follow AI without the noise, build with real architecture references, run the
          business on a local-first operating system, and measure whether the spend behind it all
          is producing real work or slop.
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
          Merit AC's own navigation groups into four things worth doing: understand what's
          actually happening in AI, build with it well, operate a business on it, and measure
          whether the spend is worth it. Everything below is real and live today — nothing here is
          a roadmap item dressed up as shipped.
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
        Three independent ingestion paths write into three separate tables, all attributed to a
        person through an identity-mapping table, and a nightly job compresses everything into one
        scored row per person. The dashboard and every <code>/api/*</code> endpoint read only that
        scored row — never raw events — so page loads stay fast no matter how much history
        accumulates.
      </p>
      <LinearDiagram steps={PIPELINE_STEPS} />
      <p style={{ marginTop: "var(--sp-3)" }}>
        Full writeup, including the exact data model: <a href="/architecture">/architecture</a>.
      </p>

      <span className="kicker">Parent company</span>
      <h2>Clark X owns the platform. Merit AC earns the attention.</h2>
      <p>
        Merit AC stays a distinct product brand rather than folding into &quot;Clark X&quot;
        everywhere — the site you&apos;re on, the dashboard, the domain, all of it. Clark X Group
        is the parent behind it: the entity that can take on other software, IP, consulting work,
        or future operating companies without forcing everything into one product&apos;s identity.
      </p>
      <HubDiagram
        hub={{ label: "Clark X Group LLC", note: "Ownership, IP, strategy" }}
        spokes={[
          { label: "Merit AC", note: "AI intelligence + ROI — flagship", href: "/app" },
          { label: "Operator OS", note: "Business operating system", href: "/operator-os" },
          { label: "Financert", note: "Wealth allocation vs. the Fed's own data", href: "/financert" },
          { label: "The All Dash", note: "Local-first command center", href: "/all-dash" },
          { label: "Portamp", note: "Legacy front ends, ported and proven", href: "/portamp" },
        ]}
      />

      <div className="card" style={{ marginTop: "var(--sp-10)" }}>
        <span className="kicker" style={{ marginBottom: "var(--sp-2)" }}>
          Start here
        </span>
        <h2 style={{ margin: "0 0 var(--sp-2)" }}>Find the bottleneck. Build the leverage.</h2>
        <p style={{ marginBottom: "var(--sp-5)" }}>
          Use Clark X for enterprise work, architecture, and new ventures. Use Merit AC as the
          product proof point. Tell us where execution is actually slowing down and we&apos;ll
          follow up directly — no automated pitch, a real read from a real person.
        </p>

        <form className="lead-form" id="clarkXLeadForm" noValidate>
          <div className="field">
            <label htmlFor="clarkXName">Name</label>
            <input type="text" id="clarkXName" name="name" placeholder="Your name" autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="clarkXEmail">Corporate email</label>
            <input
              type="email"
              id="clarkXEmail"
              name="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="clarkXNote">Primary bottleneck</label>
            <textarea
              id="clarkXNote"
              name="note"
              rows={3}
              placeholder="Where is execution slowing down?"
            />
          </div>
          <button type="submit" className="btn btn-primary lead-form-submit">
            Start the analysis
          </button>
        </form>
        <p className="signup-msg" id="clarkXLeadMsg" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("clarkXLeadForm");
  var msg = document.getElementById("clarkXLeadMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("clarkXEmail").value.trim();
    if (!email) return;
    var name = document.getElementById("clarkXName").value.trim();
    var note = document.getElementById("clarkXNote").value.trim();
    var btn = form.querySelector("button");
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    fetch(API_BASE + "/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, name: name || null, note: note || null, source: "clarkx-analysis" }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "Got it — we'll follow up directly.";
        msg.className = "signup-msg ok";
        form.reset();
      })
      .catch(function () {
        msg.textContent = "Couldn't reach the server — try again in a moment.";
        msg.className = "signup-msg err";
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
  });
})();`,
          }}
        />
      </div>
    </ContentLayout>
  );
}
