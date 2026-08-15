import { useRef } from "react";

import { useChartTooltip } from "../hooks/useChartTooltip.js";
import { fmtMoney, fmtX } from "../lib/format.js";
import { onActivateKey } from "./Shared.jsx";

const W = 900,
  H = 190,
  padL = 46,
  padR = 16,
  padT = 14,
  padB = 26;

export default function TrendChart({ trends, onSelectPoint }) {
  const plotRef = useRef(null);
  const crosshairRef = useRef(null);
  const { tooltip, show, hide } = useChartTooltip();

  if (!trends || !trends.length) return null;

  const spend = trends.map((t) => t.total_spend_usd);
  const maxSpend = Math.max(...spend, 1) * 1.15;
  const xPix = (i) =>
    padL + (trends.length > 1 ? (i / (trends.length - 1)) * (W - padL - padR) : (W - padL - padR) / 2);
  const yPix = (v) => H - padB - (v / maxSpend) * (H - padT - padB);
  const path = trends
    .map((t, i) => `${i === 0 ? "M" : "L"}${xPix(i).toFixed(1)},${yPix(t.total_spend_usd).toFixed(1)}`)
    .join(" ");
  const baseline = H - padB;
  const areaPath = `${path} L${xPix(trends.length - 1).toFixed(1)},${baseline} L${xPix(0).toFixed(1)},${baseline} Z`;

  const showTrendsTip = (i, clientX, clientY) => {
    const crosshair = crosshairRef.current;
    if (!crosshair) return;
    const t = trends[i];
    const monthLabel = new Date(t.period_start).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    show(
      plotRef.current,
      <>
        <b>{monthLabel}</b>
        <br />
        {fmtMoney(t.total_spend_usd)}/mo · {fmtX(t.blended_value_per_dollar)} value · slop {t.avg_slop_risk.toFixed(0)}
      </>,
      clientX,
      clientY,
    );
    crosshair.setAttribute("x1", xPix(i).toFixed(1));
    crosshair.setAttribute("x2", xPix(i).toFixed(1));
    crosshair.style.opacity = 1;
  };
  const hideTrendsTip = () => {
    hide();
    if (crosshairRef.current) crosshairRef.current.style.opacity = 0;
  };
  const nearestIndex = (clientX) => {
    const rect = plotRef.current.getBoundingClientRect();
    const mouseX = (clientX - rect.left) * (W / rect.width);
    let idx = 0,
      minD = Infinity;
    trends.forEach((t, i) => {
      const d = Math.abs(xPix(i) - mouseX);
      if (d < minD) {
        minD = d;
        idx = i;
      }
    });
    return idx;
  };
  // A transparent overlay tracks mouse position across the whole plot width
  // so the tooltip follows continuously, not just when hovering a 4px dot.
  // Per-dot focus/blur covers the same for keyboard users. The overlay also
  // sits above the dots in paint order, so it -- not the dots -- has to own
  // the click too, or clicks on a dot never reach it.
  const handleOverlayMove = (e) => showTrendsTip(nearestIndex(e.clientX), e.clientX, e.clientY);
  const handleOverlayClick = (e) => {
    const i = nearestIndex(e.clientX);
    onSelectPoint(trends[i], i);
  };

  return (
    <>
      <svg
        className="plot"
        ref={plotRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Line chart of total AI spend by month"
      >
        <defs>
          <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity=".22" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--line)" />
        <text x={padL} y={padT + 2} fontSize="10.5" fill="var(--muted)">
          {`$${Math.round(maxSpend).toLocaleString()}`}
        </text>
        <path d={areaPath} fill="url(#trend-area-fill)" stroke="none" />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2" />
        {trends.map((t, i) => {
          const monthLabel = new Date(t.period_start).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
          const label = `${new Date(t.period_start).toLocaleDateString(undefined, { month: "long", year: "numeric" })}: ${fmtMoney(t.total_spend_usd)}/mo, ${fmtX(t.blended_value_per_dollar)} value, slop ${t.avg_slop_risk.toFixed(0)}. Activate to see that month's people.`;
          return (
            <g key={t.period_start}>
              <circle
                className="dot"
                tabIndex={0}
                role="img"
                aria-label={label}
                cx={xPix(i).toFixed(1)}
                cy={yPix(t.total_spend_usd).toFixed(1)}
                r="4"
                fill="var(--brand)"
                stroke="var(--panel)"
                strokeWidth="1.2"
                onFocus={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  showTrendsTip(i, rect.left + rect.width / 2, rect.top);
                }}
                onBlur={hideTrendsTip}
                onKeyDown={onActivateKey(() => onSelectPoint(t, i))}
              >
                <title>{label}</title>
              </circle>
              <text x={xPix(i).toFixed(1)} y={H - 8} fontSize="10" fill="var(--muted)" textAnchor="middle">
                {monthLabel}
              </text>
            </g>
          );
        })}
        <line className="crosshair" ref={crosshairRef} x1="0" y1={padT} x2="0" y2={H - padB} style={{ opacity: 0 }} />
        <rect
          className="trend-overlay"
          x={padL}
          y={padT}
          width={Math.max(0, W - padL - padR)}
          height={Math.max(0, H - padT - padB)}
          fill="transparent"
          onMouseMove={handleOverlayMove}
          onMouseLeave={hideTrendsTip}
          onClick={handleOverlayClick}
        />
      </svg>
      <div className="tip" style={{ left: tooltip.x, top: tooltip.y, opacity: tooltip.visible ? 1 : 0 }}>
        {tooltip.content}
      </div>
    </>
  );
}
