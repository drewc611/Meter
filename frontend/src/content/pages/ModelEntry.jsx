import ContentLayout from "../components/ContentLayout.jsx";
import { stripTags, isSafeUrl } from "../lib/loadEntries.js";

export function modelMeta(entry) {
  return {
    outFile: `models/${entry.slug}.html`,
    title: `${entry.name} — Merit AC Models & Tools`,
    description: stripTags(entry.html).slice(0, 200),
  };
}

export default function ModelEntry({ entry }) {
  return (
    <ContentLayout active="models">
      <span className="kicker">{entry.maker}</span>
      <h1>{entry.name}</h1>
      <div className="card">
        <div dangerouslySetInnerHTML={{ __html: entry.html }} />
        <p className="tile-meta" style={{ margin: "10px 0" }}>
          {entry.pricingNote}
        </p>
        <p style={{ marginBottom: 0 }}>
          {isSafeUrl(entry.sourceUrl) ? <a href={entry.sourceUrl}>Source</a> : "Source"} · verified{" "}
          {entry.verifiedDate}
        </p>
      </div>
      <p>
        <a href="/models">← All models &amp; tools</a>
      </p>
    </ContentLayout>
  );
}
