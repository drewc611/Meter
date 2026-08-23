import ContentLayout from "../components/ContentLayout.jsx";
import { MODELS } from "../data/models.js";

export const meta = {
  outFile: "models.html",
  title: "AI Models & Tools Directory — Merit AC",
  description:
    "A directory of AI models and tools -- verified and dated, not a static list that goes stale.",
};

const CATEGORY_LABELS = {
  llm: "Language models",
  "coding-assistant": "Coding assistants",
  "image-generation": "Image & video generation",
  "agent-framework": "Agent frameworks",
  voice: "Voice",
  other: "Other",
};

const CATEGORY_ORDER = ["llm", "coding-assistant", "image-generation", "agent-framework", "voice", "other"];

export default function ModelsDirectory() {
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

      {CATEGORY_ORDER.map((category) => {
        const items = MODELS.filter((m) => m.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h2>{CATEGORY_LABELS[category]}</h2>
            <div className="grid">
              {items.map((m) => (
                <div key={m.slug} id={m.slug} className="card" style={{ margin: 0 }}>
                  <p className="tile-title" style={{ marginBottom: "4px" }}>
                    {m.name}
                  </p>
                  <p className="tile-meta" style={{ marginBottom: "10px" }}>
                    {m.maker}
                  </p>
                  <p style={{ marginBottom: "10px" }}>{m.description}</p>
                  <p className="tile-meta" style={{ marginBottom: "10px" }}>
                    {m.pricingNote}
                  </p>
                  <p style={{ marginBottom: 0 }}>
                    <a href={m.sourceUrl}>Source</a> · verified {m.verifiedDate}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </ContentLayout>
  );
}
