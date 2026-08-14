import { useAppData } from "../context/AppDataContext.jsx";
import ScatterChart from "../components/ScatterChart.jsx";
import TrendChart from "../components/TrendChart.jsx";
import { ConfPill } from "../components/Shared.jsx";
import { fmtMoney, fmtX } from "../lib/format.js";

const CONF_ORDER = ["tier1+2+3", "tier1+2", "tier1"];

function ForecastNote({ forecast }) {
  if (!forecast || !forecast.available) return null;
  const arrow = forecast.trend_direction === "up" ? "▲" : forecast.trend_direction === "down" ? "▼" : "→";
  const hasRange = forecast.confidence_low_usd != null && forecast.confidence_high_usd != null;
  return (
    <div className="forecast-note">
      {arrow} Next period trend projection: <b>{fmtMoney(forecast.projected_spend_usd)}</b>
      {hasRange && (
        <>
          {" "}
          (likely {fmtMoney(forecast.confidence_low_usd)}–{fmtMoney(forecast.confidence_high_usd)})
        </>
      )}{" "}
      — from the last {forecast.based_on_periods} scored periods, not a guarantee.
    </div>
  );
}

export default function Overview({ active }) {
  const { overview: ov, adoption: ad, trends, spendForecast } = useAppData();
  const className = `view${active ? " active" : ""}`;

  const cb = ov.confidence_breakdown || {};
  const confItems = CONF_ORDER.filter((k) => cb[k]);

  const segFund = ov.people.filter((p) => p.segment === "fund").length;
  const segCoach = ov.people.filter((p) => p.segment === "coach").length;
  const segLearn = ov.people.filter((p) => p.segment === "learn").length;
  const segWatch = ov.people.filter((p) => p.segment === "watch").length;

  const pctOfBill = ov.total_spend_usd > 0 ? Math.round((ov.recoverable_annual_usd / (ov.total_spend_usd * 12)) * 100) : 0;
  const maxAmt = Math.max(...ov.recoverable_breakdown.map((r) => r.amount_usd), 1);

  return (
    <section className={className} id="view-overview">
      <div className="kpis">
        <div className="kpi">
          <div className="lab">AI spend / mo</div>
          <div className="val">{fmtMoney(ov.total_spend_usd)}</div>
          <div className="note">
            {(ov.spend_change_pct >= 0 ? "▲ " : "▼ ") + Math.abs(ov.spend_change_pct) + "% vs last month"}
          </div>
        </div>
        <div className="kpi">
          <div className="lab">Value per $ (blended)</div>
          <div className="val good">{fmtX(ov.blended_value_per_dollar)}</div>
          <div className="note">Tier-1 correlation signal</div>
        </div>
        <div className="kpi">
          <div className="lab">Avg slop risk</div>
          <div className="val warn">{ov.avg_slop_risk.toFixed(0)}/100</div>
          <div className="note">Tier-2 quality proxies</div>
        </div>
        <div className="kpi">
          <div className="lab">AI rework tax</div>
          <div className="val warn">{ov.rework_tax_pct.toFixed(1)}%</div>
          <div className="note">spend in high-slop-risk usage</div>
        </div>
        <div className="kpi">
          <div className="lab">Recoverable / yr</div>
          <div className="val good">{fmtMoney(ov.recoverable_annual_usd)}</div>
          <div className="note">re-tier + slop reduction</div>
        </div>
        <div className="kpi">
          <div className="lab">Active AI users</div>
          <div className="val">
            {ad ? `${ad.active_users} / ${ad.total_seats}` : "—"}
          </div>
          <div className="note">{ad ? `${ad.utilization_pct.toFixed(0)}% seat utilization` : "—"}</div>
        </div>
      </div>

      <div className="card coverage">
        <span className="lab">Score coverage</span>
        <div className="coverage-items">
          {confItems.length ? (
            confItems.map((k) => (
              <span className="coverage-item" key={k}>
                <ConfPill confidence={k} />
                <b>{cb[k]}</b>
              </span>
            ))
          ) : (
            <span className="coverage-empty">No scored people yet.</span>
          )}
        </div>
      </div>

      <div className="grid2">
        <div className="card plotwrap">
          <h2>Spend vs. value — every AI-active person</h2>
          <p className="desc">
            Each dot is a person, drawn from live PersonScore rows. Right = spends more. Up = more value per dollar.
            Color = slop risk.
          </p>
          <ScatterChart people={ov.people} valueThreshold={ov.value_threshold} />
          <div className="legend">
            <span>
              <i className="swatch" style={{ background: "var(--good)" }} /> Low slop
            </span>
            <span>
              <i className="swatch" style={{ background: "var(--warn)" }} /> Medium slop
            </span>
            <span>
              <i className="swatch" style={{ background: "var(--bad)" }} /> High slop
            </span>
            <span style={{ marginLeft: "auto" }}>bubble size = spend</span>
          </div>
          <div className="segs">
            <div className="seg a">
              <div className="t">FUND</div>
              <div className="n">{segFund}</div>
              <div className="d">High value, high spend</div>
            </div>
            <div className="seg b">
              <div className="t">COACH</div>
              <div className="n">{segCoach}</div>
              <div className="d">High spend, high slop</div>
            </div>
            <div className="seg c">
              <div className="t">LEARN</div>
              <div className="n">{segLearn}</div>
              <div className="d">Low spend, high value</div>
            </div>
            <div className="seg d">
              <div className="t">MONITOR</div>
              <div className="n">{segWatch}</div>
              <div className="d">Low spend, low signal</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Recoverable spend</h2>
          <p className="desc">What Merit estimates recoverable this year without cutting a high-value user.</p>
          <div className="roi-big">{fmtMoney(ov.recoverable_annual_usd)}</div>
          <div className="roi-sub">{`≈ ${pctOfBill}% of the ${fmtMoney(ov.total_spend_usd * 12)} annual AI bill`}</div>
          <div>
            {ov.recoverable_breakdown.map((r) => (
              <div key={r.label}>
                <div className="roi-row">
                  <span>{r.label}</span>
                  <span>{fmtMoney(r.amount_usd)}</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${Math.max(4, (r.amount_usd / maxAmt) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="contract-note">
            <b>Contract math:</b> Growth plan for the AI-active seats shown here runs roughly $18–25/user/mo —
            first-quarter recovery alone typically covers it.
          </div>
        </div>
      </div>

      <div className="card plotwrap" style={{ marginTop: "14px" }}>
        <h2>Spend trend</h2>
        <p className="desc">
          Total AI spend across the trailing months, read from PersonScore history — one point per scored period.
        </p>
        <TrendChart trends={trends} />
        <ForecastNote forecast={spendForecast} />
      </div>

      <footer>
        Values are confidence-tiered signals (see the Confidence column on the People view), not exact measures.
        Illustrative sample data.
      </footer>
    </section>
  );
}
