import { Fragment } from "react";
import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import Code from "../components/Code.jsx";

export const meta = {
  outFile: "architecture.html",
  title: "Architecture — Merit AC",
  description:
    "How Merit AC is built and hosted, plus a field guide to twelve AI system archetypes — chatbot, RAG, copilot, agent, multi-agent, router, ensemble, evaluator, memory-augmented agent, fine-tuned model, workflow automation, and computer-use — each with a diagram, when to use it, when not to, and a prompt to try.",
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
// orchestrator dispatching to specialists, a classifier routing to one
// handler, or a fan-out that later merges back into one box below.
function HubDiagram({ hub, spokes, mergeBox, note }) {
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
      {mergeBox && (
        <>
          <span className="arch-arrow" aria-hidden="true">
            ↓
          </span>
          <div className="arch-step">
            <span className="arch-step-label">{mergeBox.label}</span>
            {mergeBox.note && <span className="arch-step-note">{mergeBox.note}</span>}
          </div>
        </>
      )}
      {note && <p className="arch-hub-note">{note}</p>}
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
    useWhen: [
      "Quick Q&A, drafting, or brainstorming that doesn't depend on private or fast-changing information.",
      "The full context the model needs fits comfortably in one prompt.",
    ],
    avoidWhen: [
      "The answer depends on facts the model wasn't trained on, or that changed since training.",
      "The task requires taking a real action outside the conversation, not just producing text.",
    ],
    tryPrompt: "Explain the tradeoffs between two build tools for a small Node.js project, then recommend one and say what would change your recommendation.",
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
    useWhen: [
      "Answers must be grounded in a specific, private, or frequently-changing corpus.",
      "The corpus is too large to paste into a prompt directly.",
    ],
    avoidWhen: [
      "The knowledge base is small enough to just include in the prompt outright — retrieval adds a failure point for no benefit.",
      "The question is general knowledge the model already answers reliably.",
    ],
    tryPrompt: "Using only the attached policy documents, answer: what is our refund window for enterprise customers, and quote the exact clause it comes from.",
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
    useWhen: [
      "Well-scoped, repetitive edits where a person can review every change before it lands.",
      "The reviewer has enough context to actually catch a wrong suggestion.",
    ],
    avoidWhen: [
      "The task needs many sequential steps with no natural point to pause and review.",
      "Nobody is realistically going to read the diff before accepting it — the control exists on paper only.",
    ],
    tryPrompt: "Suggest a fix for this failing test. Show the diff and explain the change — I'll review it before applying anything.",
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
    useWhen: [
      "The task needs multiple tool calls and the right sequence isn't known ahead of time.",
      "Intermediate mistakes are cheap to notice and correct within the loop.",
    ],
    avoidWhen: [
      "The steps are already fixed and known — a workflow pipeline gets the same result with less variance and cost.",
      "A wrong intermediate action would be costly and nothing reviews it before it executes.",
    ],
    tryPrompt: "Find and fix the bug causing the checkout test to fail. You have read/write access to the repo and a test runner — work until the suite passes.",
  },
  {
    id: "multi-agent",
    name: "Multi-agent / orchestrator",
    shape: "Hub, spokes, and merge",
    diagram: (
      <HubDiagram
        hub={{ label: "Orchestrator", note: "decomposes the task" }}
        spokes={[{ label: "Research agent" }, { label: "Code agent" }, { label: "Review agent" }]}
        mergeBox={{ label: "Synthesized answer" }}
      />
    ),
    body: "One agent receives the overall task, breaks it into sub-tasks, and dispatches each to a specialist agent — running in parallel or in sequence — then collects and synthesizes their results into one answer. Each spoke is usually itself an agentic loop (above), so this is a pattern built on top of the agent archetype, not a separate primitive.",
    useWhen: [
      "Sub-tasks are genuinely independent and benefit from different context, tools, or specialization.",
      "The synthesis step can actually catch a spoke that got it wrong.",
    ],
    avoidWhen: [
      "A single agent could do the whole task in one pass — splitting it just multiplies cost.",
      "There's no real synthesis logic, only a spoke that happens to run last.",
    ],
    tryPrompt: "Research this API's rate limits, then have a separate pass write and test a client wrapper around it, and a third pass review the wrapper for edge cases.",
  },
  {
    id: "router",
    name: "Router / classifier dispatch",
    shape: "Branching dispatch",
    diagram: (
      <HubDiagram
        hub={{ label: "Classifier" }}
        spokes={[{ label: "Handler A" }, { label: "Handler B" }, { label: "Handler C" }]}
        note="Exactly one branch executes, chosen by the classifier — unlike the orchestrator above, the others never run."
      />
    ),
    body: "A lightweight first call reads the request and decides which single, purpose-built handler should take it — a support ticket gets tagged as billing/bug/general and sent to the matching template, prompt, or even a different model entirely. The classifier's only job is picking a lane; it doesn't do the actual work itself.",
    useWhen: [
      "Requests fall into a handful of known categories that each deserve a different, purpose-built handler.",
      "Getting the category wrong occasionally is an acceptable cost.",
    ],
    avoidWhen: [
      "The categories overlap heavily, or one general handler already does fine — a router just adds a misclassification failure mode.",
      "A wrong route is expensive and there's no fallback for a low-confidence classification.",
    ],
    tryPrompt: "Read this support ticket and decide: is it a refund request, a bug report, or a general question? Route it to the matching template and fill it in.",
  },
  {
    id: "ensemble",
    name: "Ensemble / self-consistency",
    shape: "Fan-out, fan-in",
    diagram: (
      <HubDiagram
        hub={{ label: "Same prompt" }}
        spokes={[{ label: "Run 1" }, { label: "Run 2" }, { label: "Run 3" }]}
        mergeBox={{ label: "Vote / synthesize" }}
      />
    ),
    body: "The same prompt runs several times — sometimes with slightly different phrasing or a nonzero temperature — and the final answer is picked by majority vote or by synthesizing across the runs. This trades extra cost for reliability on tasks where a single pass is inconsistent.",
    useWhen: [
      "The task has a knowable right answer and single runs disagree with each other often enough to matter.",
      "The extra latency and cost of running N times is affordable for how often this gets called.",
    ],
    avoidWhen: [
      "The task is open-ended or creative — there's no \"most common good essay\" to vote toward.",
      "A single well-checked run is already reliable enough; the extra runs just add cost.",
    ],
    tryPrompt: "Solve this math word problem five times independently, then tell me which final answer appears most often and why the others might have diverged.",
  },
  {
    id: "evaluator",
    name: "Evaluator / LLM-as-judge",
    shape: "Generate-and-judge loop",
    diagram: (
      <LoopDiagram
        steps={[{ label: "Generate response" }, { label: "LLM judge scores it" }, { label: "Revise if it fails" }]}
        loopLabel="Repeats until the judge accepts the output, or a retry cap is hit."
      />
    ),
    body: "A second model call — sometimes the same model, sometimes a different one — scores or critiques the first call's output against a rubric, and a failing score triggers a revision. Used both as an offline evaluation harness over many examples and as a live gate before an answer ships.",
    useWhen: [
      "You need a scalable, consistent way to score or filter a large volume of model output against a rubric.",
      "The rubric is specific enough that a judge model can apply it consistently.",
    ],
    avoidWhen: [
      "The judge is the only check on something high-stakes — it can be fooled by confident, well-formatted output the same way a person skimming quickly can.",
      "The rubric is vague enough that the judge's own bias decides the outcome.",
    ],
    tryPrompt: "Grade this draft against the rubric below on a 1-5 scale for each criterion, and say specifically what would move it from a 3 to a 5.",
  },
  {
    id: "memory-agent",
    name: "Memory-augmented agent",
    shape: "Loop with persistent memory",
    diagram: (
      <LoopDiagram
        steps={[{ label: "Recall relevant memory" }, { label: "LLM + recalled context" }, { label: "Write memory update" }]}
        loopLabel="Each new session recalls what earlier ones wrote, so context persists without replaying the whole history."
      />
    ),
    body: "Different from RAG's static knowledge base: here the store is written to as well as read from, usually by the same agent, so preferences and facts learned in one session are available in the next one without a person re-explaining them. The loop shape is the same as the tool-use agent above, with memory read/write treated as just another tool.",
    useWhen: [
      "An assistant should carry context, preferences, or facts across separate conversations or sessions.",
      "What's worth remembering is reasonably stable, not something that's true for one conversation only.",
    ],
    avoidWhen: [
      "Everything relevant fits in the current conversation anyway — persistent memory adds a staleness and privacy surface for no benefit.",
      "The stored memory can't be reviewed or corrected by the person it's about.",
    ],
    tryPrompt: "Remember that I prefer terse code review comments with a suggested fix attached. Use that preference on every review you do for me from now on.",
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
    useWhen: [
      "One narrow task, run at high volume, where consistency and latency/cost matter more than flexibility.",
      "Enough labeled examples exist (or can be produced) to make training worthwhile.",
    ],
    avoidWhen: [
      "The task changes often — a fine-tune goes stale the same way any snapshot does, just less visibly.",
      "Volume is too low to justify collecting examples and retraining when the task shifts.",
    ],
    tryPrompt: "Fine-tune a small model on 500 labeled support tickets, then compare its classification accuracy against prompting a general model with the same examples as few-shot context.",
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
    useWhen: [
      "The sequence of steps is already known and stable, and you want predictable, debuggable behavior.",
      "Each step's inputs and outputs are well-defined enough to test independently.",
    ],
    avoidWhen: [
      "Inputs vary enough that a fixed pipeline would mishandle common cases — that's a sign the task actually needs an agent's judgment.",
      "The steps themselves need to change based on what an earlier step found.",
    ],
    tryPrompt: "Write a pipeline: read each incoming email, classify it as billing, support, or sales with one model call, extract the account ID with a second call, then insert both into the ticket queue.",
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
    useWhen: [
      "There's no API for the system you need to operate, only a UI.",
      "The UI is stable enough between runs that a screen-reading loop can reliably find what it needs.",
    ],
    avoidWhen: [
      "An API exists — call it directly. It's faster, cheaper, and far less brittle than driving the UI.",
      "The UI changes often enough (a moved button, a new dialog) that runs would derail unpredictably.",
    ],
    tryPrompt: "Open the billing dashboard, find last month's invoice total, and paste it into cell B2 of this spreadsheet.",
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
        model and the parts deliberately left unbuilt — plus a general field guide to how AI
        systems get built, independent of any one product.
      </p>

      <Toc
        items={[
          { href: "#pipeline", label: "1. The ingestion & scoring pipeline" },
          { href: "#data-model", label: "2. Data model" },
          { href: "#deployment", label: "3. Where it runs" },
          { href: "#verdict", label: "4. Does this hosting choice make sense?" },
          { href: "#stubbed", label: "5. What's deliberately not built yet" },
          { href: "#archetypes", label: "6. AI system archetypes: diagrams, when to use, prompts to try" },
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

      <h2 id="archetypes">6. AI system archetypes: diagrams, when to use, prompts to try</h2>
      <p>
        Almost every AI system in production today is built from some combination of the twelve
        patterns below. For each one: what it is, a diagram of how it's wired, when it's the
        right tool, when it isn't, and a real prompt you can try to see the pattern in action.
        Voice and other multimodal front-ends aren't listed separately — they're an input/output
        layer on top of these shapes, not a distinct architecture of their own.
      </p>

      {ARCHETYPES.map((arch) => (
        <div className="archetype" id={arch.id} key={arch.id}>
          <h3>{arch.name}</h3>
          <span className="archetype-shape">{arch.shape}</span>
          {arch.diagram}
          <p>{arch.body}</p>
          <div className="arch-use">
            <p>
              <b>Use it when</b>
            </p>
            <ul>
              {arch.useWhen.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p>
              <b>Skip it when</b>
            </p>
            <ul>
              {arch.avoidWhen.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <span className="arch-prompt-label">Try this prompt</span>
          <Code>{arch.tryPrompt}</Code>
        </div>
      ))}
    </ContentLayout>
  );
}
