import ContentLayout from "../components/ContentLayout.jsx";
import { PROMPTS } from "../data/prompts.js";
import {
  ACADEMY_FREE_PREVIEW_DAYS,
  ACADEMY_MEMBERSHIP_PAYMENT_LINK,
  ACADEMY_MEMBERSHIP_PRICE_LABEL,
  ACADEMY_WORKSHOP_BOOKING_URL,
} from "../data/academy.js";

export const meta = {
  outFile: "academy.html",
  title: "AI Skills Academy — Clark X Group",
  description:
    "Courses, live workshops, and the 30-day hands-on challenge on governed agentic AI engineering -- the first 3 days free, the rest with membership. A Clark X Group venture.",
};

const PILLARS = [
  {
    title: "Hands-on challenges",
    meta: "The 30-day build, day by day -- a real prompt, why it's built that way, and what to do with the answer. Live now.",
  },
  {
    title: "Live workshops",
    meta: "Working sessions on a specific discipline or a stuck capstone build, not a rebroadcast of the guides. In production -- reserve a seat below.",
  },
  {
    title: "Courses",
    meta: "A structured, self-paced path through the same material for people who want the full arc before they start building. In production.",
  },
];

export default function AcademySpotlight() {
  const freeDays = PROMPTS.filter((p) => p.day <= ACADEMY_FREE_PREVIEW_DAYS);
  const lockedDays = PROMPTS.filter((p) => p.day > ACADEMY_FREE_PREVIEW_DAYS);

  return (
    <ContentLayout wide>
      <span className="kicker">Clark X Group / Venture</span>
      <span className="badge pending">
        <i /> Founding member pricing
      </span>
      <h1>
        Learn AI tools by <span className="accent-word">building</span> with them, not by
        watching someone else.
      </h1>
      <p className="lead">
        AI Skills Academy is a membership around one real thing: the 30-day challenge on governed
        agentic AI engineering, adapted from our own <em>Enterprise Agentic DevSecOps Handbook</em>.
        The first {ACADEMY_FREE_PREVIEW_DAYS} days are free, no signup required. Membership unlocks
        the rest of the 30 days, live workshops, and the course track as each one ships.
      </p>

      <div className="grid">
        {PILLARS.map((p) => (
          <div key={p.title} className="card" style={{ margin: 0 }}>
            <p className="tile-title" style={{ marginBottom: "4px" }}>
              {p.title}
            </p>
            <p className="tile-meta" style={{ marginBottom: 0 }}>
              {p.meta}
            </p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: "var(--sp-8)" }}>The 30-day challenge</h2>
      <p>
        Every day is a full prompt -- role, context, numbered steps, constraints, and output format
        -- plus why it's built that way and what to do with the answer. Days {ACADEMY_FREE_PREVIEW_DAYS + 1}
        {" "}through 30 build toward a real capstone: a governed agentic delivery platform, the same
        one described on <a href="/challenge">the challenge page</a>.
      </p>

      <p className="grid-group-label">
        Free -- days 1–{ACADEMY_FREE_PREVIEW_DAYS}
      </p>
      <div className="grid">
        {freeDays.map((p) => (
          <a key={p.day} className="tile" href={`/prompts/day-${p.day}-${p.slug}`}>
            <span className="tile-title">Day {p.day}: {p.title}</span>
            <span className="tile-meta">{p.track}</span>
          </a>
        ))}
      </div>

      <p className="grid-group-label" style={{ marginTop: "var(--sp-6)" }}>
        Membership -- days {ACADEMY_FREE_PREVIEW_DAYS + 1}–30
      </p>
      <div className="grid">
        {lockedDays.map((p) => (
          <div key={p.day} className="tile tile-locked" aria-disabled="true">
            <span className="tile-title">Day {p.day}: {p.title}</span>
            <span className="tile-meta">{p.track}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
        Every one of those days is real, already-written content -- membership is what unlocks it,
        not a placeholder waiting to be filled in.
      </p>

      <h2 id="membership" style={{ marginTop: "var(--sp-8)" }}>Membership</h2>
      <div className="grid">
        <div className="card" style={{ margin: 0 }}>
          <span className="kicker" style={{ marginBottom: "8px" }}>
            Free
          </span>
          <p className="tile-title" style={{ marginBottom: "4px" }}>
            $0
          </p>
          <p style={{ marginBottom: 0 }}>
            Days 1–{ACADEMY_FREE_PREVIEW_DAYS} of the challenge, plus everything already free
            elsewhere on the site -- <a href="/guides">guides</a>, the{" "}
            <a href="/prompts/composed-and-advanced-prompts">advanced prompt library</a>, and the{" "}
            <a href="/models">models directory</a>.
          </p>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <span className="kicker" style={{ marginBottom: "8px" }}>
            Membership
          </span>
          <p className="tile-title" style={{ marginBottom: "4px" }}>
            {ACADEMY_MEMBERSHIP_PRICE_LABEL}
          </p>
          <p style={{ marginBottom: "var(--sp-4)" }}>
            The full 30-day challenge, a seat at live workshops as they're scheduled, and first
            access to each course as it ships.
          </p>
          {ACADEMY_MEMBERSHIP_PAYMENT_LINK ? (
            <a className="btn btn-primary" href={ACADEMY_MEMBERSHIP_PAYMENT_LINK}>
              Join — {ACADEMY_MEMBERSHIP_PRICE_LABEL}
            </a>
          ) : (
            <>
              <span className="badge pending" style={{ marginBottom: "var(--sp-2)" }}>
                <i /> Not open yet
              </span>
              <p style={{ marginBottom: "8px" }}>
                Leave your email and you&apos;ll be first to know when membership opens:
              </p>
              <form className="signup-form" id="academyMembershipForm" noValidate>
                <label htmlFor="academyMembershipEmail" className="sr-only">
                  Work email
                </label>
                <input
                  type="email"
                  id="academyMembershipEmail"
                  name="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
                <button type="submit">Notify me</button>
              </form>
              <p className="signup-msg" id="academyMembershipMsg" role="status" aria-live="polite" />
              <script
                dangerouslySetInnerHTML={{
                  __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("academyMembershipForm");
  var input = document.getElementById("academyMembershipEmail");
  var msg = document.getElementById("academyMembershipMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var emailValue = input.value.trim();
    if (!emailValue) return;
    var btn = form.querySelector("button");
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Joining…";
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 15000);
    fetch(API_BASE + "/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailValue, source: "academy-membership" }),
      signal: controller.signal,
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "You're on the list — I'll email you the moment it opens.";
        msg.className = "signup-msg ok";
        form.reset();
      })
      .catch(function (err) {
        clearTimeout(timeoutId);
        msg.textContent = err && err.name === "AbortError"
          ? "This is taking longer than expected — try again in a moment."
          : "Couldn't reach the server — try again in a moment.";
        msg.className = "signup-msg err";
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
  });
})();`,
                }}
              />
            </>
          )}
        </div>
      </div>

      <h2 style={{ marginTop: "var(--sp-8)" }}>Live workshops</h2>
      <p>
        Working sessions on a specific discipline, domain, or a stuck capstone build -- not a
        rebroadcast of the written material. Cadence and the first date aren&apos;t locked yet;
        membership includes a seat once they are.
      </p>
      {ACADEMY_WORKSHOP_BOOKING_URL ? (
        <a className="btn btn-secondary" href={ACADEMY_WORKSHOP_BOOKING_URL}>
          Reserve a seat
        </a>
      ) : (
        <span className="badge pending">
          <i /> First workshop date not set yet
        </span>
      )}

      <p className="grid-group-label" style={{ marginTop: "var(--sp-8)" }}>
        How it compares
      </p>
      <div className="grid">
        <a className="tile" href="/comparisons/ai-skills-academy-vs-maven">
          <span className="tile-title">AI Skills Academy vs. Maven</span>
          <span className="tile-meta">
            A marketplace of hundreds of instructor-priced cohorts vs. one focused, membership-priced
            track with a real free preview
          </span>
        </a>
      </div>

      <p style={{ marginTop: "var(--sp-6)" }}>
        Everything above is real today except the course track and the first workshop date, both
        marked as such rather than dressed up. The same 30-day archive is also sold a la carte, as a
        one-time purchase with no recurring membership, at <a href="/prompts">/prompts</a> and{" "}
        <a href="/challenge">/challenge</a> -- both start from the same {ACADEMY_FREE_PREVIEW_DAYS}
        -day free preview. What Academy membership adds on top is the live workshops and the course
        track as each one ships, not exclusive access to the challenge content itself.
      </p>
    </ContentLayout>
  );
}
