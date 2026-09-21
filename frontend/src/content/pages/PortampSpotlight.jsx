import { Fragment } from "react";
import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "portamp.html",
  title: "Portamp — Clark X Group",
  description:
    "Portamp ports a legacy front end to React, Vue, Svelte, or a dependency-free custom element -- without losing the look or the API contract. Reads Angular, jQuery, native Windows executables, PDFs, even a running app with no source at all. A Clark X Group venture.",
};

// A step-and-arrow flow diagram: A → B → C. Same shape used elsewhere on
// this site (see guides/AISystemPatterns.jsx, Home.jsx).
function LinearDiagram({ steps }) {
  return (
    <div className="arch-diagram">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          <div className="arch-step">
            <span className="arch-step-label">{step.label}</span>
            {step.note && <span className="arch-step-note">{step.note}</span>}
          </div>
          {i < steps.length - 1 && (
            <span className="arch-arrow" aria-hidden="true">
              →
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

const PIPELINE_STEPS = [
  { label: "Scan", note: "reads the legacy app or site" },
  { label: "Extract", note: "components, endpoints, bindings" },
  { label: "Plan", note: "design tokens, distinct endpoints" },
  { label: "Emit", note: "components + a conformance suite" },
  { label: "Verify", note: "parity report, what's unverified" },
];

const READS = [
  "Angular, AngularJS, Vue, Svelte, Lit, Alpine, Knockout, Backbone, jQuery, Polymer, Riot, React",
  "Native Windows executables (.exe) — dialogs, menus, string tables",
  "WinForms, XAML (WPF/UWP/MAUI), VB6, Delphi form files",
  "PDF technical documentation, with headings and links recovered",
  "A screenshot or a photo of a screen, sketch, or printed form",
  "A running app with no source at all, by driving it like a person would",
  "A live site by URL — fetched, mapped, or scraped, within stated authorization",
];

const FEATURES = [
  {
    title: "One intermediate representation",
    meta: "Every reader turns its dialect into one IR; every emitter turns that back into its own target — porting N frameworks to M is a reader plus a printer, not N×M translators. CI proves byte-identical output across four targets from two different source dialects.",
  },
  {
    title: "Conformance, not just compilation",
    meta: "Portamp walks the old app and records what each action actually did, then writes that as a test suite against the port — a port that silently drops a validation rule fails, by name.",
  },
  {
    title: "A real, small core",
    meta: "729 lines across four files, zero runtime dependencies. Five plugin classes — input, dsp, output, vis, general — the same shape Winamp used for audio, pointed at front-end migration instead.",
  },
  {
    title: "Recovers a design system, not pixels",
    meta: "Emits a token file (density, type scale, spacing, color roles) recovered by fitting the app's own sizes, not imposed — then brings contrast up to WCAG without changing the brand color.",
  },
  {
    title: "Policy enforced in the kernel",
    meta: "A credential found in legacy source stops the run before anything is written. Live or billable calls are refused by default and need an explicit flag. Reconstructing a system you don't own needs a signed authorization on disk first.",
  },
  {
    title: "Deploys to six clouds",
    meta: "AWS, GCP, Azure, Cloudflare, Vercel, Netlify — each a deterministic infrastructure plan you review and apply with your own credentials. It never takes a secret.",
  },
];

export default function PortampSpotlight() {
  return (
    <ContentLayout>
      <span className="kicker">Clark X Group / Venture</span>
      <span className="badge">
        <i /> Proprietary — early access
      </span>
      <h1>
        <span className="accent-word">Port</span> a legacy front end without losing the look or
        the API contract.
      </h1>
      <p className="lead">
        Portamp reads what a legacy application actually is — its components, its endpoints, its
        design tokens, the rules its validation enforced — and rebuilds it in React, Vue, Svelte,
        or a custom element that depends on nothing. Not a codemod that rewrites syntax: it recovers
        a system, then proves the rebuild still behaves like the original with a conformance suite
        written from what the old app actually did.
      </p>

      <h2>Five stages, five plugin classes</h2>
      <p>
        A kernel that knows none of them — it loads a plugin, hands it a shared context, and gets
        out of the way:
      </p>
      <LinearDiagram steps={PIPELINE_STEPS} />

      <h2>What it does</h2>
      <div className="grid">
        {FEATURES.map((f) => (
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

      <h2>What it reads</h2>
      <ul>
        {READS.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p>
        When there's no source and the app can't be driven directly, it reads what survived instead
        — a HAR of its traffic, a schema dump, an OpenAPI export — and every gap it can't fill is
        named, never guessed at.
      </p>

      <p className="grid-group-label" style={{ marginTop: "var(--sp-8)" }}>
        How it compares
      </p>
      <div className="grid">
        <a className="tile" href="/comparisons/portamp-vs-github-copilot">
          <span className="tile-title">Portamp vs. GitHub Copilot</span>
          <span className="tile-meta">
            A generated conformance suite vs. AI-assisted coding with parity verification left to
            the developer
          </span>
        </a>
      </div>

      <div className="card" style={{ marginTop: "var(--sp-10)" }}>
        <span className="kicker" style={{ marginBottom: "var(--sp-2)" }}>
          Get early access
        </span>
        <p style={{ marginBottom: "var(--sp-2)" }}>
          Leave your email and we&apos;ll let you know as Portamp opens up beyond the CLI:
        </p>
        <form className="signup-form" id="portampBetaForm" noValidate>
          <label htmlFor="portampBetaEmail" className="sr-only">
            Email
          </label>
          <input
            type="email"
            id="portampBetaEmail"
            name="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <button type="submit">Join the beta list</button>
        </form>
        <p className="signup-msg" id="portampBetaMsg" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("portampBetaForm");
  var input = document.getElementById("portampBetaEmail");
  var msg = document.getElementById("portampBetaMsg");
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
      body: JSON.stringify({ email: emailValue, source: "portamp-beta" }),
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
        Portamp is a proprietary Clark X Group venture — what it emits from your own source is
        yours. Docs and the CLI: <a href="https://github.com/drewc611/Generator-tool">github.com/drewc611/Generator-tool</a>.
      </p>
    </ContentLayout>
  );
}
