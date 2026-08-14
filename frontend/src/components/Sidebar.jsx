import { useAppData } from "../context/AppDataContext.jsx";
import Logo from "./Logo.jsx";
import { onActivateKey } from "./Shared.jsx";

const NAV_ITEMS = [
  {
    view: "overview",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    view: "people",
    label: "People",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="8" r="2.6" />
        <path d="M15.5 14.2c2.6.3 4.7 2.6 4.7 5.8" />
      </svg>
    ),
  },
  {
    view: "teams",
    label: "Teams & Roles",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 20V10M9 20V4M15 20v-7M21 20V8" />
      </svg>
    ),
  },
  {
    view: "alerts",
    label: "Alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l9 16H3L12 3z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
    ),
  },
  {
    view: "integrations",
    label: "Integrations",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
];

export function SourceBadge({ style }) {
  const { live, loaded } = useAppData();
  if (!loaded) {
    return (
      <div className="sb-badge demo" style={style}>
        <i />
        checking API…
      </div>
    );
  }
  return (
    <div className={`sb-badge ${live ? "live" : "demo"}`} style={style}>
      <i />
      {live ? "LIVE · Merit API" : "DEMO DATA · API offline"}
    </div>
  );
}

export default function Sidebar({ view, onSelect }) {
  const { hasSession, logout } = useAppData();
  return (
    <nav className="sidebar">
      <div className="sb-brand">
        <Logo />
      </div>
      <div className="sb-nav" id="nav">
        {NAV_ITEMS.map((item) => {
          const active = item.view === view;
          return (
            <div
              key={item.view}
              className={`sb-item${active ? " active" : ""}`}
              tabIndex={0}
              role="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onSelect(item.view)}
              onKeyDown={onActivateKey(() => onSelect(item.view))}
            >
              {item.icon}
              {item.label}
            </div>
          );
        })}
      </div>
      <div className="sb-foot">
        <SourceBadge />
        Merit
        <br />
        illustrative prototype
        {hasSession && (
          <>
            <br />
            <button type="button" className="sb-logout" onClick={logout}>
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
