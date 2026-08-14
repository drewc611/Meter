import { useMemo } from "react";

import { useAppData } from "../context/AppDataContext.jsx";
import { onActivateKey } from "../components/Shared.jsx";
import { fmtMoney } from "../lib/format.js";

const SEV_COLOR = { high: "var(--bad)", med: "var(--warn)", good: "var(--good)" };

function computeAlerts(ov, teams) {
  const alerts = [];
  const worstTeam = [...teams].sort((a, b) => b.slop_risk - a.slop_risk)[0];
  if (worstTeam && worstTeam.slop_risk >= 50) {
    alerts.push({
      sev: "high",
      title: `${worstTeam.name} has the highest slop risk of any team (${worstTeam.slop_risk.toFixed(0)}/100)`,
      body: `${worstTeam.people_count} people, ${fmtMoney(worstTeam.spend_usd)}/mo. Worth a sampled Tier-3 review before the next budget cycle.`,
      filterTeam: worstTeam.name,
    });
  }
  const coachPeople = ov.people.filter((p) => p.recommendation_code === "retier_coach");
  if (coachPeople.length) {
    const spend = coachPeople.reduce((a, p) => a + p.spend_usd, 0);
    alerts.push({
      sev: "high",
      title: `${coachPeople.length} people flagged for re-tier + coach`,
      body: `Together they represent ${fmtMoney(spend)}/mo in high-spend, high-slop usage — the single largest recoverable bucket this period.`,
      filterSearch: "re-tier + coach",
    });
  }
  if (ov.spend_change_pct >= 25) {
    alerts.push({
      sev: "med",
      title: `Company AI spend is up ${ov.spend_change_pct}% month over month`,
      body: `Total spend reached ${fmtMoney(ov.total_spend_usd)} this period. No anomalous single spender identified — growth looks broad-based.`,
    });
  }
  const stars = ov.people.filter((p) => p.recommendation_code === "keep_top_performer");
  if (stars.length) {
    alerts.push({
      sev: "good",
      title: `${stars.length} people are top-performing outliers worth studying`,
      body:
        stars.map((s) => s.name).join(", ") +
        " — high value per dollar with low slop risk. Consider surfacing their workflows to the rest of the team.",
      filterSearch: "keep",
    });
  }
  return alerts;
}

export default function Alerts({ active, onNavigateToPeople }) {
  const { overview: ov, teams } = useAppData();
  const alerts = useMemo(() => computeAlerts(ov, teams), [ov, teams]);

  function activate(a) {
    if (a.filterTeam || a.filterSearch) onNavigateToPeople({ filterTeam: a.filterTeam, filterSearch: a.filterSearch });
  }

  return (
    <section className={`view${active ? " active" : ""}`} id="view-alerts">
      <div className="card" style={{ boxShadow: "none", border: "none", padding: 0, background: "transparent" }}>
        <div>
          {alerts.length ? (
            alerts.map((a, i) => {
              const clickable = a.filterTeam || a.filterSearch;
              return (
                <div
                  key={i}
                  className={`alert${clickable ? " clickable" : ""}`}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => activate(a) : undefined}
                  onKeyDown={clickable ? onActivateKey(() => activate(a)) : undefined}
                >
                  <div className="dot2" style={{ background: SEV_COLOR[a.sev] }} />
                  <div>
                    <h4>{a.title}</h4>
                    <p>{a.body}</p>
                    {clickable && <span className="alert-cta">View in People →</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "13px" }}>No alerts this period.</p>
          )}
        </div>
      </div>
    </section>
  );
}
