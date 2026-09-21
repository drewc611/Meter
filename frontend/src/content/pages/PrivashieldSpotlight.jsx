import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "privashield.html",
  title: "PrivaShield — Clark X Group",
  description:
    "PrivaShield is a self-hosted security platform: Suricata/Zeek detection, local-LLM-assisted triage, and Ed25519-signed policy governance -- built so AI can analyze and recommend, but only signed, human-approved controls anything privileged. A Clark X Group venture.",
};

const PRINCIPLE = [
  { title: "AI is advisory-only", meta: "A local Ollama-backed model reads detection evidence and returns recommendations -- it never gets privileged access itself." },
  { title: "Enforcement is disabled by default", meta: "Every response action (block IP, isolate an interface, terminate a session, quarantine a file) runs in simulation only. enforced=false, no privileged data-plane access." },
  { title: "Policy changes are signed, not typed in", meta: "Every policy change is an Ed25519-signed envelope requiring two-person approval, with rollback -- not a config edit." },
];

const FACTS = [
  {
    title: "Real sensors, not a simulation",
    meta: "Suricata and Zeek run as actual passive network sensors, normalized into a canonical SecurityEvent model.",
  },
  {
    title: "Deterministic detection, tested like code",
    meta: "DLP, identity-anomaly, and ransomware-behavior engines are checked on every change against a versioned synthetic corpus, with CI that fails on a regression.",
  },
  {
    title: "Tamper-evident audit log",
    meta: "Every action lands in a hash-chained log with its own verification endpoint -- not a plain database table an admin can quietly edit.",
  },
  {
    title: "Local LLM, your infrastructure",
    meta: "Threat analysis runs through a self-hosted Ollama model. Nothing about the advisory layer requires sending telemetry to a third-party cloud AI vendor.",
  },
  {
    title: "Five-role RBAC",
    meta: "Viewer, analyst, operator, administrator, auditor -- gated dashboard and API access, with only token digests stored, never raw tokens.",
  },
  {
    title: "Apache-2.0, self-hosted",
    meta: "Open-source, run on your own infrastructure via Docker Compose -- Postgres, NATS, Ollama, the API, dashboard, WAF, and both sensor stacks.",
  },
];

export default function PrivashieldSpotlight() {
  return (
    <ContentLayout>
      <span className="kicker">Clark X Group / Venture</span>
      <span className="badge pending">
        <i /> Pre-production -- privileged enforcement disabled by design
      </span>
      <h1>
        AI that reads your security evidence. <span className="accent-word">Signed</span> humans
        decide what happens next.
      </h1>
      <p className="lead">
        PrivaShield ingests real network telemetry, runs deterministic detection engines across it,
        and lets a self-hosted LLM read that evidence and recommend a response -- but the model never
        gets to act. Every privileged action stays simulation-only until a signed, human-approved
        policy says otherwise.
      </p>

      <h2>The one rule the system enforces</h2>
      <div className="grid">
        {PRINCIPLE.map((p) => (
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
      <p>
        That split isn't a setting to remember to turn on -- it's structural. The AI layer has no
        path to a privileged action that doesn't pass through a cryptographically signed, two-person
        approval first.
      </p>

      <h2>What's actually running underneath</h2>
      <div className="grid">
        {FACTS.map((f) => (
          <div key={f.title} className="card" style={{ margin: 0 }}>
            <p className="tile-title" style={{ marginBottom: "4px" }}>
              {f.title}
            </p>
            <p className="tile-meta" style={{ marginBottom: 0 }}>
              {f.meta}
            </p>
          </div>
        ))}
      </div>

      <p style={{ marginTop: "var(--sp-3)" }}>
        How it compares to a mature, widely-deployed open-source alternative:{" "}
        <a href="/comparisons/privashield-vs-wazuh">PrivaShield vs. Wazuh</a>.
      </p>

      <h2>Where it stands today</h2>
      <p>
        PrivaShield's own README says this plainly: it is not production-ready as a privileged-
        enforcement control. External identity-provider integration, SBOM/provenance, and backup/
        restore qualification are still on the roadmap, and the packaged quickstart ships with
        authentication disabled by default for local development -- turning on{" "}
        <code>PRIVASHIELD_AUTH_MODE=local</code> is a deliberate step before any non-loopback
        exposure. It's early, and it says so.
      </p>

      <div className="card" style={{ marginTop: "var(--sp-10)" }}>
        <span className="kicker" style={{ marginBottom: "var(--sp-2)" }}>
          Get updates
        </span>
        <p style={{ marginBottom: "var(--sp-2)" }}>
          Leave your email and we&apos;ll let you know as PrivaShield moves toward a production-ready
          release:
        </p>
        <form className="signup-form" id="privashieldBetaForm" noValidate>
          <label htmlFor="privashieldBetaEmail" className="sr-only">
            Email
          </label>
          <input
            type="email"
            id="privashieldBetaEmail"
            name="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <button type="submit">Join the list</button>
        </form>
        <p className="signup-msg" id="privashieldBetaMsg" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("privashieldBetaForm");
  var input = document.getElementById("privashieldBetaEmail");
  var msg = document.getElementById("privashieldBetaMsg");
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
      body: JSON.stringify({ email: emailValue, source: "privashield-beta" }),
      signal: controller.signal,
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad status");
        msg.textContent = "You're on the list.";
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

      <p style={{ marginTop: "var(--sp-6)" }}>
        PrivaShield is an independent, open-source (Apache-2.0) Clark X Group venture -- source,
        architecture docs, and the full security model:{" "}
        <a href="https://github.com/drewc611/Privashield">github.com/drewc611/Privashield</a>.
      </p>
    </ContentLayout>
  );
}
