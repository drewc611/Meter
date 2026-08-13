import { useState } from "react";

// Shared crosshair/dot tooltip positioning for the SVG charts (ScatterChart,
// TrendChart) -- both float a `.tip` element inside a `.plotwrap`, anchored
// to the cursor. Content is stored as JSX (not an HTML string), so it flows
// through React's normal escaping instead of an innerHTML string built from
// API-sourced text.
export function useChartTooltip() {
  // `visible` toggles independently of x/y/content, which stay at their
  // last value while hidden -- matches the original imperative pattern
  // (opacity toggled via CSS transition, position left in place) rather
  // than mounting/unmounting the tip element on every hover.
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
