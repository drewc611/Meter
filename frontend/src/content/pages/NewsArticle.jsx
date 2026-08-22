import ContentLayout from "../components/ContentLayout.jsx";

export function newsMeta(entry) {
  return {
    outFile: `news/${entry.slug}.html`,
    title: `${entry.title} — Merit AC News`,
    description: entry.dek,
  };
}

export default function NewsArticle({ entry }) {
  return (
    <ContentLayout active="news">
      <span className="kicker">{entry.date}</span>
      <h1>{entry.title}</h1>
      <p className="lead">{entry.dek}</p>

      {entry.body.map((block, i) =>
        block.type === "h2" ? <h2 key={i}>{block.text}</h2> : <p key={i}>{block.text}</p>
      )}

      {entry.corrections && entry.corrections.length > 0 && (
        <div className="card">
          <p className="kicker" style={{ marginBottom: "8px" }}>
            Corrections
          </p>
          <ul style={{ marginBottom: 0 }}>
            {entry.corrections.map((c, i) => (
              <li key={i}>
                <b>{c.date}:</b> {c.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Sources</h2>
      <ul>
        {entry.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url}>{s.label}</a>
          </li>
        ))}
      </ul>

      <p>
        <a href="/news">← All news</a>
      </p>
    </ContentLayout>
  );
}
