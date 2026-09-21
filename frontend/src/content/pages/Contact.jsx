import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "contact.html",
  title: "Contact — Merit AC",
  description:
    "Tell us where execution is slowing down and we'll follow up directly — not a mailing list, a direct line to the team behind Merit AC and Clark X.",
};

export default function Contact() {
  return (
    <ContentLayout>
      <span className="kicker">Get in touch</span>
      <h1>
        Find the bottleneck. Build the <span className="accent-word">leverage</span>.
      </h1>
      <p className="lead">
        Use Clark X for enterprise work, architecture, and new ventures — Merit AC is the proof
        point. Tell us where execution is slowing down and we&apos;ll follow up directly, not add
        you to a newsletter.
      </p>

      <div className="card">
        <form className="lead-form" id="clarkXLeadForm" noValidate>
          <div className="field">
            <label htmlFor="clarkXName">Name</label>
            <input type="text" id="clarkXName" name="name" placeholder="Your name" autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="clarkXEmail">Corporate email</label>
            <input
              type="email"
              id="clarkXEmail"
              name="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="clarkXNote">Primary bottleneck</label>
            <textarea
              id="clarkXNote"
              name="note"
              rows={3}
              placeholder="Where is execution slowing down?"
            />
          </div>
          <button type="submit" className="btn btn-primary lead-form-submit">
            Start the analysis
          </button>
        </form>
        <p className="signup-msg" id="clarkXLeadMsg" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("clarkXLeadForm");
  var msg = document.getElementById("clarkXLeadMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("clarkXEmail").value.trim();
    if (!email) return;
    var name = document.getElementById("clarkXName").value.trim();
    var note = document.getElementById("clarkXNote").value.trim();
    var btn = form.querySelector("button");
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 15000);
    fetch(API_BASE + "/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, name: name || null, note: note || null, source: "clarkx-analysis" }),
      signal: controller.signal,
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "Got it — we'll follow up directly.";
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
      </div>
    </ContentLayout>
  );
}
