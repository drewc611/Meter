// Shared shell for the prerendered content-site pages (home, architecture,
// setup guides, guides, prompts, challenge). These render at build time via
// entry-server.jsx + scripts/prerender-content.mjs into plain static HTML --
// this component itself never ships any client-side JS, so there's nothing
// to hydrate and no risk of a blank-until-JS-runs page. The persistent
// left-hand section nav below is the same "never ships client-side JS"
// contract: it's a plain <aside>, no collapse state, just hidden under the
// mobile breakpoint where nav.site-nav's checkbox toggle takes over instead.
const NAV_ITEMS = [
  { key: "architecture", href: "/architecture", label: "Architecture" },
  { key: "cloud-architecture", href: "/cloud-architecture", label: "Cloud Architecture" },
  { key: "claude-architecture", href: "/claude-architecture", label: "Claude Architecture" },
  { key: "setup", href: "/setup/react", label: "Setup" },
  { key: "news", href: "/news", label: "News" },
  { key: "models", href: "/models", label: "Models" },
  { key: "skills", href: "/skills", label: "Skills" },
  { key: "glossary", href: "/glossary", label: "Glossary" },
  { key: "guides", href: "/guides", label: "Guides" },
  { key: "prompts", href: "/prompts", label: "Prompts" },
  { key: "challenge", href: "/challenge", label: "Challenge" },
  { key: "operator-os", href: "/operator-os", label: "Operator OS" },
  { key: "community", href: "/community", label: "Community" },
];

export default function ContentLayout({ active, wide, children }) {
  return (
    <>
      <header className="site">
        <div className="site-inner">
          <a className="brand-mark" href="/">
            <span className="bars" aria-hidden="true">
              <i style={{ height: "10px", background: "var(--brand-pale-strong)" }} />
              <i style={{ height: "15px", background: "var(--brand-soft)" }} />
              <i style={{ height: "18px", background: "var(--brand)" }} />
            </span>
            Merit AC<sup>™</sup>
          </a>
          {/* CSS-only mobile menu toggle (checkbox hack) -- no JS, matches this
              component's own "never ships client-side JS" contract above. Below
              the nav's wrap breakpoint, .site-nav is hidden until this is checked. */}
          <input type="checkbox" id="navToggle" className="nav-toggle-input" aria-hidden="true" />
          <label htmlFor="navToggle" className="nav-toggle">
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span className="sr-only">Menu</span>
          </label>
          <nav className="site-nav">
            {NAV_ITEMS.map((item) => (
              <a key={item.key} href={item.href} aria-current={item.key === active ? "page" : undefined}>
                {item.label}
              </a>
            ))}
            <a href="/app" className="nav-cta">
              Sign in
            </a>
          </nav>
        </div>
      </header>
      <div className="site-body">
        <aside className="section-nav" aria-label="Sections">
          <span className="section-nav-label">Merit AC</span>
          {NAV_ITEMS.map((item) => (
            <a key={item.key} href={item.href} aria-current={item.key === active ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </aside>
        <main className={wide ? "content wide" : "content"}>{children}</main>
      </div>
      <footer className="site">
        <div className="footer-inner">
          <span>Merit AC is a labeled prototype — the dashboard runs on illustrative demo data until you connect your own.</span>
          <a href="/app">Open the app</a>
        </div>
      </footer>
    </>
  );
}
