import { useAppData } from "../context/AppDataContext.jsx";
import { SourceBadge } from "./Sidebar.jsx";

const VIEW_TITLES = {
  overview: ["Overview", "AI spend, value, and rework risk — by team, with person-level detail when you need it"],
  people: ["People", "Every AI-active person — search, filter, sort"],
  teams: ["Teams & Roles", "Spend and value rolled up above the individual"],
  alerts: ["Alerts", "What Merit AC thinks needs a look this period"],
  integrations: ["Integrations", "How spend, outcomes, and quality signals get in"],
};

export default function Topbar({ view }) {
  const { overview } = useAppData();
  const [title, sub] = VIEW_TITLES[view];
  const periodLabel = new Date(overview.period_start).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="topbar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h1>{title}</h1>
          <SourceBadge style={{ marginBottom: 0 }} />
        </div>
        <div className="sub">{sub}</div>
      </div>
      <div className="co">
        <b>Northwind Labs</b>
        <span>{periodLabel}</span>
      </div>
    </div>
  );
}
