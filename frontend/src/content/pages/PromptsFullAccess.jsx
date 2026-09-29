import ContentLayout from "../components/ContentLayout.jsx";
import Code from "../components/Code.jsx";
import { PROMPTS } from "../data/prompts.js";

// The post-purchase delivery page for the $79 one-time "unlock all 30 days"
// product (see paidTrack.js). This site is fully static with no backend, no
// auth, and no Stripe webhook -- there is no way to check whether a given
// visitor actually paid. What this page IS: the real, full content for all
// 30 days, at a fixed URL that carries `noindex` (see prerender-content.mjs)
// and is not linked from anywhere else on the site -- not the day-by-day
// pages, not /prompts, not /challenge, not the nav, not the sitemap.
// Delivery works by configuring this page's URL as the Stripe Payment
// Link's after-payment redirect (Stripe Dashboard -> the payment link ->
// "After payment" -> Redirect customers to a website -> paste this page's
// full URL). That is obscurity, not access control: anyone who has this
// URL -- a paying customer, or anyone they forward it to -- can read
// everything on it, same as any other static page on the internet. Don't
// present this page's existence as a security boundary; it isn't one.
export const meta = {
  outFile: "prompts/full-access-y1txjt9yz3eu.html",
  title: "All 30 Days — Merit AC Prompts",
  description: "The full 30-day prompt archive, unlocked.",
  noindex: true,
};

export default function PromptsFullAccess() {
  return (
    <ContentLayout active="prompts" wide>
      <span className="kicker">Unlocked</span>
      <span className="badge">
        <i /> All 30 days
      </span>
      <h1>The full 30-day challenge</h1>
      <p className="lead">
        This page holds every day's real content in one place -- the prompt, why it's built that
        way, and what to do with the answer. Bookmark it; there's no login to lose. If you paid for
        access and lost this link, get in touch from <a href="/contact">/contact</a> with your
        receipt and I'll resend it.
      </p>

      <p className="day-progress">Jump to a day:</p>
      <div className="grid">
        {PROMPTS.map((p) => (
          <a key={p.day} className="tile" href={`#day-${p.day}`}>
            <span className="tile-title">Day {p.day}: {p.title}</span>
            <span className="tile-meta">{p.track}</span>
          </a>
        ))}
      </div>

      {PROMPTS.map((p) => (
        <div key={p.day} id={`day-${p.day}`} style={{ scrollMarginTop: "80px", marginTop: "var(--sp-10)" }}>
          <span className="kicker">{p.track}</span>
          <h2 style={{ marginTop: "var(--sp-2)" }}>
            Day {p.day}: {p.title}
          </h2>

          <h3>The prompt</h3>
          <Code>{p.prompt}</Code>

          <h3>Why it's built that way</h3>
          <p>{p.why}</p>

          <h3>What to do with the answer</h3>
          <p>{p.whatToDo}</p>
        </div>
      ))}

      <p style={{ marginTop: "var(--sp-10)" }}>
        That's all 30. If you want a second set of eyes on your finished build,{" "}
        <a href="/challenge#paid-track">a paid review is available</a> against the challenge's
        Definition of Done.
      </p>
    </ContentLayout>
  );
}
