/* =====================================================================
   FORMATTERS
   ===================================================================== */
// Fixed categorical order (never cycled/reassigned) validated against the
// dataviz palette gates for CVD + normal-vision separation. Each team gets a
// soft tint background + a darkened version of its hue for text, since three
// of these six hues (aqua, yellow, magenta) fall short of 3:1 white-on-color
// contrast on their own — the "relief" the validator flags for those slots.
export const teamColors = {
  Data: { bg: "#e5eefb", text: "#2a78d6" },
  Design: { bg: "#fdece2", text: "#c8511f" },
  Engineering: { bg: "#e0f6ee", text: "#0f9464" },
  Marketing: { bg: "#fdf1d9", text: "#9c6a00" },
  Sales: { bg: "#fbe7ef", text: "#c14883" },
  Support: { bg: "#dff3df", text: "#046b04" },
};
const FALLBACK_TEAM_COLOR = { bg: "var(--chip)", text: "var(--muted)" };
export function teamColor(name) {
  return teamColors[name] || FALLBACK_TEAM_COLOR;
}
export function initials(n) {
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2);
}
export function slopColor(s) {
  return s >= 60 ? "var(--bad)" : s >= 35 ? "var(--warn)" : "var(--good)";
}
export function fmtMoney(n) {
  return "$" + Math.round(n).toLocaleString();
}
export function fmtX(n) {
  return n.toFixed(2) + "×";
}
// --good/--bad/--warn are also used for large text and non-text (bars,
// dots), where they're contrast-safe; --good-text/--warn-text are the same
// hues darkened for the small bold table text this feeds (WCAG AA needs
// 4.5:1 there vs. the 3:1 large-text minimum the KPI numbers get away with).
// Same number the scatter plot's quadrant line (ScatterChart) is drawn at --
// both mark "good" value/$ at the same place, so they share this constant.
export const VALUE_GOOD_THRESHOLD = 1.6;
export function valueColor(v) {
  return v >= VALUE_GOOD_THRESHOLD ? "var(--good-text)" : v < 0 ? "var(--bad)" : "var(--warn-text)";
}
export const TOOL_LABELS = {
  anthropic_api: "Anthropic API",
  github_copilot: "GitHub Copilot",
  chatgpt_enterprise: "ChatGPT Enterprise",
};
export function toolLabel(t) {
  return TOOL_LABELS[t] || t;
}
