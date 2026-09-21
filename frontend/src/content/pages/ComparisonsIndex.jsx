import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "comparisons/index.html",
  title: "Comparisons — Clark X Group",
  description:
    "How each Clark X Group product compares to a real, named alternative -- what the other tool actually does, where it's genuinely stronger, and where ours differs. Marketing content, written to the same no-invented-numbers standard as the rest of this site.",
};

export default function ComparisonsIndex({ entries }) {
  const sorted = [...entries].sort((a, b) => a.title.localeCompare(b.title));
  return (
    <ContentLayout active="comparisons">
      <span className="kicker">Clark X Group</span>
      <h1>How each product compares</h1>
      <p className="lead">
        This is marketing content, not the news arm — it's Clark X Group comparing its own products
        against a real, named alternative, not third-party reporting. Every claim about the other
        product is sourced and dated below the fold of each article; nothing here is an invented
        statistic or a made-up weakness. Full list of what we've shipped: <a href="/products">/products</a>.
      </p>

      <div className="grid">
        {sorted.map((e) => (
          <a key={e.slug} className="tile" href={`/comparisons/${e.slug}`}>
            <span className="tile-title">{e.title}</span>
            <span className="tile-meta">{e.tileMeta}</span>
          </a>
        ))}
      </div>
    </ContentLayout>
  );
}
