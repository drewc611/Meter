import { useRef } from "react";

import { useChartTooltip } from "../hooks/useChartTooltip.js";
import { fmtMoney, fmtX, slopColor } from "../lib/format.js";

const W = 560,
  H = 340,
  padL = 46,
  padR = 16,
  padT = 16,
  padB = 38;

export default function ScatterChart({ people, valueThreshold }) {
  const plotRef = useRef(null);
  const { tooltip, show, hide } = useChartTooltip();

  const spends = people.map((p) => p.spend_usd);
  const values = people.map((p) => p.value_per_dollar);
  const xMax = Math.max(...spends, 0) * 1.12 || 1;
  const yMax = Math.max(3.2, Math.max(...values, 0) * 1.15);
  const yMin = Math.min(-0.6, Math.min(...values, 0) * 1.15);
  const xPix = (v) => padL + (v / xMax) * (W - padL - padR);
  const yPix = (v) => H - padB - ((v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const SPEND_T = people.length ? spends.reduce((a, b) => a + b, 0) / people.length : 900;
  const vx = xPix(SPEND_T),
    vy = yPix(valueThreshold),
    zeroY = yPix(0);

  const showTip = (p, clientX, clientY) => {
    show(
      plotRef.current,
      <>
        <b>{p.name}</b> · {p.team}
        <br />
        {fmtMoney(p.spend_usd)}/mo · {fmtX(p.value_per_dollar)} value · slop {p.slop_risk.toFixed(0)}
      </>,
      clientX,
      clientY,
    );
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
              stroke="var(--panel)"
              strokeWidth="1.2"
              onMouseMove={(e) => showTip(p, e.clientX, e.clientY)}
              onMouseLeave={hide}
              onFocus={(e) => {
                const rect = e.target.getBoundingClientRect();
                showTip(p, rect.left + rect.width / 2, rect.top);
              }}
              onBlur={hide}
            >
              <title>{label}</title>
            </circle>
          );
        })}
      </svg>
      <div className="tip" style={{ left: tooltip.x, top: tooltip.y, opacity: tooltip.visible ? 1 : 0 }}>
        {tooltip.content}
      </div>
    </>
  );
}
