import ContentLayout from "../components/ContentLayout.jsx";
import { NEWS_ARTICLES } from "../data/news.js";

export const meta = {
  outFile: "news/index.html",
  title: "News — Merit AC",
  description: "Commentary on the AI news that actually matters, picked up as it happens -- sourced, dated, no filler.",
};

export default function NewsIndex() {
  const sorted = [...NEWS_ARTICLES].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <ContentLayout active="news">
      <span className="kicker">Content</span>
      <span className="badge">
        <i /> Real news, real sources
      </span>
      <h1>News</h1>
      <p className="lead">
        Commentary on AI news worth actually reading — picked up as it happens, each one dated and
        linked to real sources. Nothing here is forced out on a schedule: if nothing genuinely
        interesting happened since the last one, no article gets published just to fill a slot.
      </p>

      {sorted.length === 0 ? (
        <div className="card">
          <p style={{ marginBottom: 0 }}>Nothing published yet — check back soon.</p>
        </div>
      ) : (
        <div className="grid">
          {sorted.map((a) => (
            <a key={a.slug} className="tile" href={`/news/${a.slug}`}>
              <span className="tile-title">{a.title}</span>
              <span className="tile-meta">
                {a.date} — {a.dek}
              </span>
            </a>
          ))}
        </div>
      )}
    </ContentLayout>
  );
}
