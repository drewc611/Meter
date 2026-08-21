import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "prompts/index.html",
  title: "Prompts — Merit",
  description: "A 30-day detailed AI prompt archive, tagged by stack. First entries in progress.",
};

export default function PromptsIndex() {
  return (
    <ContentLayout active="prompts">
      <span className="kicker">Content</span>
      <span className="badge pending">
        <i /> First entries in progress
      </span>
      <h1>Prompts</h1>
      <p className="lead">
        A daily prompt archive — one detailed entry per day, tagged by stack (react, python, node,
        tensorflow-pyro): the prompt itself, why it's built that way, and what to do with the
        answer. Nothing is published yet; this index exists so the archive has a real home before
        day one ships, rather than a placeholder page with fake entries linked from it.
      </p>
      <div className="card">
        <p>
          Once live, this becomes the free 30-day run behind the <a href="/challenge">challenge</a>{" "}
          — see that page for what changes at the end of the run.
        </p>
      </div>
    </ContentLayout>
  );
}
