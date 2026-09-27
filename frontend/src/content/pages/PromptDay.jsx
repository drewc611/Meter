import ContentLayout from "../components/ContentLayout.jsx";
import Code from "../components/Code.jsx";
import { PROMPTS } from "../data/prompts.js";
import {
  CHALLENGE_ACCESS_PAYMENT_LINK,
  CHALLENGE_ACCESS_PRICE_LABEL,
  CHALLENGE_FREE_PREVIEW_DAYS,
  PAID_TRACK_PAYMENT_LINK,
  PAID_TRACK_PRICE_LABEL,
} from "../data/paidTrack.js";

export function promptMeta(entry) {
  const isFree = entry.day <= CHALLENGE_FREE_PREVIEW_DAYS;
  return {
    outFile: `prompts/day-${entry.day}-${entry.slug}.html`,
    title: `Day ${entry.day}: ${entry.title} — Merit AC Prompts`,
    description: isFree
      ? entry.prompt.slice(0, 155)
      : `Day ${entry.day} of the 30-day challenge -- ${entry.track}. Unlock the full 30 days for ${CHALLENGE_ACCESS_PRICE_LABEL}.`,
  };
}

export default function PromptDay({ entry }) {
  const prev = PROMPTS.find((p) => p.day === entry.day - 1);
  const next = PROMPTS.find((p) => p.day === entry.day + 1);
  const isFree = entry.day <= CHALLENGE_FREE_PREVIEW_DAYS;

  return (
    <ContentLayout active="prompts">
      <span className="kicker">{entry.track}</span>
      <span className="badge">
        <i /> Day {entry.day} of 30{!isFree && " · Unlock to read"}
      </span>
      <h1>{entry.title}</h1>

      {isFree ? (
        <>
          <h2>The prompt</h2>
          <Code>{entry.prompt}</Code>

          <h2>Why it's built that way</h2>
          <p>{entry.why}</p>

          <h2>What to do with the answer</h2>
          <p>{entry.whatToDo}</p>
        </>
      ) : (
        <div className="card">
          <p className="kicker" style={{ marginBottom: "8px" }}>
            {CHALLENGE_ACCESS_PRICE_LABEL}
          </p>
          <p>
            Days 1–{CHALLENGE_FREE_PREVIEW_DAYS} are free to read, no signup required. This one --
            the prompt, why it's built that way, and what to do with the answer -- unlocks with the
            rest of the 30 days for a single one-time payment.
          </p>
          {CHALLENGE_ACCESS_PAYMENT_LINK ? (
            <a className="btn btn-primary" href={CHALLENGE_ACCESS_PAYMENT_LINK}>
              Unlock all 30 days — {CHALLENGE_ACCESS_PRICE_LABEL}
            </a>
          ) : (
            <>
              <span className="badge pending" style={{ marginBottom: "var(--sp-2)" }}>
                <i /> Payment link coming soon
              </span>
              <p style={{ marginBottom: "8px" }}>
                Leave your email and I&apos;ll let you know the moment it&apos;s open:
              </p>
              <form className="signup-form" id="challengeAccessForm" noValidate>
                <label htmlFor="challengeAccessEmail" className="sr-only">
                  Work email
                </label>
                <input
                  type="email"
                  id="challengeAccessEmail"
                  name="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
                <button type="submit">Notify me</button>
              </form>
              <p className="signup-msg" id="challengeAccessMsg" role="status" aria-live="polite" />
              <script
                dangerouslySetInnerHTML={{
                  __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("challengeAccessForm");
  var input = document.getElementById("challengeAccessEmail");
  var msg = document.getElementById("challengeAccessMsg");
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
      body: JSON.stringify({ email: emailValue, source: "prompt-day-access" }),
      signal: controller.signal,
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "You're on the list — I'll email you when it opens.";
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
      )}

      {entry.day === 30 && (
        <p>
          That's the full 30 days. If you want a second set of eyes on the result,{" "}
          <a href="/challenge#paid-track">a paid review is available</a> ({PAID_TRACK_PRICE_LABEL})
          of finished builds against the challenge's Definition of Done
          {PAID_TRACK_PAYMENT_LINK ? "" : " -- payment link coming soon"}.
        </p>
      )}

      <div className="cta-row">
        {prev && (
          <a className="btn btn-secondary" href={`/prompts/day-${prev.day}-${prev.slug}`}>
            ← Day {prev.day}
          </a>
        )}
        <a className="btn btn-secondary" href="/prompts">
          All 30 days
        </a>
        {next && (
          <a className="btn btn-primary" href={`/prompts/day-${next.day}-${next.slug}`}>
            Day {next.day} →
          </a>
        )}
      </div>
    </ContentLayout>
  );
}
