import ContentLayout from "../components/ContentLayout.jsx";
import { isSafeUrl } from "../lib/loadEntries.js";

export function newsletterMeta(entry) {
  return {
    outFile: `newsletter/${entry.slug}.html`,
    title: `${entry.title} — Merit AC Newsletter`,
    description: entry.dek,
  };
}

export default function NewsletterEntry({ entry }) {
  return (
    <ContentLayout active="newsletter">
      <span className="kicker">{entry.date}</span>
      <h1>{entry.title}</h1>

      <div className="card">
        <div dangerouslySetInnerHTML={{ __html: entry.html }} />
        <p style={{ marginBottom: 0, marginTop: "var(--sp-4)" }}>
          {isSafeUrl(entry.link) ? (
            <a className="btn btn-primary" href={entry.link}>
              Read the full post ↗
            </a>
          ) : (
            "Read the full post on the newsletter's own site."
          )}
        </p>
      </div>

      <p>
        <a href="/newsletter">← All newsletter posts</a>
      </p>
    </ContentLayout>
  );
}
