import { Fragment } from "react";

// Shared shell for the prerendered content-site pages (home, architecture,
// setup guides, guides, prompts, challenge). These render at build time via
// entry-server.jsx + scripts/prerender-content.mjs into plain static HTML --
// this component itself never ships any client-side JS, so there's nothing
// to hydrate and no risk of a blank-until-JS-runs page. The persistent
// left-hand section nav below is the same "never ships client-side JS"
// contract: it's a plain <aside>, no collapse state, just hidden under the
// mobile breakpoint where nav.site-nav's checkbox toggle takes over instead.
//
// Grouped rather than one flat 17-link list -- the groups mirror the
// Understand/Build/Operate/Measure taxonomy Home.jsx's own SURFACES already
// uses, so a visitor sees the same structure whether they land on / or open
// the nav from any other page. Group labels render in both the desktop
// sidebar and the mobile overlay (content.css scopes visibility per surface).
const NAV_GROUPS = [
  {
    label: "Products",
    items: [
      { key: "products", href: "/products", label: "All products" },
      { key: "comparisons", href: "/comparisons", label: "Comparisons" },
    ],
  },
  {
    label: "Understand",
    items: [
      { key: "news", href: "/news", label: "News" },
      { key: "newsletter", href: "/newsletter", label: "Newsletter" },
      { key: "models", href: "/models", label: "Models" },
      { key: "glossary", href: "/glossary", label: "Glossary" },
      { key: "ask", href: "/ask", label: "Ask" },
    ],
  },
  {
    label: "Build",
    items: [
      { key: "architecture", href: "/architecture", label: "Architecture" },
      { key: "cloud-architecture", href: "/cloud-architecture", label: "Cloud Architecture" },
      { key: "claude-architecture", href: "/claude-architecture", label: "Claude Architecture" },
      { key: "setup", href: "/setup/react", label: "Setup" },
      { key: "guides", href: "/guides", label: "Guides" },
      { key: "skills", href: "/skills", label: "Skills" },
      { key: "prompts", href: "/prompts", label: "Prompts" },
    ],
  },
  {
    label: "Operate",
    items: [
      { key: "operator-os", href: "/operator-os", label: "Operator OS" },
      { key: "challenge", href: "/challenge", label: "Challenge" },
      { key: "community", href: "/community", label: "Community" },
    ],
  },
  {
    label: "Company",
    items: [{ key: "pricing", href: "/pricing", label: "Pricing" }],
  },
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
            {NAV_GROUPS.map((group) => (
              <Fragment key={group.label}>
                <span className="section-nav-label">{group.label}</span>
                {group.items.map((item) => (
                  <a key={item.key} href={item.href} aria-current={item.key === active ? "page" : undefined}>
                    {item.label}
                  </a>
                ))}
              </Fragment>
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
          {NAV_GROUPS.map((group) => (
            <Fragment key={group.label}>
              <span className="section-nav-label section-nav-group-label">{group.label}</span>
              {group.items.map((item) => (
                <a key={item.key} href={item.href} aria-current={item.key === active ? "page" : undefined}>
                  {item.label}
                </a>
              ))}
            </Fragment>
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
