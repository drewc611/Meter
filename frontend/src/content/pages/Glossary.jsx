import ContentLayout from "../components/ContentLayout.jsx";
import { GLOSSARY } from "../data/glossary.js";

export const meta = {
  outFile: "glossary.html",
  title: "AI Glossary — Merit AC",
  description: "Plain-English definitions for AI terms -- no jargon left unexplained.",
};

export default function Glossary() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <ContentLayout active="glossary">
      <span className="kicker">Reference</span>
      <h1>Glossary</h1>
      <p className="lead">
        Plain-English definitions for AI terms, alphabetical. A few entries define terms this site's
        own product uses (rework tax, shadow AI) — those are the same definitions the product itself
        works from, not a separate marketing gloss.
      </p>

      {sorted.map((entry) => (
        <div key={entry.slug} id={entry.slug} className="card" style={{ margin: "0 0 12px" }}>
          <p className="tile-title" style={{ marginBottom: "6px" }}>
            {entry.term}
          </p>
          <p style={{ marginBottom: 0 }}>{entry.definition}</p>
        </div>
      ))}
    </ContentLayout>
  );
}
