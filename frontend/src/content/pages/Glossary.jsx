import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "glossary.html",
  title: "AI Glossary — Merit AC",
  description: "Plain-English definitions for AI terms -- no jargon left unexplained.",
};

export default function Glossary({ entries }) {
  const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <ContentLayout active="glossary">
      <span className="kicker">Reference</span>
      <h1>Glossary</h1>
      <p className="lead">
        Plain-English definitions for AI terms, alphabetical. A few entries define terms this site's
        own product uses (rework tax, shadow AI) — those are the same definitions the product itself
        works from, not a separate marketing gloss.
      </p>

      <div className="grid">
        {sorted.map((entry) => (
          <a key={entry.slug} id={entry.slug} className="tile" href={`#${entry.slug}`}>
            <span className="tile-title">{entry.term}</span>
            <span dangerouslySetInnerHTML={{ __html: entry.html }} />
          </a>
        ))}
      </div>
    </ContentLayout>
  );
}
