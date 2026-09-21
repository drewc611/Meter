import { useEffect, useState } from "react";

import { useAppData } from "../context/AppDataContext.jsx";
import { fetchOrg } from "../lib/api.js";
import { SourceBadge } from "./Sidebar.jsx";

const VIEW_TITLES = {
  overview: ["Overview", "AI spend, value, and rework risk — by team, with person-level detail when you need it"],
  people: ["People", "Every AI-active person — search, filter, sort"],
  team: ["Team", "Provision people directly — the roster shows everyone, scored or not"],
  teams: ["Teams & Roles", "Spend and value rolled up above the individual"],
  alerts: ["Alerts", "What Merit AC thinks needs a look this period"],
  integrations: ["Integrations", "How spend, outcomes, and quality signals get in"],
};

export default function Topbar({ view }) {
  const { overview, hasSession } = useAppData();
  const [orgName, setOrgName] = useState("");
  const [title, sub] = VIEW_TITLES[view];
  const periodLabel = new Date(overview.period_start).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  useEffect(() => {
    if (!hasSession) {
      setOrgName("");
      return;
    }
    let cancelled = false;
    // Admin-only (/admin/org), so a non-admin teammate's session gets null
    // here and the label below just omits the org name rather than showing
    // a stale or wrong one -- this used to be a hardcoded "Northwind Labs"
    // regardless of whose dashboard it actually was.
    fetchOrg().then((org) => {
      if (!cancelled && org) setOrgName(org.org_name || org.name || "");
    });
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

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
        {orgName && <b>{orgName}</b>}
        <span>{periodLabel}</span>
      </div>
    </div>
  );
}
