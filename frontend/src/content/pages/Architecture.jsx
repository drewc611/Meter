import { Fragment } from "react";
import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";

export const meta = {
  outFile: "architecture.html",
  title: "Architecture — Merit AC",
  description:
    "How Merit AC is built and hosted, plus a field guide to the AI system archetypes it tracks — chatbot, RAG, copilot, agent, multi-agent, fine-tuned model, workflow automation, and computer-use — each with a diagram.",
};

// A step-and-arrow flow diagram for a "linear" archetype: A → B → C.
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

// Same step row as LinearDiagram, but the last step feeds back into an
// earlier one — the shape of an autonomous agent loop rather than a
// one-shot pipeline.
function LoopDiagram({ steps, loopLabel }) {
  return (
    <>
      <LinearDiagram steps={steps} />
      <p className="arch-loop-note">
        <span className="arch-loop-icon" aria-hidden="true">
          ↻
        </span>
        {loopLabel}
      </p>
    </>
  );
}

// A single hub box branching into parallel spoke boxes — the shape of an
// orchestrator dispatching to specialist sub-agents.
function HubDiagram({ hub, spokes }) {
  return (
    <div className="arch-hub">
      <div className="arch-step">
        <span className="arch-step-label">{hub.label}</span>
        {hub.note && <span className="arch-step-note">{hub.note}</span>}
      </div>
      <span className="arch-arrow" aria-hidden="true">
        ↓
      </span>
      <div className="arch-spokes">
        {spokes.map((spoke) => (
          <div className="arch-step" key={spoke.label}>
            <span className="arch-step-label">{spoke.label}</span>
            {spoke.note && <span className="arch-step-note">{spoke.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const ARCHETYPES = [
  {
    id: "chatbot",
    name: "Chatbot / single-turn assistant",
    shape: "Linear pipeline",
    diagram: (
      <LinearDiagram
        steps={[
          { label: "User message" },
          { label: "LLM", note: "+ prior turns, if any" },
          { label: "Response" },
        ]}
      />
    ),
    body: "The base case everything else on this page builds on: one message in, one response out. Conversation history gets replayed into each new call rather than the model \"remembering\" anything between requests — a long-running chat is really N independent calls, each carrying the whole transcript so far.",
    watch: "Cost and latency both scale with transcript length, since every earlier turn gets re-sent and re-read on every new message.",
  },
  {
    id: "rag",
    name: "Retrieval-augmented generation (RAG)",
    shape: "Linear pipeline",
    diagram: (
      <LinearDiagram
        steps={[
          { label: "Query" },
          { label: "Retrieve", note: "vector / keyword search" },
          { label: "Augment prompt" },
          { label: "LLM" },
          { label: "Grounded response" },
        ]}
      />
    ),
    body: "Used when the model needs facts it wasn't trained on — a company's own documents, a support-ticket history, anything that changes after the model's training cutoff. The retrieval step searches a knowledge base for passages relevant to the query and stuffs them into the prompt before the model ever sees the question, so the answer is grounded in real, current text instead of the model's memorized (and possibly stale or wrong) recall.",
    watch: "The answer is only as good as what retrieval finds — a bad search match produces a confident, well-written answer grounded in the wrong document.",
  },
  {
    id: "copilot",
    name: "Coding assistant / copilot",
    shape: "Linear pipeline, human-gated",
    diagram: (
      <LinearDiagram
        steps={[
          { label: "Code context", note: "open file, cursor" },
          { label: "LLM suggestion" },
          { label: "Human review" },
          { label: "Accept / reject" },
        ]}
      />
    ),
    body: "Inline completions and in-editor chat both follow this shape: the model proposes, a person disposes. That human-review step is what separates a copilot from an agent below — every suggestion is a draft a person looks at before it lands, not an action the system carries out on its own.",
    watch: "Rubber-stamped accepts (approving a diff without reading it) quietly erase the one control this archetype depends on.",
  },
  {
    id: "agent",
    name: "Agentic loop (tool-use agent)",
    shape: "Autonomous loop",
    diagram: (
      <LoopDiagram
        steps={[{ label: "Plan next step" }, { label: "Call a tool" }, { label: "Observe result" }]}
        loopLabel="Repeats until the model decides the task is done, then returns a final answer."
      />
    ),
    body: "The defining difference from a chatbot or copilot: the model decides which tool to call, when to call it, and when to stop — not a person clicking through steps. Each loop iteration feeds the previous tool's output back in as new context, so the model can react to what it just learned rather than following a script written in advance.",
    watch: "An open-ended stop condition means a stuck agent can loop far longer (and spend far more) than a bounded pipeline ever would — this is why tool budgets and iteration caps matter operationally, not just correctness.",
  },
  {
    id: "multi-agent",
    name: "Multi-agent / orchestrator",
    shape: "Hub and spokes",
    diagram: (
      <HubDiagram
        hub={{ label: "Orchestrator", note: "decomposes the task" }}
        spokes={[{ label: "Research agent" }, { label: "Code agent" }, { label: "Review agent" }]}
      />
    ),
    body: "One agent receives the overall task, breaks it into sub-tasks, and dispatches each to a specialist agent — running in parallel or in sequence — then collects and synthesizes their results into one answer. Each spoke is usually itself an agentic loop (above), so this is a pattern built on top of the agent archetype, not a separate primitive.",
    watch: "Cost is additive across every spoke that runs, and a wrong synthesis at the end can silently discard a spoke that actually got it right.",
  },
  {
    id: "fine-tuned",
    name: "Fine-tuned / specialized model",
    shape: "Linear pipeline, offline",
    diagram: (
      <LinearDiagram
        steps={[
          { label: "Base model" },
          { label: "+ domain training data" },
          { label: "Fine-tuned checkpoint" },
          { label: "Narrower, faster inference" },
        ]}
      />
    ),
    body: "The training step happens once, offline, ahead of time — unlike every other archetype here, there's no live pipeline at inference time beyond a normal model call. The payoff is a model that's cheaper, faster, and more consistent at one narrow, repeated task than prompting a large general model for the same thing over and over.",
    watch: "A fine-tune trained on last quarter's data quietly drifts out of date the same way any other stale reference material does, just less visibly.",
  },
  {
    id: "workflow",
    name: "Workflow automation (LLM-in-pipeline)",
    shape: "Linear pipeline, fixed by code",
    diagram: (
      <LinearDiagram
        steps={[
          { label: "Ingest" },
          { label: "Classify", note: "LLM call" },
          { label: "Extract", note: "LLM call" },
          { label: "Write to system" },
        ]}
      />
    ),
    body: "Looks like the agent loop above but isn't one: control flow here is fixed by code ahead of time, and the LLM fills one or more defined steps rather than deciding what happens next. This is the right shape whenever the sequence of steps is already known and stable — it's more predictable and easier to debug than an agent, at the cost of not adapting when a case doesn't fit the pipeline it was built for.",
    watch: "Inputs that fall outside what the pipeline was designed for don't get handled gracefully — they get force-fit into whichever fixed step happens to run.",
  },
  {
    id: "computer-use",
    name: "Computer-use / browser agent",
    shape: "Autonomous loop",
    diagram: (
      <LoopDiagram
        steps={[
          { label: "Read screen", note: "screenshot / DOM" },
          { label: "LLM picks an action" },
          { label: "Action executes", note: "click, type, scroll" },
        ]}
        loopLabel="Repeats until the on-screen task is complete."
      />
    ),
    body: "The same loop shape as the tool-use agent above, except the \"tools\" are mouse and keyboard actions on a real screen instead of API calls. Each iteration re-reads the current screen state before deciding the next action, since a click or page load can change what's actually on screen in ways the model has to notice rather than assume.",
    watch: "Small UI changes (a moved button, a new dialog) can derail a run in ways an API-based agent, with its more stable interface, wouldn't hit.",
  },
];

export default function Architecture() {
  return (
    <ContentLayout active="architecture" wide>
      <span className="kicker">Reference</span>
      <span className="badge">
        <i /> Reflects the live deployment
      </span>
      <h1>How Merit AC is built</h1>
      <p className="lead">
        The same architecture documented in the repo's own <code>ARCHITECTURE.md</code> and{" "}
        <code>backend/README.md</code> — reality as deployed today, expanded here with the data
        model and the parts deliberately left unbuilt — plus a field guide to the AI system
        archetypes Merit AC's own tool and model tracking sees in the wild.
      </p>

      <Toc
        items={[
          { href: "#pipeline", label: "1. The ingestion & scoring pipeline" },
          { href: "#data-model", label: "2. Data model" },
          { href: "#deployment", label: "3. Where it runs" },
          { href: "#verdict", label: "4. Does this hosting choice make sense?" },
          { href: "#stubbed", label: "5. What's deliberately not built yet" },
          { href: "#archetypes", label: "6. AI system archetypes, with diagrams" },
        ]}
      />

      <h2 id="pipeline">1. The ingestion &amp; scoring pipeline</h2>
      <p>
        Three independent ingestion paths write into three separate tables, all attributed to a
        person through an identity-mapping table, and a nightly job compresses everything into
        one scored row per person that the API and dashboard read.
      </p>
      <div className="card">
        <ol>
          <li>
            <b>LLM proxy / provider billing</b> → <code>POST /ingest/usage</code> →{" "}
            <code>UsageEvent</code>
          </li>
          <li>
            <b>GitHub / Jira / HubSpot webhooks</b> → <code>POST /ingest/outcome</code> →{" "}
            <code>OutcomeEvent</code>, and <code>POST /ingest/quality-signal</code> →{" "}
            <code>QualitySignal</code>
          </li>
          <li>
            <b>Okta / Entra SCIM</b> → <code>IdentityMapping</code> → <code>Identity</code>
          </li>
        </ol>
        <p>
          <code>UsageEvent</code>, <code>OutcomeEvent</code>, <code>QualitySignal</code>, and{" "}
          <code>Identity</code> all feed <code>scoring.recompute_all()</code>, which runs nightly
          and writes one row per person per period into <code>PersonScore</code> — the single
          table every <code>/api/*</code> endpoint and the dashboard actually read.
        </p>
      </div>
      <p>
        <b>The load-bearing invariant:</b> the dashboard and every <code>/api/*</code> endpoint
        read only <code>PersonScore</code>, never raw events — page loads stay fast regardless of
        how much event history accumulates. <code>IdentityMapping</code> is the other load-bearing
        piece: if an external id resolves to the wrong (or no) person, every number downstream is
        wrong, which is why an unmapped id gets a <b>422</b> instead of being silently dropped — an
        unmapped id is a shadow-AI candidate, not something to drop quietly.
      </p>
      <p>
        Scoring runs in two tiers today, both pure functions over a handful of bulk queries rather
        than per-row work, so the nightly job stays flat as event tables grow: <b>Tier 1</b>{" "}
        correlates spend against outcomes (PRs merged, tickets closed, deals advanced) into a
        value-per-dollar number; <b>Tier 2</b> layers a slop-risk score from quality proxies
        (reverts, heavy rewrites, regeneration loops). See <a href="#stubbed">§5</a> for Tier 3.
      </p>

      <h2 id="data-model">2. Data model</h2>
      <p>
        Every row below belongs to exactly one <code>Organization</code> (the tenant boundary) —
        see the multi-tenant isolation work referenced in the repo's own commit history.
      </p>
      <table>
        <thead>
          <tr>
            <th>Table</th>
            <th>What it holds</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>Organization</code>
            </td>
            <td>The tenant — its own ingest_token, plan, name</td>
          </tr>
          <tr>
            <td>
              <code>Team</code>
            </td>
            <td>A grouping of identities, scoped per org</td>
          </tr>
          <tr>
            <td>
              <code>Identity</code>
            </td>
            <td>A real person, scoped per org (unique by org+email)</td>
          </tr>
          <tr>
            <td>
              <code>IdentityMapping</code>
            </td>
            <td>
              External system id (proxy key, GitHub login, …) → <code>Identity</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>UsageEvent</code>
            </td>
            <td>One AI-spend event: tool, model, cost, tokens</td>
          </tr>
          <tr>
            <td>
              <code>OutcomeEvent</code>
            </td>
            <td>A PR merge, ticket close, deal advance, etc.</td>
          </tr>
          <tr>
            <td>
              <code>QualitySignal</code>
            </td>
            <td>A revert, rewrite, regeneration loop, etc.</td>
          </tr>
          <tr>
            <td>
              <code>RubricGrade</code>
            </td>
            <td>Sampled human/LLM grading — Tier 3, not yet populated automatically</td>
          </tr>
          <tr>
            <td>
              <code>PersonScore</code>
            </td>
            <td>
              One row per (identity, period) — the only table <code>/api/*</code> reads
            </td>
          </tr>
          <tr>
            <td>
              <code>DashboardUser</code>
            </td>
            <td>
              A real login (password or Google), separate from <code>Identity</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="deployment">3. Where it runs</h2>
      <div className="card">
        <p>
          <b>Cloudflare</b> — Worker + static assets serving the frontend (a Vite + React app built
          to a plain <code>dist/</code>, no server-side rendering at request time) at{" "}
          <code>usemeritai.com</code>. This page and the rest of the <code>/architecture</code>,{" "}
          <code>/setup/*</code>, <code>/guides</code>, <code>/prompts</code>, <code>/challenge</code>{" "}
          content is prerendered from React components at build time — not client-rendered SPA
          routes — so each one ships as a real, crawlable file instead of an empty shell that only
          populates once JavaScript runs.
        </p>
        <p>
          <b>Fly.io</b> (app <code>meter</code>, region <code>iad</code>) — the FastAPI backend at{" "}
          <code>api.usemeritai.com</code>, backed by a SQLite file on a persistent volume.
        </p>
        <p>
          Both deploy paths trigger off the same push to <code>main</code> in one repo — no second
          repo, no manual deploy step in the common case.
        </p>
      </div>

      <h2 id="verdict">4. Does this hosting choice make sense?</h2>
      <p>
        Yes, for what this actually is right now — an early-stage prototype being demoed to
        prospects, not yet handling real customer data.
      </p>
      <ul>
        <li>
          The frontend builds to static assets, so a CDN-native static host is the right tool —
          Cloudflare Workers gives global distribution, automatic HTTPS, and per-PR preview URLs
          for free.
        </li>
        <li>
          The backend is stateful (a SQLite file, an in-process nightly scoring job) and needs a
          place that keeps a process and a disk alive continuously — Fly.io is a reasonable,
          low-overhead choice at this scale.
        </li>
        <li>
          CORS is locked down to the real production origins, not left wide open the way the
          local-dev default is.
        </li>
      </ul>
      <p>
        <b>Not yet for handling real customer data.</b> Per-user login and role-gated admin
        endpoints are in, but standard pre-production hardening still needs to land: rate
        limiting, an audit log, backup coverage on the database volume, a staging environment, and
        monitoring/alerting. None of that is a reason to change the underlying split; it's
        ordinary engineering work on top of it.
      </p>

      <h2 id="stubbed">5. What's deliberately not built yet</h2>
      <p>Named here on purpose, not hidden — these are decisions, not gaps someone forgot about.</p>
      <div className="card">
        <p>
          <b>Tier 3 calibration</b> — sampled grading needs real <code>RubricGrade</code> volume to
          be worth building against; not faked with synthetic grades.
        </p>
        <p>
          <b>Shadow-AI detection</b> — the recoverable-spend estimate includes a placeholder line
          for it, clearly labeled as an estimate, but reconciling sanctioned spend against observed
          AI activity isn't implemented yet.
        </p>
        <p>
          <b>A job scheduler</b> — <code>/admin/recompute-scores</code> is the nightly job's entry
          point; wiring it to cron/Airflow/a queue is a deployment decision for whoever runs this
          in production, not something the code assumes for you.
        </p>
      </div>

      <h2 id="archetypes">6. AI system archetypes, with diagrams</h2>
      <p>
        A company's AI stack is rarely one thing — it's usually several of the patterns below
        running at once, each showing up as a different shape in Merit AC's own tool and model
        breakdown. This is a field guide to the eight that account for nearly everything in
        production today: what each one is, how it's wired, and the failure mode specific to it.
        Voice and other multimodal front-ends aren't listed separately — they're an input/output
        layer on top of these shapes, not a distinct architecture of their own.
      </p>

      {ARCHETYPES.map((arch) => (
        <div className="archetype" id={arch.id} key={arch.id}>
          <h3>{arch.name}</h3>
          <span className="archetype-shape">{arch.shape}</span>
          {arch.diagram}
          <p>{arch.body}</p>
          <p className="arch-watch">
            <b>Watch for:</b> {arch.watch}
          </p>
        </div>
      ))}
    </ContentLayout>
  );
}
