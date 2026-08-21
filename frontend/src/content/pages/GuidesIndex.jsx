import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "guides/index.html",
  title: "Guides — Merit",
  description: "General guides on doing AI work well, from the team building Merit. First articles in progress.",
};

export default function GuidesIndex() {
  return (
    <ContentLayout active="guides">
      <span className="kicker">Content</span>
      <span className="badge pending">
        <i /> First articles in progress
      </span>
      <h1>Guides</h1>
      <p className="lead">
        General writing on doing AI work well — not tied to Merit's own pitch. Nothing is published
        here yet; this index is live so the section has a real, indexable home as soon as the
        first pieces are ready, rather than linking to articles that don't exist.
      </p>
      <div className="card">
        <p>
          No guide is drafted with invented statistics or a testimonial standing in for a real one
          — when this section fills in, expect sourced, specific writing, not filler.
        </p>
      </div>
    </ContentLayout>
  );
}
