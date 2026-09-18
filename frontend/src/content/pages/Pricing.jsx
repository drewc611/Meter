import ContentLayout from "../components/ContentLayout.jsx";
import {
  BOOKING_URL,
  CONSULTATION_PAYMENT_LINK,
  CONSULTATION_PRICE_LABEL,
  SUBSCRIPTION_PAYMENT_LINK,
  SUBSCRIPTION_PRICE_LABEL,
} from "../data/monetization.js";

export const meta = {
  outFile: "pricing.html",
  title: "Pricing — Merit AC",
  description: "Book a consultation or subscribe to Merit AC's paid tier.",
};

function InterestForm({ id, source, label }) {
  return (
    <>
      <p style={{ marginBottom: "8px" }}>Leave your email and I&apos;ll follow up directly:</p>
      <form className="signup-form" id={`${id}Form`} noValidate>
        <label htmlFor={`${id}Email`} className="sr-only">
          Work email
        </label>
        <input type="email" id={`${id}Email`} name="email" placeholder="you@company.com" required autoComplete="email" />
        <button type="submit">{label}</button>
      </form>
      <p className="signup-msg" id={`${id}Msg`} role="status" aria-live="polite" />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("${id}Form");
  var input = document.getElementById("${id}Email");
  var msg = document.getElementById("${id}Msg");
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
      body: JSON.stringify({ email: emailValue, source: "${source}" }),
      signal: controller.signal,
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "Got it — I'll follow up directly.";
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
  );
}

export default function Pricing() {
  return (
    <ContentLayout active="pricing">
      <span className="kicker">Work with us</span>
      <h1>Book a consultation, or subscribe</h1>
      <p className="lead">
        Two ways to work with the team behind Merit AC: a paid consultation, or an ongoing
        subscription. No sales call required to see the price.
      </p>

      <div className="grid">
        <div className="card" style={{ margin: 0 }}>
          <span className="kicker" style={{ marginBottom: "8px" }}>
            Consultation
          </span>
          <p className="tile-title" style={{ marginBottom: "4px" }}>
            {CONSULTATION_PRICE_LABEL}
          </p>
          <p style={{ marginBottom: "var(--sp-4)" }}>
            A working session on your own AI spend, architecture, or rollout — not a sales call.
          </p>

          {BOOKING_URL ? (
            <a className="btn btn-primary" href={BOOKING_URL} style={{ marginBottom: "var(--sp-2)" }}>
              Schedule a call
            </a>
          ) : null}
          {CONSULTATION_PAYMENT_LINK ? (
            <a
              className={BOOKING_URL ? "btn btn-secondary" : "btn btn-primary"}
              href={CONSULTATION_PAYMENT_LINK}
              style={{ marginLeft: BOOKING_URL ? "var(--sp-2)" : 0 }}
            >
              Pay for a session — {CONSULTATION_PRICE_LABEL}
            </a>
          ) : null}
          {!BOOKING_URL && !CONSULTATION_PAYMENT_LINK ? (
            <>
              <span className="badge pending" style={{ marginBottom: "var(--sp-2)" }}>
                <i /> Booking coming soon
              </span>
              <InterestForm id="consultation" source="pricing-consultation" label="Notify me" />
            </>
          ) : null}
        </div>

        <div className="card" style={{ margin: 0 }}>
          <span className="kicker" style={{ marginBottom: "8px" }}>
            Subscription
          </span>
          <p className="tile-title" style={{ marginBottom: "4px" }}>
            {SUBSCRIPTION_PRICE_LABEL}
          </p>
          <p style={{ marginBottom: "var(--sp-4)" }}>
            Ongoing access to the paid tier — ask what&apos;s included before committing.
          </p>

          {SUBSCRIPTION_PAYMENT_LINK ? (
            <a className="btn btn-primary" href={SUBSCRIPTION_PAYMENT_LINK}>
              Subscribe — {SUBSCRIPTION_PRICE_LABEL}
            </a>
          ) : (
            <>
              <span className="badge pending" style={{ marginBottom: "var(--sp-2)" }}>
                <i /> Not open yet
              </span>
              <InterestForm id="subscription" source="pricing-subscription" label="Notify me" />
            </>
          )}
        </div>
      </div>
    </ContentLayout>
  );
}
