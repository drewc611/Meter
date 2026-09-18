import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "models.html",
  title: "AI Models & Tools Directory — Merit AC",
  description: "A directory of AI models and tools -- verified and dated, not a static list that goes stale.",
};

const CATEGORY_LABELS = {
  llm: "Language models",
  "coding-assistant": "Coding assistants",
  "image-generation": "Image & video generation",
  "music-generation": "Music generation",
  "agent-framework": "Agent frameworks",
  voice: "Voice",
  "vector-database": "Vector databases",
  "enterprise-ai-platform": "Enterprise AI platforms",
  other: "Other",
};

const CATEGORY_ORDER = [
  "llm",
  "coding-assistant",
  "image-generation",
  "music-generation",
  "agent-framework",
  "voice",
  "vector-database",
  "enterprise-ai-platform",
  "other",
];

export default function ModelsDirectory({ entries }) {
  return (
    <ContentLayout active="models">
      <span className="kicker">Reference</span>
      <h1>AI models &amp; tools</h1>
      <p className="lead">
        A directory of AI models and tools actually worth knowing about -- grouped by what they're
        for, each one dated with when its facts were last checked. This space moves fast: models get
        deprecated, prices change, whole products get discontinued. An entry here is a snapshot, not
        a permanent record — check the source link for anything current.
      </p>

      <label htmlFor="modelsFilter" className="sr-only">
        Filter by name or maker
      </label>
      <input
        type="search"
        id="modelsFilter"
        className="filter-input"
        placeholder="Filter by name or maker…"
        autoComplete="off"
        style={{ marginBottom: "var(--sp-6)" }}
      />
      <p id="modelsFilterEmpty" className="signup-msg" style={{ display: "none" }}>
        No models or tools match that filter.
      </p>

      {CATEGORY_ORDER.map((category) => {
        const items = entries.filter((m) => m.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category} data-filter-section>
            <h2>{CATEGORY_LABELS[category]}</h2>
            <div className="grid">
              {items.map((m) => (
                <a
                  key={m.slug}
                  id={m.slug}
                  className="tile"
                  href={`/models/${m.slug}`}
                  data-filter-key={`${m.name} ${m.maker}`.toLowerCase()}
                >
                  <span className="tile-title">{m.name}</span>
                  <span className="tile-meta">{m.maker}</span>
                </a>
              ))}
            </div>
          </section>
        );
      })}

      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
  var input = document.getElementById("modelsFilter");
  var empty = document.getElementById("modelsFilterEmpty");
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-filter-section]"));
  input.addEventListener("input", function () {
    var query = input.value.trim().toLowerCase();
    var anyVisible = false;
    sections.forEach(function (section) {
      var tiles = Array.prototype.slice.call(section.querySelectorAll("[data-filter-key]"));
      var sectionHasMatch = false;
      tiles.forEach(function (tile) {
        var match = !query || tile.getAttribute("data-filter-key").indexOf(query) !== -1;
        tile.style.display = match ? "" : "none";
        if (match) sectionHasMatch = true;
      });
      section.style.display = sectionHasMatch ? "" : "none";
      if (sectionHasMatch) anyVisible = true;
    });
    empty.style.display = anyVisible ? "none" : "";
  });
})();`,
        }}
      />
    </ContentLayout>
  );
}
