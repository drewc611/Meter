import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "financert.html",
  title: "Financert — Clark X Group",
  description:
    "Financert compares your portfolio's asset allocation against the Federal Reserve's own household wealth data, by percentile tier — top 0.1%, top 1%, next 9%, next 40%, bottom 50%. A Clark X Group venture.",
};

// Q1 2026 share of investable assets, by wealth tier — from the Federal
// Reserve's Distributional Financial Accounts, as published in Financert's
// own README (github.com/drewc611/Financert). Real government data, not an
// estimate, and not this site's own claim.
const ALLOCATION_TABLE = {
  headers: ["Asset class", "Top 0.1%", "Top 1%", "Next 9%", "Next 40%", "Bottom 50%"],
  rows: [
    ["Stocks & mutual funds", "54.2%", "50.3%", "31.3%", "11.3%", "7.1%"],
    ["Private business equity", "19.0%", "16.0%", "8.0%", "4.2%", "2.0%"],
    ["Real estate", "7.9%", "11.8%", "22.6%", "40.1%", "58.6%"],
    ["Pensions & retirement", "1.8%", "5.0%", "19.5%", "26.1%", "14.3%"],
    ["Cash & deposits", "6.0%", "6.2%", "7.7%", "9.2%", "9.6%"],
  ],
};

const COMPUTES = [
  {
    title: "Allocation",
    meta: "Your holdings and each tier's, normalized to shares — an apples-to-apples split.",
  },
  {
    title: "Gap",
    meta: "Per asset class, your share minus the benchmark's. Under 1.5pp is reported as “in line” — the underlying data doesn't support finer precision than that.",
  },
  {
    title: "Nearest tier",
    meta: "Cosine similarity between your mix and each tier's, so “looks like the next 40%” is measured, not a vibe.",
  },
];

const FACTS = [
  { title: "Real data, not estimates", meta: "Every number traces to the Fed's own DFA release, validated against its published totals on every refresh." },
  { title: "Self-hosted", meta: "Your holdings live in your own SQLite database, gated by a bearer token you set — not a hosted account." },
  { title: "Works with no network", meta: "Installable as an app; ships with an embedded snapshot of the Fed data so it renders standalone if the API is unreachable." },
  { title: "Six languages", meta: "English, Spanish, French, German, Portuguese and Arabic, including full RTL layout for Arabic." },
  { title: "Talks to an AI assistant", meta: "An MCP server exposes six read-only tools, so Claude or another assistant can answer “how does my portfolio compare to the top 1%?” directly." },
  { title: "Not investment advice", meta: "It reports what the data says. Copying the top 1%'s mix wouldn't reproduce their returns — a sixth of their assets is equity in businesses they run." },
];

export default function FinancertSpotlight() {
  return (
    <ContentLayout>
      <span className="kicker">Clark X Group / Venture</span>
      <span className="badge">
        <i /> Early access — self-hosted, real Federal Reserve data
      </span>
      <h1>
        See how the top 1% actually hold their money. Then see where you{" "}
        <span className="accent-word">stand</span>.
      </h1>
      <p className="lead">
        Financert answers one question with real data: how do the wealthiest American households
        actually hold their money, and how does your portfolio compare? Enter what you own by
        asset class and see your allocation beside every tier from the top 0.1% down to the bottom
        50% — plus which one your mix most resembles.
      </p>

      <h2>What the data says</h2>
      <p>
        Share of investable assets, Q1 2026, from the Federal Reserve's{" "}
        <a href="https://www.federalreserve.gov/releases/z1/dataviz/dfa/">
          Distributional Financial Accounts
        </a>
        :
      </p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {ALLOCATION_TABLE.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALLOCATION_TABLE.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The wealthiest hold their wealth in businesses and equities; the bottom half hold theirs
        in a house. The pattern sharpens further up: the top 0.1% hold a <i>smaller</i> share in
        property than anyone else, and almost nothing in a pension.
      </p>

      <h2>Three things it computes</h2>
      <div className="grid">
        {COMPUTES.map((c) => (
          <div key={c.title} className="card" style={{ margin: 0 }}>
            <p className="tile-title" style={{ marginBottom: "4px" }}>
              {c.title}
            </p>
            <p className="tile-meta" style={{ marginBottom: 0 }}>
              {c.meta}
            </p>
          </div>
        ))}
      </div>

      <h2>Built to be trusted with real numbers</h2>
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

      <p className="grid-group-label" style={{ marginTop: "var(--sp-8)" }}>
        How it compares
      </p>
      <div className="grid">
        <a className="tile" href="/comparisons/financert-vs-empower">
          <span className="tile-title">Financert vs. Empower</span>
          <span className="tile-meta">
            Own-user-base benchmarking vs. real Federal Reserve percentile-tier data, no account
            linking
          </span>
        </a>
      </div>

      <div className="card" style={{ marginTop: "var(--sp-10)" }}>
        <span className="kicker" style={{ marginBottom: "var(--sp-2)" }}>
          Get early access
        </span>
        <p style={{ marginBottom: "var(--sp-2)" }}>
          Leave your email and we&apos;ll let you know as Financert opens up beyond self-hosting:
        </p>
        <form className="signup-form" id="financertBetaForm" noValidate>
          <label htmlFor="financertBetaEmail" className="sr-only">
            Email
          </label>
          <input
            type="email"
            id="financertBetaEmail"
            name="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <button type="submit">Join the beta list</button>
        </form>
        <p className="signup-msg" id="financertBetaMsg" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("financertBetaForm");
  var input = document.getElementById("financertBetaEmail");
  var msg = document.getElementById("financertBetaMsg");
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
      body: JSON.stringify({ email: emailValue, source: "financert-beta" }),
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
        Financert is an independent, open-source Clark X Group venture — source, docs and the full
        write-up on how the numbers are computed:{" "}
        <a href="https://github.com/drewc611/Financert">github.com/drewc611/Financert</a>.
      </p>
    </ContentLayout>
  );
}
