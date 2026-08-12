import { useAppData } from "../context/AppDataContext.jsx";
import { SlopBar } from "../components/Shared.jsx";
import { fmtMoney, fmtX, toolLabel, valueColor } from "../lib/format.js";

const INTEGRATIONS = [
  {
    name: "Anthropic / OpenAI API",
    color: "#4f46e5",
    icon: "$",
    status: true,
    feed: "ingest/usage",
    desc: "Model-provider billing & token usage, attributed via proxy key → Identity.",
  },
  {
    name: "LLM proxy (LiteLLM-style)",
    color: "#7c74f4",
    icon: "⇄",
    status: true,
    feed: "ingest/usage",
    desc: "Homegrown apps route through a thin proxy so every completion is attributed without app changes.",
  },
  {
    name: "GitHub / GitLab",
    color: "#12151c",
    icon: "⌥",
    status: true,
    feed: "ingest/outcome + quality-signal",
    desc: "PRs merged, reverted, and rework rounds — Tier 1 value and Tier 2 slop signals.",
  },
  {
    name: "Jira / Linear",
    color: "#0ea5b7",
    icon: "✓",
    status: true,
    feed: "ingest/outcome",
    desc: "Tickets resolved or reopened, attributed to the assignee.",
  },
  {
    name: "Zendesk",
    color: "#03363d",
    icon: "◉",
    status: false,
    feed: "ingest/outcome + quality-signal",
    desc: "Support resolutions and reopen rates. Not yet connected.",
  },
  {
    name: "HubSpot / Salesforce",
    color: "#e0699a",
    icon: "◆",
    status: false,
    feed: "ingest/outcome",
    desc: "Deal-stage advances for sales/marketing value attribution. Not yet connected.",
  },
  {
    name: "Okta / Entra (SSO+SCIM)",
    color: "#f0a020",
    icon: "⚿",
    status: true,
    feed: "IdentityMapping",
    desc: "The load-bearing integration — resolves every external id to one canonical person.",
  },
  {
    name: "Sampled rubric grading",
    color: "#0a8a4b",
    icon: "★",
    status: false,
    feed: "RubricGrade (Tier 3)",
    desc: "Opt-in human/LLM grading on a sample, for teams that want a calibrated hard number.",
  },
];

export default function Integrations({ active }) {
  const { toolBreakdown, toolPerformance } = useAppData();

  return (
    <section className={`view${active ? " active" : ""}`} id="view-integrations">
      <div className="card">
        <h2>How tracking actually works</h2>
        <p className="desc">
          Three independent ingestion paths feed the scoring engine — spend, outcomes, and quality proxies never
          come from the same system, which is why the signal is hard to game from any one side.
        </p>
        <div className="int-grid">
          {INTEGRATIONS.map((it) => (
            <div className="int-card" key={it.name}>
              <div className="int-top">
                <div className="int-icon" style={{ background: it.color }}>
                  {it.icon}
                </div>
                <span className={`status ${it.status ? "on" : "off"}`}>{it.status ? "Connected" : "Not connected"}</span>
              </div>
              <h3>{it.name}</h3>
              <p>{it.desc}</p>
              <span className="int-feed">
                <code className="tag" style={{ background: "transparent", padding: 0 }}>
                  {it.feed}
                </code>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: "14px" }}>
        <h2>Spend by tool &amp; model</h2>
        <p className="desc">
          Where this period's AI spend is actually going, straight from usage events — not attributed to a person
          here, just the underlying mix.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Model</th>
                <th className="num">Spend / mo</th>
                <th className="num">Events</th>
              </tr>
            </thead>
            <tbody>
              {toolBreakdown && toolBreakdown.length ? (
                toolBreakdown.map((r, i) => (
                  <tr key={i}>
                    <td>{toolLabel(r.tool)}</td>
                    <td>{r.model || "—"}</td>
                    <td className="num">{fmtMoney(r.spend_usd)}</td>
                    <td className="num">{r.event_count.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)" }}>
                    No usage yet this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: "14px" }}>
        <h2>Tool performance</h2>
        <p className="desc">
          Value per dollar and slop risk by tool — a spend-weighted estimate, not a causal claim. PersonScore
          doesn't know which tool produced which outcome, so a person's overall score is split across the tools they
          used, proportional to spend on each. Read it as where the signal concentrates, not "tool X caused outcome
          Y."
        </p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th className="num">Spend / mo</th>
                <th className="num">Value / $</th>
                <th className="num">Slop risk</th>
                <th className="num">People</th>
              </tr>
            </thead>
            <tbody>
              {toolPerformance && toolPerformance.length ? (
                toolPerformance.map((r, i) => (
                  <tr key={i}>
                    <td>{toolLabel(r.tool)}</td>
                    <td className="num">{fmtMoney(r.spend_usd)}</td>
                    <td className="num val-cell" style={{ color: valueColor(r.value_per_dollar) }}>
                      {fmtX(r.value_per_dollar)}
                    </td>
                    <td className="num">
                      <SlopBar risk={r.slop_risk} />
                    </td>
                    <td className="num">{r.people_count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No usage yet this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
