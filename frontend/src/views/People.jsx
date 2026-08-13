import { useEffect, useMemo, useState } from "react";

import { useAppData } from "../context/AppDataContext.jsx";
import { AvatarCell, ConfPill, Pill, SlopBar, recClass } from "../components/Shared.jsx";
import { fmtMoney, fmtX, valueColor } from "../lib/format.js";

// Tier is a rank, not alphabetical text — Basic/Frontier/Standard sorted as
// strings reads oddly given the app implies a hierarchy (matches the order
// already used in the tier filter dropdown).
const TIER_RANK = { Frontier: 3, Standard: 2, Basic: 1 };

const COLUMNS = [
  { key: "name", label: "Person", sortable: true },
  { key: "spend_usd", label: "Spend / mo", sortable: true, num: true },
  { key: "value_per_dollar", label: "Value / $", sortable: true, num: true },
  { key: "slop_risk", label: "Slop risk", sortable: true, num: true },
  { key: "confidence", label: "Confidence", sortable: true },
  { key: "tier", label: "Tier", sortable: true },
  { key: null, label: "Merit says", sortable: false },
];

export default function People({ active, presetFilter, onFilterConsumed }) {
  const { overview: ov } = useAppData();
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("");
  const [tier, setTier] = useState("");
  const [seg, setSeg] = useState("");
  const [sortKey, setSortKey] = useState("spend_usd");
  const [sortDir, setSortDir] = useState(-1);

  // Alerts that reference a specific cohort cross-navigate here pre-filtered
  // to them -- applied whenever a new preset arrives, then consumed so it
  // doesn't stick on manual edits made afterward.
  useEffect(() => {
    if (!presetFilter) return;
    setTeam(presetFilter.filterTeam || "");
    setTier("");
    setSeg("");
    setSearch(presetFilter.filterSearch || "");
    if (onFilterConsumed) onFilterConsumed();
  }, [presetFilter]);

  const teamOptions = useMemo(() => {
    return [...new Set(ov.people.map((p) => p.team))].sort();
  }, [ov]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = ov.people.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.recommendation.toLowerCase().includes(q)) &&
        (!team || p.team === team) &&
        (!tier || p.tier === tier) &&
        (!seg || p.segment === seg),
    );
    filtered = [...filtered].sort((a, b) => {
      if (sortKey === "tier") return sortDir * ((TIER_RANK[a.tier] || 0) - (TIER_RANK[b.tier] || 0));
      const av = a[sortKey],
        bv = b[sortKey];
      if (typeof av === "string") return sortDir * av.localeCompare(bv);
      return sortDir * (av - bv);
    });
    return filtered;
  }, [ov, search, team, tier, seg, sortKey, sortDir]);

  function sortByHeader(key) {
    if (!key) return;
    if (sortKey === key) setSortDir((d) => d * -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  return (
    <section className={`view${active ? " active" : ""}`} id="view-people">
      <div className="card">
        <div className="filters">
          <input
            type="text"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">All teams</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">All tiers</option>
            <option>Frontier</option>
            <option>Standard</option>
            <option>Basic</option>
          </select>
          <select value={seg} onChange={(e) => setSeg(e.target.value)}>
            <option value="">All segments</option>
            <option value="fund">Fund</option>
            <option value="coach">Coach</option>
            <option value="learn">Learn</option>
            <option value="watch">Monitor</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: "11.5px", color: "var(--muted)" }}>
            {rows.length} of {ov.people.length} people
          </span>
        </div>
        <div className="table-scroll">
          <table id="peopleTable">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.label}
                    className={col.num ? "num" : undefined}
                    data-k={col.sortable ? col.key : undefined}
                    tabIndex={col.sortable ? 0 : undefined}
                    role={col.sortable ? "button" : undefined}
                    aria-sort={col.sortable ? (col.key === sortKey ? (sortDir === 1 ? "ascending" : "descending") : "none") : undefined}
                    onClick={col.sortable ? () => sortByHeader(col.key) : undefined}
                    onKeyDown={
                      col.sortable
                        ? (e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            sortByHeader(col.key);
                          }
                        : undefined
                    }
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <AvatarCell name={p.name} subtitle={`${p.team} · ${p.role}`} colorKey={p.team} />
                    </td>
                    <td className="num">{fmtMoney(p.spend_usd)}</td>
                    <td className="num val-cell" style={{ color: valueColor(p.value_per_dollar) }}>
                      {fmtX(p.value_per_dollar)}
                    </td>
                    <td className="num">
                      <SlopBar risk={p.slop_risk} />
                    </td>
                    <td>
                      <ConfPill confidence={p.confidence} />
                    </td>
                    <td>
                      <Pill tier={p.tier} />
                    </td>
                    <td className="rec">
                      <span className={recClass(p.recommendation)}>{p.recommendation}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ color: "var(--muted)" }}>
                    No people match these filters.
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
