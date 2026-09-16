import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "products.html",
  title: "Products — Clark X Group",
  description:
    "Every product Clark X Group has shipped: Merit AC, Operator OS, Financert, The All Dash, and Portamp — what each one does and who it's for.",
};

const PRODUCTS = [
  {
    href: "/app",
    name: "Merit AC",
    tag: "Flagship",
    summary:
      "An AI intelligence hub and spend tracker: news, a models-and-tools directory, and a glossary, anchored by a dashboard that scores whether a company's AI spend is producing real work or slop.",
  },
  {
    href: "/operator-os",
    name: "Operator OS",
    tag: "Standalone CLI",
    summary:
      "A file-based business operating system for solo operators — double-entry books, cash forecasting with odds attached, import adapters, and a scheduled agent layer, all running on your own machine.",
  },
  {
    href: "/financert",
    name: "Financert",
    tag: "Venture",
    summary:
      "Compares your portfolio's asset allocation against the Federal Reserve's own household wealth data, by percentile tier — top 0.1%, top 1%, next 9%, next 40%, bottom 50%.",
  },
  {
    href: "/all-dash",
    name: "The All Dash",
    tag: "Venture",
    summary:
      "A command center for one project or one person: feed it the documents you already have and it builds the dashboard — tasks, boards, triage, metrics, and an AI assistant that cites its sources. Runs entirely in your browser.",
  },
  {
    href: "/portamp",
    name: "Portamp",
    tag: "Venture",
    summary:
      "Ports a legacy front end to React, Vue, Svelte, or a dependency-free custom element, without losing the look or the API contract. Reads Angular, jQuery, native Windows executables, PDFs, even a running app with no source at all.",
  },
];

export default function Products() {
  return (
    <ContentLayout active="products">
      <span className="kicker">Clark X Group</span>
      <h1>Every product we've shipped</h1>
      <p className="lead">
        Clark X Group is a technology holding company. Merit AC is the flagship — the rest are
        ventures built the same way: real, working software, not a pitch deck.
      </p>

      <div className="grid">
        {PRODUCTS.map((p) => (
          <a key={p.href} className="tile" href={p.href}>
            <span className="chip">{p.tag}</span>
            <span className="tile-title">{p.name}</span>
            <span className="tile-meta">{p.summary}</span>
          </a>
        ))}
      </div>
    </ContentLayout>
  );
}
