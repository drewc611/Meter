// Shared shell for the prerendered content-site pages (home, architecture,
// setup guides, guides, prompts, challenge). These render at build time via
// entry-server.jsx + scripts/prerender-content.mjs into plain static HTML --
// this component itself never ships any client-side JS, so there's nothing
// to hydrate and no risk of a blank-until-JS-runs page.
const NAV_ITEMS = [
  { key: "architecture", href: "/architecture", label: "Architecture" },
  { key: "setup", href: "/setup/react", label: "Setup" },
  { key: "guides", href: "/guides", label: "Guides" },
  { key: "prompts", href: "/prompts", label: "Prompts" },
  { key: "challenge", href: "/challenge", label: "Challenge" },
  { key: "community", href: "/community", label: "Community" },
];

export default function ContentLayout({ active, wide, children }) {
  return (
    <>
      <header className="site">
        <div className="site-inner">
          <a className="brand-mark" href="/">
            <span className="bars" aria-hidden="true">
              <i style={{ height: "10px", background: "var(--brand-pale)" }} />
              <i style={{ height: "15px", background: "var(--brand-soft)" }} />
              <i style={{ height: "18px", background: "var(--brand)" }} />
            </span>
            Merit AC<sup>™</sup>
          </a>
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
      <main className={wide ? "content wide" : "content"}>{children}</main>
      <footer className="site">
        <div className="footer-inner">
          <span>Merit AC is a labeled prototype — the dashboard runs on illustrative demo data until you connect your own.</span>
          <a href="/app">Open the app</a>
        </div>
      </footer>
    </>
  );
}
