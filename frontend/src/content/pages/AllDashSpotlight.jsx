import ContentLayout from "../components/ContentLayout.jsx";

export const meta = {
  outFile: "all-dash.html",
  title: "The All Dash — Clark X Group",
  description:
    "The All Dash is a command center for one project or one person: feed it the documents you already have and it builds the dashboard — tasks, boards, triage, metrics, and an AI assistant that cites its sources. Runs entirely in your browser. A Clark X Group venture.",
};

const READS = [
  "Markdown & text notes",
  "Meeting transcripts (.vtt/.srt)",
  "Calendars (.ics)",
  "CSV & Excel",
  "Word & PowerPoint",
  "Jira, Linear, Asana, Todoist, Trello, GitHub exports",
  "Google, Outlook & Apple calendars",
];

const FEATURES = [
  {
    title: "Boards",
    meta: "Groups, 22 column kinds, and 7 views over the same rows — table, Kanban, timeline, calendar, chart, workload, and a fillable form.",
  },
  {
    title: "Triage",
    meta: "A ranked worklist of what's actually wrong right now — overdue work, blocked items, missed milestones — each row carrying the button that clears it.",
  },
  {
    title: "Stash",
    meta: "Save the article, not the link — it reads offline, is searched by the words inside it, and shows you what changed since you read it.",
  },
  {
    title: "Studio",
    meta: "Camera, photo, and video compression that never leaves the device — shrink a clip without uploading it anywhere.",
  },
  {
    title: "An assistant that cites",
    meta: "Every answer is grounded in your live data; citations open the real item. Proposed changes arrive as before/after cards you apply or skip.",
  },
  {
    title: "The Brain",
    meta: "Learns who you work with and how you plan from your own data — no model involved, every fact traces back to the rows it came from.",
  },
  {
    title: "A model router that grades answers",
    meta: "Tries providers in order; a wrong or empty answer falls through like an error would. Reports cost per answer that actually worked, not cost per call.",
  },
  {
    title: "Agents as first-class users",
    meta: "One MCP server gives Claude, GitHub Copilot and ChatGPT the same tools: read the brief, triage, add or close tasks.",
  },
];

export default function AllDashSpotlight() {
  return (
    <ContentLayout>
      <span className="kicker">Clark X Group / Venture</span>
      <span className="badge">
        <i /> Local-first — no server, no account, installs to your phone
      </span>
      <h1>
        Feed it what you already have. It <span className="accent-word">builds</span> the
        dashboard.
      </h1>
      <p className="lead">
        The All Dash is a command center for one project or one person. Drop in the meeting notes,
        the calendar export, the transcript, the spreadsheet you already have, and it builds tasks
        with owners and due dates, today's agenda, decisions, risks, and analytics that say what
        needs attention. Everything runs in the browser — nothing is uploaded anywhere, there's no
        server and no account.
      </p>

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
      <p>
        Every file goes through a parser into the same flat entity — a task, a decision, a risk,
        a metric — so every widget works on every source, including direct exports from the tools
        you already use:
      </p>
      <ul>
        {READS.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <h2>An optional platform tier</h2>
      <p>
        The browser app is the whole product for one person. A separate, optional platform tier
        adds a FastAPI service, a Next.js team workspace, a hash-chained AI audit ledger, and an
        MCP server for shared use — for when one person's dashboard needs to become a team's.
      </p>

      <p className="grid-group-label" style={{ marginTop: "var(--sp-8)" }}>
        How it compares
      </p>
      <div className="grid">
        <a className="tile" href="/comparisons/the-all-dash-vs-notion">
          <span className="tile-title">The All Dash vs. Notion</span>
          <span className="tile-meta">
            Builds the dashboard from your raw documents, local-first, vs. AI inside a workspace
            you structure yourself
          </span>
        </a>
      </div>

      <div className="card" style={{ marginTop: "var(--sp-10)" }}>
        <span className="kicker" style={{ marginBottom: "var(--sp-2)" }}>
          Get early access
        </span>
        <p style={{ marginBottom: "var(--sp-2)" }}>
          Leave your email and we&apos;ll let you know as the platform tier opens up beyond the
          free browser app:
        </p>
        <form className="signup-form" id="allDashBetaForm" noValidate>
          <label htmlFor="allDashBetaEmail" className="sr-only">
            Email
          </label>
          <input
            type="email"
            id="allDashBetaEmail"
            name="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <button type="submit">Join the beta list</button>
        </form>
        <p className="signup-msg" id="allDashBetaMsg" role="status" aria-live="polite" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var API_BASE = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1
    ? "http://localhost:8000"
    : "https://api.usemeritai.com";
  var form = document.getElementById("allDashBetaForm");
  var input = document.getElementById("allDashBetaEmail");
  var msg = document.getElementById("allDashBetaMsg");
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
      body: JSON.stringify({ email: emailValue, source: "all-dash-beta" }),
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
        The All Dash is an independent, open-source Clark X Group venture — source and full docs:{" "}
        <a href="https://github.com/drewc611/The-All-Dash">github.com/drewc611/The-All-Dash</a>.
      </p>
    </ContentLayout>
  );
}
