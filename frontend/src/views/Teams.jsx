import { useState } from "react";

import { useAppData } from "../context/AppDataContext.jsx";
import { AvatarCell, SlopBar } from "../components/Shared.jsx";
import { fmtMoney, fmtX, valueColor } from "../lib/format.js";

export default function Teams({ active }) {
  const { teams, roles } = useAppData();
  const [aggView, setAggView] = useState("teams");

  const rows = aggView === "teams" ? teams : roles;

  return (
    <section className={`view${active ? " active" : ""}`} id="view-teams">
      <div className="card">
        <div className="filters">
          <div className="toggle">
            <button className={aggView === "teams" ? "on" : undefined} onClick={() => setAggView("teams")}>
              Teams
            </button>
            <button className={aggView === "roles" ? "on" : undefined} onClick={() => setAggView("roles")}>
              Roles
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>{aggView === "teams" ? "Team" : "Role"}</th>
                <th className="num">People</th>
                <th className="num">Spend / mo</th>
                <th className="num">Value / $</th>
                <th className="num">Slop risk</th>
              </tr>
            </thead>
            <tbody>
              {rows && rows.length ? (
                rows.map((r) => (
                  <tr key={r.name}>
                    <td>
                      <AvatarCell name={r.name} subtitle={`${r.people_count} ${r.people_count === 1 ? "person" : "people"}`} colorKey={r.name} />
                    </td>
                    <td className="num">{r.people_count}</td>
                    <td className="num">{fmtMoney(r.spend_usd)}</td>
                    <td className="num val-cell" style={{ color: valueColor(r.value_per_dollar) }}>
                      {fmtX(r.value_per_dollar)}
                    </td>
                    <td className="num">
                      <SlopBar risk={r.slop_risk} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No data for this period yet.
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
