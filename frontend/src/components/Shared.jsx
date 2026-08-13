import { initials, slopColor, teamColor } from "../lib/format.js";

export function SlopBar({ risk }) {
  return (
    <div className="slopbar">
      <div className="track">
        <i style={{ width: `${risk}%`, background: slopColor(risk) }} />
      </div>
      <span>{risk.toFixed(0)}</span>
    </div>
  );
}

export function AvatarCell({ name, subtitle, colorKey }) {
  const c = teamColor(colorKey);
  return (
    <div className="who">
      <div className="av" style={{ background: c.bg, color: c.text }}>
        {initials(name)}
      </div>
      <div>
        <div className="nm">{name}</div>
        <div className="rl">{subtitle}</div>
      </div>
    </div>
  );
}

const PILL_MAP = {
  Frontier: ["var(--brand-soft)", "var(--brand-dark)"],
  Standard: ["var(--good-soft)", "var(--good-text)"],
  Basic: ["var(--chip)", "var(--muted)"],
};
export function Pill({ tier }) {
  const [c, f] = PILL_MAP[tier] || PILL_MAP.Basic;
  return (
    <span className="pill" style={{ background: c, color: f }}>
      {tier}
    </span>
  );
}

const CONF_LABELS = { tier1: "Tier 1", "tier1+2": "Tier 1+2", "tier1+2+3": "Tier 1+2+3" };
export function ConfPill({ confidence }) {
  return (
    <span className="pill" style={{ background: "var(--chip)", color: "var(--muted)" }}>
      {CONF_LABELS[confidence] || confidence}
    </span>
  );
}

export function recClass(rec) {
  if (rec.startsWith("Keep")) return "keep";
  if (rec.startsWith("Re-tier") || rec.startsWith("Review") || rec.startsWith("Over-tiered")) return "flag";
  return "";
}
