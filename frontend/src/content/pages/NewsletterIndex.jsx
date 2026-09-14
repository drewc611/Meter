import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "newsletter/index.html",
  title: "Newsletter — Merit AC",
  description: "Posts from the newsletter, synced automatically from its RSS feed -- read here, or follow the link to the full post.",
};

export default function NewsletterIndex({ entries }) {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <ContentLayout active="newsletter">
      <span className="kicker">Content</span>
      <h1>Newsletter</h1>
      <p className="lead">
        Posts synced automatically from the newsletter's own RSS feed — new issues show up here on
        the next build, no manual copy-paste. Each entry links back to the full post on its home
        platform.
      </p>

      {sorted.length === 0 ? (
        <div className="card">
          <p style={{ marginBottom: 0 }}>
            Nothing synced yet — set <code>MERIT_NEWSLETTER_RSS_URL</code> to the feed's URL and
            run the next build.
          </p>
        </div>
      ) : (
        <div className="grid">
          {sorted.map((entry) => (
            <a key={entry.slug} className="tile" href={`/newsletter/${entry.slug}`}>
              <span className="tile-title">{entry.title}</span>
              <span className="tile-meta">
                {entry.date} — {entry.dek}
              </span>
            </a>
          ))}
        </div>
      )}
    </ContentLayout>
  );
}
