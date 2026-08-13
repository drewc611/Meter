import { useState } from "react";

// Shared tooltip for the SVG charts (ScatterChart, TrendChart) -- content
// is JSX, not an HTML string, so API-sourced text goes through React's
// normal escaping rather than innerHTML.
export function useChartTooltip() {
  // visible toggles independently so x/y/content hold their last value
  // while hidden, keeping the CSS opacity-transition fade on show/hide.
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, content: null, visible: false });

  function show(plotEl, content, clientX, clientY) {
    if (!plotEl) return;
    const wrap = plotEl.closest(".plotwrap").getBoundingClientRect();
    setTooltip({ x: clientX - wrap.left + 12, y: clientY - wrap.top - 8, content, visible: true });
  }

  function hide() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  return { tooltip, show, hide };
}
