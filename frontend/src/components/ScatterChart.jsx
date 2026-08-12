import { useRef } from "react";

import { fmtMoney, fmtX, slopColor } from "../lib/format.js";

function positionTooltip(tipEl, plotEl, clientX, clientY) {
  const wrap = plotEl.closest(".plotwrap").getBoundingClientRect();
  tipEl.style.left = clientX - wrap.left + 12 + "px";
  tipEl.style.top = clientY - wrap.top - 8 + "px";
  tipEl.style.opacity = 1;
}

const W = 560,
  H = 340,
  padL = 46,
  padR = 16,
  padT = 16,
  padB = 38;
// Same number the "good value/$" quadrant line is drawn at as the KPI/table
// color threshold (see lib/format.js VALUE_GOOD_THRESHOLD) -- both mark
// "good" value/$ at the same place, so they share this constant.
const VALUE_T = 1.6;

export default function ScatterChart({ people }) {
  const plotRef = useRef(null);
  const tipRef = useRef(null);

  const spends = people.map((p) => p.spend_usd);
  const values = people.map((p) => p.value_per_dollar);
  const xMax = Math.max(...spends, 0) * 1.12 || 1;
  const yMax = Math.max(3.2, Math.max(...values, 0) * 1.15);
  const yMin = Math.min(-0.6, Math.min(...values, 0) * 1.15);
  const xPix = (v) => padL + (v / xMax) * (W - padL - padR);
  const yPix = (v) => H - padB - ((v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const SPEND_T = people.length ? spends.reduce((a, b) => a + b, 0) / people.length : 900;
  const vx = xPix(SPEND_T),
    vy = yPix(VALUE_T),
    zeroY = yPix(0);

  const showTip = (p, clientX, clientY) => {
    const tip = tipRef.current,
      plot = plotRef.current;
    if (!tip || !plot) return;
    tip.innerHTML = `<b>${p.name}</b> · ${p.team}<br>${fmtMoney(p.spend_usd)}/mo · ${fmtX(p.value_per_dollar)} value · slop ${p.slop_risk.toFixed(0)}`;
    positionTooltip(tip, plot, clientX, clientY);
  };
  const hideTip = () => {
    if (tipRef.current) tipRef.current.style.opacity = 0;
  };

  return (
    <>
      <svg
        className="plot"
        ref={plotRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Scatter of spend versus value by person"
      >
        <rect x={padL} y={padT} width={vx - padL} height={vy - padT} fill="var(--good-soft)" opacity=".5" />
        <rect x={vx} y={vy} width={W - padR - vx} height={H - padB - vy} fill="var(--bad-soft)" opacity=".5" />
        <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="var(--line-strong)" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--line)" />
        <line x1={vx} y1={padT} x2={vx} y2={H - padB} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <line x1={padL} y1={vy} x2={W - padR} y2={vy} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <text x={padL} y={H - 10} fontSize="10.5" fill="var(--muted)">
          $0
        </text>
        <text x={W - padR} y={H - 10} fontSize="10.5" fill="var(--muted)" textAnchor="end">
          {`$${Math.round(xMax).toLocaleString()}/mo →`}
        </text>
        <text x="4" y={padT + 6} fontSize="10.5" fill="var(--muted)">
          value/$ ↑
        </text>
        {people.map((p) => {
          const r = 5 + Math.sqrt(Math.max(p.spend_usd, 1)) / 9;
          const label = `${p.name}, ${p.team}: ${fmtMoney(p.spend_usd)} per month, ${fmtX(p.value_per_dollar)} value per dollar, slop risk ${p.slop_risk.toFixed(0)} of 100`;
          return (
            <circle
              key={p.id}
              className="dot"
              tabIndex={0}
              role="img"
              aria-label={label}
              cx={xPix(p.spend_usd)}
              cy={yPix(p.value_per_dollar)}
              r={r}
              fill={slopColor(p.slop_risk)}
              fillOpacity=".82"
              stroke="#fff"
              strokeWidth="1.2"
              onMouseMove={(e) => showTip(p, e.clientX, e.clientY)}
              onMouseLeave={hideTip}
              onFocus={(e) => {
                const rect = e.target.getBoundingClientRect();
                showTip(p, rect.left + rect.width / 2, rect.top);
              }}
              onBlur={hideTip}
            >
              <title>{label}</title>
            </circle>
          );
        })}
      </svg>
      <div className="tip" ref={tipRef} />
    </>
  );
}
