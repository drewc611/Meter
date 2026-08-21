import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "challenge.html",
  title: "The 30-day challenge — Merit",
  description:
    "A free 30-day run of daily AI prompts, with a paid unlock at the end. Format described here; the payment mechanism is still being decided.",
};

export default function Challenge() {
  return (
    <ContentLayout active="challenge">
      <span className="kicker">Content</span>
      <span className="badge pending">
        <i /> Format set, payment not yet built
      </span>
      <h1>The 30-day challenge</h1>
      <p className="lead">
        Thirty days of the same detailed prompt archive at <a href="/prompts">/prompts</a>, free to
        follow along day by day. What's still being decided is what happens at the end — a paid
        unlock of some kind, mechanism not yet set.
      </p>
      <div className="card">
        <p>
          There's no checkout on this page and no price shown, because there isn't one yet —
          describing a payment flow that doesn't exist would be the same mistake as reporting a
          metric that hasn't been measured. When the mechanism is decided, this page updates to
          match it.
        </p>
      </div>
    </ContentLayout>
  );
}
