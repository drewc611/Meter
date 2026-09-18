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

      <label htmlFor="glossaryFilter" className="sr-only">
        Filter terms
      </label>
      <input
        type="search"
        id="glossaryFilter"
        className="filter-input"
        placeholder="Filter terms…"
        autoComplete="off"
        style={{ marginBottom: "var(--sp-6)" }}
      />
      <p id="glossaryFilterEmpty" className="signup-msg" style={{ display: "none" }}>
        No terms match that filter.
      </p>

      <div className="grid" id="glossaryGrid">
        {sorted.map((entry) => (
          <a
            key={entry.slug}
            id={entry.slug}
            className="tile"
            href={`#${entry.slug}`}
            data-filter-key={entry.term.toLowerCase()}
          >
            <span className="tile-title">{entry.term}</span>
            <span dangerouslySetInnerHTML={{ __html: entry.html }} />
          </a>
        ))}
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
  var input = document.getElementById("glossaryFilter");
  var empty = document.getElementById("glossaryFilterEmpty");
  var tiles = Array.prototype.slice.call(document.querySelectorAll("#glossaryGrid [data-filter-key]"));
  input.addEventListener("input", function () {
    var query = input.value.trim().toLowerCase();
    var anyVisible = false;
    tiles.forEach(function (tile) {
      var match = !query || tile.getAttribute("data-filter-key").indexOf(query) !== -1;
      tile.style.display = match ? "" : "none";
      if (match) anyVisible = true;
    });
    empty.style.display = anyVisible ? "none" : "";
  });
})();`,
        }}
      />
    </ContentLayout>
  );
}
