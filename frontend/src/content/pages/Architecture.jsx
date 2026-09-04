import { Fragment } from "react";
import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import Code from "../components/Code.jsx";

export const meta = {
  outFile: "architecture.html",
  title: "Architecture — Merit AC",
  description:
    "How Merit AC is built and hosted, plus a field guide to how AI systems get designed in general — archetypes, complex agent patterns, and the software that builds them, each with a diagram.",
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

// The shared card shape for one archetype/pattern entry: name, shape kicker,
// diagram, body, use/skip guidance, and a prompt to try. Used for both the
// base archetypes (§6) and the complex agent patterns (§8) below.
function ArchetypeCard({ entry }) {
  return (
    <div className="archetype" id={entry.id}>
      <h3>{entry.name}</h3>
      <span className="archetype-shape">{entry.shape}</span>
      {entry.diagram}
      <p>{entry.body}</p>
      <div className="arch-use">
        <p>
          <b>Use it when</b>
        </p>
        <ul>
          {entry.useWhen.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p>
          <b>Skip it when</b>
        </p>
        <ul>
          {entry.avoidWhen.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <span className="arch-prompt-label">Try this prompt</span>
      <Code wrap>{entry.tryPrompt}</Code>
    </div>
  );
}

// A quick-nav tile grid above a list of archetype cards -- each tile jumps
// down to its full card (diagram, use/skip guidance, prompt) via anchor.
// Reuses the same .grid/.tile classes as the homepage's Explore section.
function TileNav({ items }) {
  return (
    <div className="grid">
      {items.map((item) => (
        <a className="tile" href={`#${item.id}`} key={item.id}>
          <span className="tile-title">{item.name}</span>
          <span className="tile-meta">{item.shape}</span>
        </a>
      ))}
    </div>
  );
}

const COMPLEX_AGENTS = [
  {
    id: "planner-executor",
    name: "Hierarchical planner-executor",
    shape: "Iterative goal decomposition",
    diagram: (
      <LoopDiagram
        steps={[
          { label: "Planner picks next subgoal" },
          { label: "Executor completes it" },
          { label: "Planner reassesses" },
        ]}
        loopLabel="Repeats, pulling one subgoal at a time, until the planner judges the overall goal met."
      />
    ),
    body: "A planner agent breaks a large goal into an ordered list of subgoals and hands them off one at a time to an executor — which may itself be a full agentic loop from §6. Unlike the flat multi-agent orchestrator above, the planner revisits and re-plans after every subgoal, so the remaining work can change mid-task as the executor learns things the planner didn't anticipate.",
    useWhen: [
      "The goal is too large or ambiguous to decompose correctly in one shot up front.",
      "Later subgoals genuinely depend on what earlier ones discover.",
    ],
    avoidWhen: [
      "The full decomposition is already knowable ahead of time — a flat multi-agent dispatch gets there with less overhead.",
      "Re-planning this often would just add latency without changing the outcome.",
    ],
    tryPrompt: "Break \"migrate our billing service off the deprecated API\" into an ordered list of subgoals, complete the first one, then reassess whether the remaining list still makes sense before continuing.",
  },
  {
    id: "reflection",
    name: "Reflection / self-critique agent",
    shape: "Generate-critique-revise loop",
    diagram: (
      <LoopDiagram
        steps={[{ label: "Draft answer" }, { label: "Self-critique" }, { label: "Revise" }]}
        loopLabel="Repeats until the agent's own critique passes, or a retry cap is hit."
      />
    ),
    body: "The same model plays both roles: it drafts an answer, switches into a critical mode to critique its own draft against the task's requirements, then revises based on that critique. Different from the evaluator/LLM-as-judge archetype in §6 in one important way — there's no independent second model checking the work, so a blind spot in the model's judgment shows up in both the draft and the critique of it.",
    useWhen: [
      "A first draft is reliably better than a first-and-only draft, and the model can meaningfully critique its own category of mistakes.",
      "An independent judge model isn't available or is too costly to run on every request.",
    ],
    avoidWhen: [
      "The task has a failure mode the model systematically can't see in its own output — self-critique won't catch what the model doesn't know it's getting wrong.",
      "A single well-prompted pass is already reliable enough that the extra round trip isn't worth the latency.",
    ],
    tryPrompt: "Draft a response to this customer complaint, then critique your own draft against our tone guidelines, then rewrite it based on that critique.",
  },
  {
    id: "debate",
    name: "Debate / adversarial agents",
    shape: "Adversarial fan-out, judged",
    diagram: (
      <HubDiagram
        hub={{ label: "Question" }}
        spokes={[{ label: "Agent: argue for" }, { label: "Agent: argue against" }]}
        mergeBox={{ label: "Judge decides" }}
      />
    ),
    body: "Two agents argue opposing positions on the same question — not to be balanced, but to stress-test a claim by having something actively try to break it — and a judge (a third model call, or a person) weighs the two arguments and decides. Different from ensemble/self-consistency in §6: that archetype runs the same prompt multiple times looking for agreement; this one deliberately runs opposing prompts looking for disagreement.",
    useWhen: [
      "A claim needs to survive genuine pushback before it's trusted, not just repetition.",
      "The judge step can meaningfully evaluate two arguments rather than just picking whichever sounds more confident.",
    ],
    avoidWhen: [
      "The question doesn't have two real sides — forcing a debate on a factual lookup just adds noise.",
      "Nobody or nothing is actually equipped to judge the two arguments fairly.",
    ],
    tryPrompt: "Have one pass argue we should ship this feature behind a flag next week, and another argue we should delay a sprint, then judge which argument holds up better and why.",
  },
  {
    id: "tree-of-thought",
    name: "Tree-of-thought exploration",
    shape: "Branch, evaluate, prune",
    diagram: (
      <HubDiagram
        hub={{ label: "Problem" }}
        spokes={[{ label: "Branch A" }, { label: "Branch B" }, { label: "Branch C" }]}
        note="Weak branches get pruned after evaluation; the survivors get explored further, recursively."
      />
    ),
    body: "Instead of committing to one reasoning path, the model generates several different next steps in parallel, evaluates how promising each looks, discards the weak ones, and continues exploring only the survivors — recursively, like a search tree. Different from the router in §6, which picks one branch upfront by classification and never looks back; here, multiple branches actually get tried before any get cut.",
    useWhen: [
      "The problem has multiple plausible approaches and it's genuinely unclear which will pan out without trying them.",
      "A wrong early commitment would be expensive to recover from.",
    ],
    avoidWhen: [
      "There's usually one obvious approach — exploring alternatives that were never going to work just burns tokens.",
      "The branching factor makes this too expensive for how often the task runs.",
    ],
    tryPrompt: "Propose three different approaches to fix this flaky test, sketch each one out one level deep, then rank them and continue only with the most promising one.",
  },
  {
    id: "swarm",
    name: "Swarm / blackboard agents",
    shape: "Decentralized shared state",
    diagram: (
      <HubDiagram
        hub={{ label: "Task" }}
        spokes={[{ label: "Agent 1" }, { label: "Agent 2" }, { label: "Agent 3" }]}
        mergeBox={{ label: "Shared blackboard state" }}
        note="No central dispatcher — agents read and write the shared state independently and asynchronously."
      />
    ),
    body: "A number of lightweight agents work on pieces of the same problem without a controller assigning them work — each reads a shared state (the \"blackboard\"), contributes what it can given what's there now, and writes its result back for the others to build on. Coordination is emergent rather than directed, the opposite design bet from the orchestrator archetype in §6.",
    useWhen: [
      "The problem naturally decomposes into many small, loosely-coupled contributions rather than a few big dependent ones.",
      "The system should keep making progress even if individual agents fail or run slow — there's no single coordination point to bottleneck on.",
    ],
    avoidWhen: [
      "The work has a clear dependency order — emergent coordination adds complexity a simple pipeline wouldn't need.",
      "Debuggability matters more than throughput — a blackboard system is harder to reason about after the fact than an orchestrator's explicit dispatch log.",
    ],
    tryPrompt: "Set up three independent passes that all read and append to the same shared notes document about this codebase — one cataloguing modules, one flagging dead code, one noting test coverage gaps — with no pass waiting on another.",
  },
  {
    id: "goal-stack",
    name: "Long-horizon goal-stack agent",
    shape: "Persistent loop with a goal stack",
    diagram: (
      <LoopDiagram
        steps={[
          { label: "Check goal stack" },
          { label: "Work top sub-goal" },
          { label: "Push / pop stack" },
        ]}
        loopLabel="Runs across many sessions — the goal stack persists, so progress survives a restart."
      />
    ),
    body: "Built for objectives too large for one sitting: the agent keeps an explicit stack (or queue) of sub-goals, works the top one, and can push new sub-goals it discovers mid-task before popping back to where it left off. The stack itself is checkpointed, so a restart resumes from wherever it was rather than starting over — the key difference from the memory-augmented agent in §6, which persists learned facts and preferences, not in-progress task state.",
    useWhen: [
      "The objective genuinely can't complete in one continuous run — it spans restarts, rate limits, or multiple days.",
      "Sub-goals discovered mid-task need to be handled without losing the thread of the original objective.",
    ],
    avoidWhen: [
      "The task reliably finishes in one run — the checkpointing machinery is pure overhead for something that never needed to survive a restart.",
      "Losing progress on a restart is genuinely fine — a simpler stateless loop is easier to reason about.",
    ],
    tryPrompt: "Start migrating this monorepo to the new build system. Keep a goal stack of remaining packages, work through them one at a time, and if you find a package with an unexpected circular dependency, push a sub-goal to resolve that before returning to the stack.",
  },
];

const COMPOSED_PROMPTS = {
  design: [
    {
      title: "Ship a new API endpoint",
      combines: ["rag", "agent", "evaluator"],
      prompt: "Look up our existing API conventions in the docs, then implement a new POST /export endpoint following them. Once it's done, have a second pass grade the implementation against our style guide before opening the PR.",
    },
    {
      title: "Route incoming tickets by type",
      combines: ["router", "workflow"],
      prompt: "Build a pipeline that reads each incoming support ticket, classifies it as billing, bug, or general with one model call, and routes billing tickets to the finance queue, bugs to engineering, and everything else to a general queue.",
    },
    {
      title: "Migrate a legacy service",
      combines: ["planner-executor", "goal-stack"],
      prompt: "Plan the migration of our auth service to the new SSO provider as an ordered list of subgoals. Keep a goal stack so the migration can resume after a session ends, and re-plan whenever a subgoal reveals a dependency you didn't expect.",
    },
    {
      title: "Stress-test a feature spec before writing it",
      combines: ["tree-of-thought", "debate"],
      prompt: "Sketch three different approaches to this notifications feature, evaluate each one, and continue with the strongest. Then have a separate pass argue against that approach to surface what it's missing before you write the spec.",
    },
  ],
  daily: [
    {
      title: "Morning inbox triage",
      combines: ["router", "chatbot"],
      prompt: "Read everything that came in overnight, sort it into urgent, needs a reply, and can wait, and draft a two-line summary for each item marked urgent.",
    },
    {
      title: "Review a pull request",
      combines: ["copilot", "reflection"],
      prompt: "Review this PR diff and suggest specific line comments. Then critique your own review against our code review checklist before posting it, and revise anything that doesn't hold up.",
    },
    {
      title: "Turn a meeting into action items",
      combines: ["rag", "evaluator"],
      prompt: "Summarize this meeting transcript, cross-reference it against last week's action items doc, and flag anything that was promised twice but never completed.",
    },
    {
      title: "Prep a standup update",
      combines: ["memory-agent"],
      prompt: "Recall what I said I'd work on yesterday, compare it against today's commits, and draft my standup update, noting anything that slipped.",
    },
  ],
  research: [
    {
      title: "Competitive landscape scan",
      combines: ["router", "rag", "evaluator"],
      prompt: "Classify each of these twelve competitor announcements by category (pricing, feature, partnership), pull the relevant facts from our own market-notes doc for context, then grade which three actually change our positioning.",
    },
    {
      title: "Root-cause a production incident",
      combines: ["agent", "tree-of-thought", "reflection"],
      prompt: "Investigate why checkout latency spiked at 2pm. Explore three plausible root causes in parallel, narrow to the most likely one using the logs, then critique your own conclusion against the timeline before writing the postmortem draft.",
    },
    {
      title: "Synthesize customer interview notes",
      combines: ["rag", "ensemble", "evaluator"],
      prompt: "Read all eight interview transcripts, extract the three most-repeated pain points three separate times independently, then judge which pain point actually shows up consistently versus which only looked common because of how one transcript worded it.",
    },
    {
      title: "Validate a build-vs-buy decision",
      combines: ["debate", "evaluator"],
      prompt: "Argue for building the entitlements service in-house, then argue for buying a vendor solution, then score both arguments against our actual constraints (team size, timeline, compliance) before recommending one.",
    },
    {
      title: "Audit a dataset for bias before training",
      combines: ["agent", "evaluator", "reflection"],
      prompt: "Scan this labeled dataset for class imbalance and label-quality issues, flag anything that would bias the model, then critique your own audit against a checklist of dataset red flags before signing off.",
    },
  ],
  ops: [
    {
      title: "Triage a security alert",
      combines: ["router", "agent"],
      prompt: "Classify this alert as false-positive, needs-investigation, or active-incident, and if it's the latter two, pull the relevant logs and start building a timeline of what happened.",
    },
    {
      title: "Draft an incident postmortem",
      combines: ["rag", "reflection"],
      prompt: "Pull the incident timeline from the tracking doc, draft the postmortem, then critique your own draft against our blameless-postmortem template before circulating it.",
    },
    {
      title: "Run a pre-deploy risk check",
      combines: ["evaluator", "tree-of-thought"],
      prompt: "Look at this deploy's diff, sketch three ways it could fail in production, and grade the deploy as low, medium, or high risk based on which failure modes are actually plausible given what changed.",
    },
    {
      title: "Coordinate a multi-service rollback",
      combines: ["planner-executor", "goal-stack"],
      prompt: "Plan the rollback of last night's release across the three affected services as an ordered sequence, keep a stack of remaining services to roll back, and re-check the plan after each one in case a dependency surfaces.",
    },
    {
      title: "Respond to an on-call page at 3am",
      combines: ["agent", "memory-agent"],
      prompt: "Diagnose why the payment queue is backing up, and recall what fixed the similar backup two weeks ago before trying anything new.",
    },
  ],
  writing: [
    {
      title: "Turn engineering notes into a customer-facing changelog",
      combines: ["rag", "reflection"],
      prompt: "Read this sprint's commit messages and PR descriptions, draft a changelog entry a customer would actually understand, then critique your own draft for any internal jargon that slipped through.",
    },
    {
      title: "Draft a difficult message to a stakeholder",
      combines: ["debate", "evaluator"],
      prompt: "Draft this project-delay message two ways — one that leads with the bad news, one that leads with the mitigation plan — then judge which one a skeptical stakeholder would actually respond better to.",
    },
    {
      title: "Write release notes across three audiences",
      combines: ["router", "chatbot"],
      prompt: "Take this feature description and write three versions: one for the changelog, one for the sales team, one for support — routing the technical depth up or down for each audience.",
    },
    {
      title: "Prep talking points for a board update",
      combines: ["rag", "tree-of-thought"],
      prompt: "Pull this quarter's actual numbers from the metrics doc, sketch two different narratives the data could support, and pick the one that's most defensible under follow-up questions.",
    },
    {
      title: "Localize a product announcement",
      combines: ["chatbot", "evaluator"],
      prompt: "Rewrite this announcement in plain, non-native-English-friendly phrasing, then grade the result against a checklist of idioms and culturally-specific references that wouldn't translate.",
    },
  ],
  learning: [
    {
      title: "Build a new hire's first-week ramp plan",
      combines: ["planner-executor", "rag"],
      prompt: "Pull the onboarding checklist and this person's role, break the first week into an ordered set of subgoals, and adjust the plan after each day based on what they've actually picked up.",
    },
    {
      title: "Turn a senior engineer's tribal knowledge into a runbook",
      combines: ["agent", "reflection"],
      prompt: "Interview-style, ask this engineer to walk through how they debug a stuck deploy, write it up as a runbook, then critique the runbook for any step that assumes context a new hire wouldn't have.",
    },
    {
      title: "Create a quiz to check understanding after a training",
      combines: ["evaluator", "ensemble"],
      prompt: "Write five questions testing the training material just covered, generate three candidate answer keys independently, and flag any question where the three answer keys disagree — that's a sign the question itself is ambiguous.",
    },
    {
      title: "Explain a complex system to a non-technical stakeholder",
      combines: ["tree-of-thought", "chatbot"],
      prompt: "Sketch three different analogies for explaining how our recommendation engine works, pick the one that holds up best under a follow-up question, and write the explanation.",
    },
    {
      title: "Debug a new hire's first production bug with them",
      combines: ["copilot", "reflection"],
      prompt: "Walk through this bug with the new hire, suggesting where to look next rather than just fixing it yourself, then afterward critique whether your hints actually taught the debugging process or just gave away the answer.",
    },
  ],
  sales: [
    {
      title: "Qualify an inbound lead",
      combines: ["router", "rag"],
      prompt: "Read this inbound lead's form answers and their company's public site, classify them as enterprise, mid-market, or self-serve, and pull the two most relevant case studies from our deck library for whichever segment they land in.",
    },
    {
      title: "Draft a renewal risk brief",
      combines: ["rag", "evaluator"],
      prompt: "Pull this account's support ticket history and usage data from the CRM notes, then score their renewal risk as low, medium, or high based on ticket sentiment and usage trend, not just contract date.",
    },
    {
      title: "Prep for a competitive deal",
      combines: ["debate", "tree-of-thought"],
      prompt: "Sketch three ways this prospect could justify picking the competitor instead of us, then argue against the strongest one, and draft the objection-handling talking point that actually survives that argument.",
    },
    {
      title: "Summarize a sales call for the deal record",
      combines: ["chatbot", "evaluator"],
      prompt: "Summarize this call transcript into next steps, stated budget, and decision timeline, then grade your own summary against the transcript for anything you inferred that wasn't actually said.",
    },
    {
      title: "Personalize outreach at scale without genericizing it",
      combines: ["router", "ensemble"],
      prompt: "Classify these fifty prospects into three outreach angles based on their most recent public activity, then draft three candidate opening lines per angle and keep only the one that references something specific to that company.",
    },
  ],
  data: [
    {
      title: "Investigate a metric that suddenly moved",
      combines: ["agent", "tree-of-thought"],
      prompt: "Signups dropped 20% starting Tuesday. Explore three plausible causes in parallel -- a funnel change, a tracking bug, a traffic-source shift -- and narrow to the most likely one using the actual event data before reporting back.",
    },
    {
      title: "Build a dashboard spec from a stakeholder's vague ask",
      combines: ["chatbot", "evaluator"],
      prompt: "Turn this one-line dashboard request into a full spec: the metrics, the filters, the intended audience, and what decision it's meant to inform. Then check the spec against what the stakeholder actually said to make sure you didn't invent requirements.",
    },
    {
      title: "Reconcile two reports that disagree",
      combines: ["rag", "evaluator"],
      prompt: "These two reports show different revenue numbers for the same month. Trace each one back to its underlying query, and identify exactly where the definitions diverge rather than just picking the number that looks right.",
    },
    {
      title: "Write a data quality check before a model retrain",
      combines: ["agent", "evaluator"],
      prompt: "Before we retrain on this new batch of data, scan it for duplicate records, missing required fields, and label drift versus the last training set, and flag anything that would silently degrade the model.",
    },
    {
      title: "Turn a raw analysis into an exec-ready takeaway",
      combines: ["rag", "tree-of-thought"],
      prompt: "Take this analysis notebook's findings, sketch two different one-sentence takeaways it could support, and pick the one that's actually defensible under a 'so what should we do differently' follow-up.",
    },
  ],
  hiring: [
    {
      title: "Screen resumes against a role's actual requirements",
      combines: ["router", "evaluator"],
      prompt: "Sort these thirty resumes into strong-match, possible, and not-a-fit against the role's must-have requirements only -- not the nice-to-haves -- and flag any strong-match candidate whose experience looks inflated relative to their listed title.",
    },
    {
      title: "Draft interview questions that actually test the role",
      combines: ["tree-of-thought", "evaluator"],
      prompt: "Sketch three different interview questions for this role's hardest actual responsibility, then pick the one that's hardest to answer with a rehearsed, generic response.",
    },
    {
      title: "Synthesize interview feedback across a panel",
      combines: ["rag", "ensemble"],
      prompt: "Read all five interviewers' notes on this candidate, extract the recurring themes independently for each, then flag anywhere the panel actually disagreed rather than smoothing it into one consensus summary.",
    },
    {
      title: "Draft a role's leveling justification",
      combines: ["rag", "evaluator"],
      prompt: "Pull this candidate's stated scope and impact from their resume and interview notes, compare it against our leveling rubric, and grade whether the proposed level is actually supported or just matches what they asked for.",
    },
    {
      title: "Write a rejection that's honest without being harsh",
      combines: ["debate", "chatbot"],
      prompt: "Draft this rejection two ways -- one that's vague and safe, one that gives one specific, useful piece of feedback -- then pick whichever version you'd actually want to receive if you were the candidate.",
    },
  ],
  legal: [
    {
      title: "Flag risky clauses in an incoming contract",
      combines: ["agent", "evaluator"],
      prompt: "Read this vendor contract and flag any clause that deviates from our standard terms -- indemnification, liability caps, auto-renewal -- and grade each flag as a dealbreaker, a negotiation point, or a note for the file.",
    },
    {
      title: "Check a marketing claim against what we can actually prove",
      combines: ["rag", "evaluator"],
      prompt: "Pull the underlying data behind this proposed marketing claim, and grade whether the claim as written is actually supported or needs a qualifier to stay accurate.",
    },
    {
      title: "Summarize a new regulation's actual obligations",
      combines: ["rag", "chatbot"],
      prompt: "Read this new regulation's text and summarize it into a plain-language list of what specifically changes for our product, not what changes for the industry in general.",
    },
    {
      title: "Prep a response to a data subject access request",
      combines: ["agent", "workflow"],
      prompt: "Locate every system that holds this person's data based on our data map, compile what's found into the standard DSAR response template, and flag any system on the data map that returned nothing so we can confirm it's actually empty, not unchecked.",
    },
    {
      title: "Pressure-test a policy before it ships internally",
      combines: ["debate", "tree-of-thought"],
      prompt: "Sketch three ways an employee could reasonably misread this new expense policy, argue for the interpretation most likely to cause disputes, and rewrite the policy language to close that gap before it goes out.",
    },
  ],
};

const ADVANCED_PROMPTS = {
  engineering: [
    {
      title: "Migrate a monolith to microservices without a big-bang cutover",
      combines: ["planner-executor", "goal-stack", "agent", "evaluator"],
      prompt: "Our checkout monolith needs to become four services over the next two quarters, and the last attempt at this stalled for six months because nobody could agree where the service boundaries actually were. First, decompose the monolith into candidate service boundaries and order them into subgoals, riskiest and most-coupled extraction first, and keep that ordered list as a goal stack that survives across sessions since this genuinely spans weeks. Once a boundary is agreed, work the extraction for one service at a time rather than planning all four in detail up front, since the second extraction will teach you things the plan can't know yet. After each extraction, grade the result against a strangler-fig checklist — dual writes removed, old code path deleted, no circular calls back into the monolith — before the goal stack moves to the next service. Do not let \"almost done\" services block starting the next one; flag partial completions explicitly instead of silently deferring them.",
    },
    {
      title: "Debug an intermittent deadlock across three services",
      combines: ["agent", "tree-of-thought", "ensemble", "reflection"],
      prompt: "The order, inventory, and payment services deadlock roughly once a week under load, always at a different point in the trace, and the on-call rotation has three different theories that all sound plausible. First, sketch three distinct root-cause branches — a lock-ordering bug, a connection-pool exhaustion cascade, and a retry-storm feedback loop — and pursue each far enough with the actual logs and trace data to say whether it's ruled out or still live. Where the evidence is ambiguous, reproduce the suspected trigger condition five separate times and check whether the failure signature repeats consistently or only sometimes, since a root cause that only sometimes explains the symptom probably isn't the real one. Once you've narrowed to the most likely cause, write the fix, then critique your own diagnosis against the full incident timeline one more time before calling it closed — specifically checking whether the fix would have prevented every past occurrence, not just the most recent one.",
    },
    {
      title: "Design a real-time bidding system from a one-page RFC",
      combines: ["tree-of-thought", "debate", "multi-agent", "evaluator"],
      prompt: "The one-page RFC says \"sub-50ms bid responses at 200k QPS\" and nothing else about how to get there. First, sketch three architectures — an in-memory sharded cache with async writeback, a pre-computed bid-table lookup, and a streaming pipeline with edge caching — evaluated only on whether each can plausibly hit the stated latency and throughput. Take the two strongest into a debate that argues for each on cost and operational complexity, not just raw performance, since the RFC never actually says what the budget is. Once one design wins, dispatch a schema sub-agent, a latency-budget sub-agent, and a failure-mode sub-agent to work their piece of the design in parallel, then synthesize their output into one spec. Grade the finished spec explicitly against the RFC's two stated numbers before calling it done, and flag anywhere the design only hits them under optimistic assumptions.",
    },
    {
      title: "Execute a zero-downtime migration on a 40-million-row table",
      combines: ["planner-executor", "workflow", "agent", "evaluator"],
      prompt: "This table backs live checkout traffic, so a naive ALTER TABLE would lock writes for the better part of an hour. Plan the migration as dual-write, backfill, verify, cutover, cleanup — five phases in that fixed order, since getting the sequence wrong here is what causes data loss, not any single step in isolation. Run each phase as a fixed pipeline rather than an open-ended agent loop, since the steps and their order are already known and predictability matters more than adaptability here; only the backfill script itself, which has to handle rows that changed mid-migration, needs an agent watching for and reacting to conflicts. Before cutover, evaluate row-count and checksum parity between old and new paths on a full pass, not a sample, and block cutover if parity isn't exact. State explicitly what the rollback looks like at each phase boundary, since \"just revert the migration\" stops being true once backfill starts.",
    },
    {
      title: "Fix a flaky CI suite blocking every merge",
      combines: ["agent", "ensemble", "tree-of-thought", "reflection"],
      prompt: "Three different tests fail intermittently, engineers have started reflexively re-running CI instead of investigating, and nobody currently knows if this is one root cause or three. First, run the suspect suite twenty times to characterize the actual flake rate and pattern per test, since \"it's flaky\" and \"it fails 40% of the time in a specific order\" call for different fixes. Branch into three hypotheses — a shared-state race between tests, a timing assumption that breaks under CI's slower hardware, and test-order dependency from a global fixture — and instrument each one directly rather than guessing from the stack trace alone. Fix the confirmed cause, then critique your own fix by re-running the same twenty-iteration check that established the baseline; if the flake rate doesn't drop to zero, say so plainly instead of declaring victory on a partial improvement.",
    },
    {
      title: "Build a platform from four teams' conflicting requirements",
      combines: ["multi-agent", "debate", "planner-executor", "evaluator"],
      prompt: "Platform, mobile, data, and growth all submitted \"must-have\" lists for the new internal developer platform, and at least two of the asks directly contradict each other. First, dispatch one sub-agent per team to extract what they actually need functionally, separated from how they phrased the request, since two teams asking for \"more control over deploys\" for different underlying reasons shouldn't get the same solution. Identify the sharpest genuine conflict between two teams' real needs and run a debate arguing each side on its technical merits, not on team seniority, then decide which one the platform should optimize for and what the other team loses. Turn the decision into a phased roadmap ordered by which teams are currently most blocked. Before shipping the roadmap, grade it explicitly against every team's original must-have list and name, per team, what they get and what they don't — don't let an unaddressed ask go unmentioned.",
    },
  ],
  gtm: [
    {
      title: "Build enterprise pricing for a self-serve product's first big logo",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "A Fortune 500 prospect wants a custom contract and the product has only ever sold self-serve at a flat per-seat rate, so there's no internal precedent to anchor to. First, pull whatever comparable deals, competitor public pricing, and internal margin targets exist in the deal-notes and finance docs, since guessing at a number with no grounding is how discounting spirals start. Sketch three pricing structures — tiered per-seat with a volume discount, flat platform fee plus usage, and a hybrid with a committed floor — and argue for the structure most defensible against the specific pushback this buyer's procurement team is known for versus the one that protects margin best, since those two goals are pulling in different directions here. Grade the winning structure against the deal's actual constraints — the close-date deadline, the champion's internal budget ceiling, and the minimum margin finance has set — before it goes to legal, and flag anywhere it only clears the bar optimistically.",
    },
    {
      title: "Diagnose a $2M deal stalled in security review",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "The deal has been \"in security review\" for six weeks with no update, the AE is getting nervous, and it's unclear whether this is a real blocker or the champion quietly losing internal momentum. First, pull everything on record — the security questionnaire responses, the last three email threads, and the champion's response latency over time — to establish what's actually known versus assumed. Explore three explanations in parallel: a genuine unresolved security finding, a budget-cycle delay being disguised as a security delay, and the champion having lost the internal argument entirely, and check each against the actual evidence rather than the AE's gut read. Once the most likely explanation is clear, grade the deal's real close probability against the forecast currently in the CRM, and say explicitly if the forecast is wrong, not just optimistic.",
    },
    {
      title: "Design a land-and-expand motion for a stalled account",
      combines: ["planner-executor", "memory-agent", "evaluator"],
      prompt: "This account bought a small starter package eighteen months ago, usage has been flat since, and the CS team has tried two expansion pitches that both went nowhere. First, recall what's actually on record from those two prior attempts — what was pitched, who pushed back, and why it stalled — rather than starting from a generic expansion playbook that ignores this account's specific history. Plan a new sequence of touchpoints that's explicitly different from what already failed, ordered so each step only happens if the previous one gets a real signal back, not on a fixed calendar. Before it goes to the account team, grade the plan against the two specific objections raised last time and confirm it actually addresses them rather than restating the same pitch with new slides.",
    },
    {
      title: "Build a battlecard that survives a skeptical AE's pushback",
      combines: ["debate", "rag", "ensemble", "evaluator"],
      prompt: "The last battlecard against this competitor got laughed out of a deal review because it was full of claims no AE could actually defend live. First, pull the competitor's actual public pricing, docs, and three recent win/loss notes where they came up, since the battlecard needs to be built on what's verifiably true, not what marketing wishes were true. Generate the core positioning claim three separate times independently and keep only the version that holds up identically each time, as a check against a claim that sounds good once but isn't actually grounded. Have a skeptical pass argue against every claim the way a sharp AE's toughest prospect would, and cut or soften anything that doesn't survive. Grade the final battlecard on one criterion only: could an AE defend every line of it live, unscripted, without checking notes.",
    },
    {
      title: "Restructure territory coverage after a surprise regional reorg",
      combines: ["multi-agent", "router", "planner-executor", "evaluator"],
      prompt: "EMEA just got split into three sub-regions with two days' notice before the new quarter starts, and forty accounts need new owners before reps lose momentum on active deals. First, classify every account by deal stage and urgency — active late-stage, early-stage, and dormant — so active deals get handled first and dormant accounts don't consume planning time they don't need yet. Dispatch a sub-pass per sub-region to draft its own coverage plan against its own quota target, rather than forcing one uniform split that ignores real differences in each sub-region's pipeline. Sequence the handoffs so no active late-stage deal changes owners mid-negotiation without a warm introduction first. Before finalizing, check the plan against total quota coverage and flag any account that ended up with no clear owner at all.",
    },
    {
      title: "Prep the champion for a make-or-break exec sponsor call",
      combines: ["tree-of-thought", "debate", "rag", "chatbot"],
      prompt: "The champion has never presented to their own CFO before, the CFO is known for killing deals on ROI math alone, and the champion asked us for help the night before the call. First, pull the actual usage data and cost-savings numbers this specific account has generated so far, since a generic ROI story will fall apart under a finance exec's first follow-up question. Sketch two ways the champion could frame the ask — lead with risk of not acting, or lead with quantified savings already achieved — and argue for whichever framing survives a skeptical CFO's most likely objection better, given what's actually true about this account. Turn the winning framing into three tight talking points and a one-line answer to the hardest predictable question, written in the champion's own voice so it doesn't read like it came from a vendor.",
    },
  ],
  finance: [
    {
      title: "Build next year's headcount plan under three revenue scenarios",
      combines: ["tree-of-thought", "planner-executor", "rag", "evaluator"],
      prompt: "The board wants a headcount plan before revenue guidance for next year is even finalized, so it has to work whether the number comes in low, base, or high. First, pull this year's actual hiring cost, ramp time, and attrition data, since a plan built on generic industry assumptions instead of this company's own numbers won't hold up to a CFO's questions. Sketch three headcount trajectories tied to low, base, and high revenue scenarios, and for each one sequence which roles get hired first versus held back if the number comes in lower than hoped, since not every open req is equally deferrable. Grade each trajectory against the cash runway constraint independently — a plan that's fine on paper but blows through 18 months of runway under the low scenario needs to be flagged as such, not smoothed over into one blended number.",
    },
    {
      title: "Reconcile a board-approved budget against six months of actual burn",
      combines: ["rag", "agent", "tree-of-thought", "evaluator"],
      prompt: "Actual spend is running 12% over the board-approved budget and the CFO needs to know before the next board meeting whether that's one department's overrun or a systemic planning error. First, pull the actual GL data against the original budget line by line rather than working from department self-reports, since self-reports are exactly where this kind of gap tends to get rounded away. Explore two competing explanations — concentrated overspend in one or two departments versus a company-wide planning assumption that was wrong from the start — and determine which one the data actually supports, since the fix and the board narrative differ completely depending on the answer. Grade the finding against what the board was actually told at approval time, and be explicit about whether this is a spending problem or a forecasting problem, since conflating the two in the board update would be its own mistake.",
    },
    {
      title: "Model a down-round against a bridge note before the board decides",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The company has nine months of runway, the next round is looking soft, and the board is split between raising a down round now or bridging on a note to buy time for better terms. First, pull the actual cap table, current burn rate, and the term sheet indications received so far, since this decision can't be modeled on rough recollection of what investors said in passing conversations. Argue the case for the down round — certainty now, reset expectations, move on — against the case for the bridge — preserve valuation, bet on improving the story, accept dilution risk if it doesn't work — using the real numbers on both sides rather than generic pros and cons. Grade both paths against the one constraint that actually matters most here, which is runway if the bridge doesn't convert on schedule, and say plainly which path fails worse if the optimistic case doesn't happen.",
    },
    {
      title: "Build a unit-economics model that survives the CFO's first fifteen questions",
      combines: ["rag", "ensemble", "reflection", "evaluator"],
      prompt: "The last unit-economics deck got sent back three times because the CAC and LTV numbers didn't tie back to anything the CFO could trace to source data. First, pull CAC, gross margin, and retention curves directly from billing and marketing spend records rather than from last quarter's deck, since numbers that don't trace to source are exactly what got this sent back before. Build the LTV:CAC model three separate times from the same source data using slightly different cohort assumptions, and keep only the figures that land consistently across all three, flagging any number that swings wildly on a reasonable assumption change as fragile rather than presenting it with false confidence. Before finalizing, critique the model against the specific line of questioning that killed the last version, and confirm every number in the deck can be traced back to its source in one click.",
    },
    {
      title: "Redesign the FP&A close process after two missed month-ends",
      combines: ["workflow", "planner-executor", "agent", "evaluator"],
      prompt: "Finance missed close by four and then six business days the last two months, and leadership is starting to lose confidence in the numbers by the time they finally arrive. First, plan the redesigned close as an ordered sequence — data lock, reconciliation, review, sign-off — since a close process is exactly the kind of fixed, well-understood sequence that benefits from a predictable pipeline rather than open-ended judgment at every step. Within that pipeline, let an agent handle the reconciliation step specifically, since that's the step where unexpected discrepancies actually show up and need real investigation rather than a scripted check. Evaluate the new process against the two specific failure points that caused the last two delays, not against a generic best-practices checklist, and confirm the new sequence would have actually finished on time both times had it been in place.",
    },
    {
      title: "Stress-test the Series C growth assumptions before the partner meeting",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The deck assumes a growth curve that accelerates in year two based on a sales-hiring plan that hasn't actually been tested at this company's ramp rates yet. First, pull this company's actual historical rep ramp time and quota attainment, since the deck's acceleration assumption needs to be checked against real data, not against what the model in the spreadsheet implies is achievable. Sketch two alternate growth paths — one using the actual historical ramp rate, one using the deck's optimistic assumption — and argue against the optimistic path the way a skeptical partner would, specifically on whether the hiring plan underneath it is realistic given current recruiting velocity. Grade the deck's headline growth number against the historical-ramp scenario and flag explicitly, in one sentence the CEO can say out loud in the room, how much of the growth curve depends on an assumption that hasn't been proven yet.",
    },
  ],
  crisis: [
    {
      title: "Run incident command for a payment outage during peak traffic",
      combines: ["agent", "planner-executor", "goal-stack", "evaluator"],
      prompt: "Payments are failing intermittently during the highest-traffic hour of the week, revenue is bleeding by the minute, and three different teams are independently investigating without coordination. First, take command of a single ordered plan rather than letting parallel independent investigations continue, and push the current highest-priority subgoal — stop the bleeding, even with an imperfect mitigation — ahead of root-causing the failure properly, since the two are not the same goal right now. Keep the remaining subgoals on an explicit stack so nothing gets dropped once the immediate fire is out — the temporary mitigation itself becomes a subgoal to properly resolve later. Have an agent work the live diagnosis in parallel with the mitigation, since waiting for full root cause before acting at all would cost more revenue than acting on a partial diagnosis. Before declaring the incident resolved, evaluate whether the mitigation actually addressed the customer-facing symptom or just moved where the failures show up.",
    },
    {
      title: "Coordinate the response to a leaked customer-data spreadsheet",
      combines: ["multi-agent", "planner-executor", "rag", "evaluator"],
      prompt: "A spreadsheet with a subset of customer records was found publicly accessible for an unknown period, and legal, security, comms, and support all need to move in parallel without stepping on each other or on the eventual disclosure obligations. First, pull the access logs to establish what was actually exposed and for how long, since the disclosure plan and its urgency both depend entirely on facts that aren't known yet. Plan the response as an ordered sequence — contain access, confirm scope, determine legal disclosure obligations, then external comms — since comms going out before scope is confirmed is exactly the kind of mistake that turns a contained incident into a bigger one. Dispatch one workstream each to legal, security, and support so they move in parallel once containment is done, and grade the final draft of any external communication against the confirmed facts only, catching anything that speculates beyond what's actually verified.",
    },
    {
      title: "Manage a multi-region outage hitting three services differently",
      combines: ["swarm", "agent", "tree-of-thought", "evaluator"],
      prompt: "The cloud provider's us-east region is degraded, and it's affecting the API, the async job queue, and the customer dashboard in three different ways with no single obvious root cause connecting them. Rather than routing everything through one central coordinator who becomes the bottleneck, let each affected service's on-call work its own mitigation independently against a shared incident doc everyone reads and writes to, so progress on one service isn't blocked waiting on updates from another. For the API specifically, since its failure mode is the least understood, branch into two hypotheses — a dependency on a single-region database versus a DNS failover that isn't triggering — and chase both until one is ruled out. Before declaring stable, evaluate each of the three services independently against its own baseline, since \"the outage is over\" for the dashboard doesn't mean it's actually over for the job queue's backlog.",
    },
    {
      title: "Handle a viral complaint threatening to become a press story",
      combines: ["tree-of-thought", "debate", "chatbot", "evaluator"],
      prompt: "A customer's thread describing a billing mistake is picking up traction online, a reporter has already replied asking for comment, and the actual billing error is still being confirmed internally. First, sketch three response postures — say nothing until fully confirmed, acknowledge publicly now while investigation continues, or reach out to the customer privately first — and weigh each against how this specific story is likely to escalate if it goes unaddressed for another few hours. Argue for silence-until-confirmed against the case for a fast public acknowledgment, specifically on the risk that silence itself becomes the story, since that's the actual failure mode reporters tend to chase. Draft the chosen response in a tone that reads as a person taking the mistake seriously, not corporate deflection, then grade it against one test: would the original customer feel like it actually addresses what they said, not a generic statement that could apply to any complaint.",
    },
    {
      title: "Coordinate a product recall discovered through a support-ticket spike",
      combines: ["agent", "planner-executor", "multi-agent", "evaluator"],
      prompt: "Support tickets about a specific defect have tripled in three days, and it's not yet clear whether this is a one-batch manufacturing issue or something broader that would require a full recall rather than a targeted one. First, have an agent trace the affected tickets back to specific batch or serial numbers to establish scope, since the entire response plan changes depending on whether this is one bad batch or a design flaw. Plan the recall as an ordered sequence — confirm scope, notify affected customers, arrange replacement or refund logistics, update the product listing — and dispatch legal, ops, and customer comms as parallel workstreams once scope is confirmed, not before. Before the customer notification goes out, evaluate it against the confirmed scope specifically, flagging if it's written broadly enough to worry customers who were never actually affected.",
    },
    {
      title: "Run the war room for a ransomware attempt caught mid-encryption",
      combines: ["agent", "goal-stack", "multi-agent", "planner-executor", "evaluator"],
      prompt: "Endpoint detection caught encryption activity on a subset of file servers before it spread further, but it's unknown whether the attacker still has access or how they got in in the first place. Plan the response in strict order — isolate affected systems first, then determine the entry point, then assess what data if any was accessed before encryption started, then plan restoration — since restoring from backup before confirming the entry point is closed just invites reinfection. Keep containment, investigation, and restoration as separate items on a goal stack so restoration work doesn't quietly start before investigation confirms it's safe to. Dispatch a forensics sub-agent to trace the entry point while a separate ops sub-agent works isolation, running in parallel rather than sequentially, since isolation can't wait on forensics finishing. Before declaring the incident contained, evaluate explicitly whether the entry point is actually closed, not just whether encryption has stopped spreading.",
    },
  ],
  product: [
    {
      title: "Decide whether to sunset a feature 20% of revenue still depends on",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The legacy reporting module costs three engineers' worth of maintenance a quarter, almost nobody at the company understands its code anymore, and yet a fifth of revenue comes from accounts that specifically cite it as a reason they haven't churned. First, pull actual usage and revenue-attribution data for the accounts that depend on it, since \"20% of revenue\" as a headline number could mean very different things depending on whether those accounts have other reasons to stay too. Sketch three paths — sunset with a migration period, keep it indefinitely, or rebuild it on modern infrastructure at a fraction of current maintenance cost — and argue for sunsetting against the case for keeping it, using the real dependency data rather than the module's reputation internally. Grade the recommended path against the accounts most likely to actually churn over it, naming them specifically rather than treating the 20% as one undifferentiated risk.",
    },
    {
      title: "Build next quarter's roadmap from four conflicting wishlists",
      combines: ["multi-agent", "debate", "planner-executor", "evaluator"],
      prompt: "Sales wants three enterprise features to close pending deals, support wants to fix the top ten recurring complaints, engineering wants a quarter of tech-debt paydown, and the CEO wants one big swing — and there's capacity for maybe half of all four lists combined. First, dispatch a pass per stakeholder group to translate their wishlist into the actual business outcome each item is meant to produce, since two items that look unrelated on the surface might both really be about the same underlying churn risk. Debate the sharpest tradeoff directly — the enterprise features sales wants versus the tech-debt paydown engineering says is overdue — on the basis of what happens in two quarters if each is deferred, not on whoever argues loudest in the room. Sequence the resulting roadmap so the highest-outcome items go first regardless of which team asked for them, then grade the final roadmap against all four original lists and state plainly, for each stakeholder, what they're not getting this quarter and why.",
    },
    {
      title: "Diagnose why a shipped feature's adoption cratered against forecast",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "The feature launched to the forecasted user base but adoption is running at a fifth of the projected rate three weeks in, and the launch retro is scheduled for tomorrow. First, pull actual usage funnel data — who saw it, who tried it, who came back — rather than relying on the qualitative sense that \"people don't seem to be using it,\" since the funnel will show exactly where users are dropping off. Branch into three explanations — the feature is genuinely hard to discover, it's discoverable but confusing once opened, or it's fine but the forecast itself was built on a flawed comparable — and check each against the funnel data specifically, since a discovery problem and a confusion problem have completely different fixes. Grade the most likely explanation against what the original launch forecast assumed, and be explicit in the retro about whether the forecast or the feature was the actual mistake.",
    },
    {
      title: "Design a phased rollout for a change that breaks a power-user workflow",
      combines: ["planner-executor", "debate", "memory-agent", "evaluator"],
      prompt: "The new pricing-editor UI is objectively better for 95% of users but breaks a keyboard-shortcut-heavy workflow that the top 5% of power users rely on daily, and two of those power-user accounts are also the company's largest customers. First, recall what's on record from past rollouts of similarly disruptive changes — what worked, what caused support spikes, what the actual churn impact was — rather than treating this as a fresh problem with no relevant history. Argue the case for a hard cutover against a case for an extended opt-in period specifically for power users, weighing rollout velocity against the real risk to those two large accounts. Plan the rollout in phases — opt-in for power users first, broad default-on for everyone else, then full deprecation of the old UI on a set date — and grade the final plan specifically against whether either large account would actually churn under it, not against overall rollout metrics that could mask that risk.",
    },
    {
      title: "Prioritize a 200-item backlog nobody trusts the scoring on",
      combines: ["router", "ensemble", "tree-of-thought", "evaluator"],
      prompt: "The backlog has grown to 200 items across four different scoring frameworks applied inconsistently over two years, and the team has stopped trusting the resulting priority order enough to actually use it. First, classify every item by type — bug, small enhancement, and larger bet — since a single scoring framework applied uniformly across all three types is part of why the current order doesn't feel trustworthy. Within the larger-bets category specifically, score the top fifteen candidates three separate times using slightly different weightings of effort versus impact, and flag any item whose rank swings wildly across the three runs as one where the team's actual judgment, not the formula, should decide. Sketch two or three plausible resulting orderings and pick the one that best matches what the team already believes intuitively matters most, on the theory that a ranking nobody trusts is worse than a slightly rougher one people will actually follow. Grade the final order against current strategic priorities and flag anything ranked highly that doesn't actually connect to one.",
    },
    {
      title: "Build a PRD for a platform bet with no internal precedent",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "Leadership wants to explore an API-first platform play the company has never attempted before, and there's no comparable internal project to model scope, risk, or timeline against. First, pull whatever's available on comparable platform launches from public case studies and any partner or competitor documentation the team has gathered, since building the PRD from pure internal intuition on something this unprecedented is how scope creeps invisibly. Sketch three different scope levels — a minimal read-only API, a full read-write platform with a partner ecosystem, and a middle ground with a curated first-party integration set — and argue for the minimal scope against the case for going bigger from the start, weighing time-to-first-signal against the risk of under-building something partners won't actually adopt. Grade the resulting PRD's scope against the team's actual current capacity, not against the ambition of the original pitch, and flag explicitly if the recommended scope still doesn't fit within it.",
    },
  ],
  exec: [
    {
      title: "Draft the board narrative for a quarter that missed revenue, beat retention",
      combines: ["rag", "debate", "tree-of-thought", "evaluator"],
      prompt: "Revenue missed the board's number by 8%, but net revenue retention hit its best mark in six quarters, and the CEO doesn't want this to read as spin dressed up with a good-news distraction. First, pull the actual numbers behind both metrics — what specifically drove the revenue miss, and what specifically drove the retention improvement — since the narrative has to connect the two causally if it's going to hold up, not just present them side by side. Sketch two narrative framings — retention strength as evidence the miss is a timing issue, not a demand issue, versus a more conservative framing that treats the miss as the headline and retention as one supporting data point — and argue for the more conservative framing against the more favorable one, on the theory that a board that catches spin trusts the next update less. Grade the final draft against the single toughest follow-up question a skeptical board member is likely to ask, and make sure the deck actually answers it rather than hoping nobody asks.",
    },
    {
      title: "Prep the CEO for an all-hands after a layoff announcement",
      combines: ["debate", "chatbot", "reflection", "evaluator"],
      prompt: "The layoff was announced by email an hour ago, remaining employees are anxious and half-expecting more cuts, and the all-hands is in ninety minutes. First, argue for two different tones the CEO could take — direct acknowledgment of the difficulty with no attempt to spin it positively, versus a forward-looking framing that emphasizes the plan from here — and pick whichever one is less likely to read as tone-deaf given what employees are actually feeling right now, not what would be easiest to deliver. Draft the opening two minutes in the CEO's actual voice, since a generic corporate script will land worse than something that sounds like them, even if it's more polished. Anticipate the three hardest questions employees are likely to ask — is this the last round, why these teams specifically, what happens to remaining workload — and draft honest answers rather than deflections. Critique the full draft once more specifically for anything that could read as minimizing what just happened, and cut it.",
    },
    {
      title: "Build talking points for a hostile board member's expected questions",
      combines: ["tree-of-thought", "debate", "memory-agent", "evaluator"],
      prompt: "One board member has pushed back hard on the growth plan in each of the last two meetings, and this quarter's numbers give them more ammunition, not less. First, recall specifically what this board member has objected to in the last two meetings — not board pushback in general — since preparing for a generic skeptic misses the actual pattern of what concerns them. Sketch two or three ways they're likely to frame this quarter's numbers unfavorably, and argue against the sharpest version of that framing as if you were them, to find where the CEO's current answer would actually fail under real pressure. Draft talking points that pre-empt the specific objection rather than waiting to react to it live in the room. Grade the final talking points against this board member's actual history of what has and hasn't satisfied them before, not against a generic \"handle board skepticism\" standard.",
    },
    {
      title: "Draft the investor update after a key executive's sudden departure",
      combines: ["rag", "debate", "reflection", "evaluator"],
      prompt: "The CTO resigned unexpectedly yesterday, investors will hear about it from someone within days regardless of what the company sends, and the update needs to go out before that happens. First, pull the actual transition plan — who's stepping in, on what timeline, what continuity is already in place — since an update that raises the departure without a credible continuity answer will generate more anxious follow-up calls than it prevents. Argue for a brief, matter-of-fact update against a longer, more reassuring one, weighing which is more likely to actually calm a nervous investor base versus which reads as over-explaining a problem that isn't as big as the tone implies. Draft the chosen version, then critique it once specifically for anything an investor could reasonably read as burying the real reason for the departure, and either address it directly or cut the line that invites the question.",
    },
    {
      title: "Prep the CFO's answers for a rating-agency call before refinancing",
      combines: ["rag", "ensemble", "debate", "evaluator"],
      prompt: "The debt refinancing depends partly on this call going well, the rating agency's analyst has a reputation for drilling into leverage ratios specifically, and the CFO has one shot to get the framing right live. First, pull the actual leverage, coverage, and cash-flow figures the analyst is most likely to ask about, since walking in with rounded or remembered numbers instead of exact figures is exactly the kind of gap a sharp analyst probes for. Draft the answer to the hardest likely question three separate times with slightly different emphasis, and keep whichever version stays accurate and consistent regardless of how the follow-up is phrased, since an answer that only works if the question is asked exactly one way isn't ready. Argue against the strongest version of that answer the way the analyst actually would, to find where it's still soft. Grade the final talking points against the specific covenant thresholds in the existing debt agreement, not general financial health, since that's what the analyst is actually pricing.",
    },
    {
      title: "Synthesize a fractured leadership team into one board recommendation",
      combines: ["multi-agent", "debate", "rag", "evaluator"],
      prompt: "The exec team is split three ways on whether to enter a new market next year, each leader has a different read on the same market data, and the board is expecting one clear recommendation, not a summary of disagreement. First, dispatch a pass per exec to extract their actual underlying reasoning, not just their stated position, since two execs who land on \"no\" might be worried about completely different risks. Pull the market data each of them is citing and check whether it actually supports the conclusion they're drawing from it, since at least one position here is likely resting on an assumption rather than the data itself. Run a debate between the strongest \"yes\" case and the strongest \"no\" case using only the verified data, and let that debate — not a headcount of who agrees with whom — decide the recommendation. Grade the final recommendation against whether it can survive being read back to all three original executives without any of them saying it misrepresents the real tradeoff.",
    },
  ],
  mna: [
    {
      title: "Run first-pass diligence on a target's engineering org",
      combines: ["multi-agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "The data room just opened with a codebase export, an org chart, and eighteen months of incident reports, and the term sheet timeline gives four days to flag any dealbreaker before the next negotiation round. First, dispatch separate passes over the codebase for architecture and tech-debt signal, over the org chart for key-person concentration risk, and over the incident history for reliability patterns, since each of these needs different expertise and running them sequentially would blow the timeline. Pull specific evidence for each finding rather than general impressions, since \"the codebase seems okay\" isn't something the deal team can act on. For the two or three most concerning findings across all three passes, sketch what the actual remediation cost and timeline would look like post-close, not just flag them as risks. Grade the full set of findings against what would actually change the valuation or deal structure, and separate those from findings that are true but not material enough to raise.",
    },
    {
      title: "Build the integration plan for two overlapping product lines",
      combines: ["planner-executor", "debate", "multi-agent", "evaluator"],
      prompt: "Both companies have a project-management product, both have loyal customer bases who'll be upset if their product gets sunset, and the deal thesis assumed consolidation without ever specifying which product survives. First, argue the case for consolidating onto the acquirer's product against the case for the target's, using actual feature-parity gaps and customer-migration risk on both sides rather than which team has more organizational leverage post-close. Once a direction is set, plan the migration in phases — feature-parity gap closure first, then customer communication, then actual data migration, then sunset — since announcing a sunset before parity gaps are closed is what triggers the worst customer reaction. Dispatch separate workstreams for the technical migration and the customer-facing communication so they can move in parallel once the plan is set, and grade the final plan specifically against the retention risk for the losing product's largest accounts.",
    },
    {
      title: "Model three deal structures for an earnout-heavy acquisition",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "The seller wants most of the value in an earnout tied to revenue targets they're confident about and the buyer's finance team is skeptical of, and the structure needs to close a gap in valuation expectations without either side walking. First, pull the target's actual historical revenue volatility and the market comparables both sides are implicitly anchoring to, since the earnout structure only works if it's built on real historical variance, not on the seller's optimistic projection. Sketch three structures — a straight revenue-target earnout, a milestone-based structure tied to product integration rather than revenue, and a hybrid with a smaller earnout and a larger upfront discount — and argue for the milestone-based structure against the revenue-target one, specifically on which is less likely to create a dispute if the target's growth slows for reasons outside their control. Grade the recommended structure against what a reasonable seller would actually accept, not just what protects the buyer best, since a structure that never gets signed protects nobody.",
    },
    {
      title: "Diagnose culture-fit risk from Glassdoor and exit-interview data",
      combines: ["rag", "ensemble", "agent", "evaluator"],
      prompt: "The target's Glassdoor reviews are mixed in a way that could mean normal startup growing pains or a genuine retention problem the deal team hasn't priced in, and there's no time to run real employee interviews before the LOI deadline. First, pull the actual review text and exit-interview summaries rather than relying on the aggregate star rating, since the same 3.4 average can hide either scattered minor complaints or one specific, serious, recurring theme. Extract the recurring themes from the text independently three separate times and keep only what shows up consistently across all three passes, as a check against overweighting a handful of loud outlier reviews. Have an agent cross-reference the recurring themes against the target's actual attrition rate over the same period to see whether the sentiment in the reviews is showing up in real departures or is just noise. Grade the finding against whether it would change deal terms or is a post-close integration item, and say which explicitly.",
    },
    {
      title: "Draft a synergy case a skeptical CFO will actually believe",
      combines: ["debate", "rag", "tree-of-thought", "evaluator"],
      prompt: "The banker's deck has a synergy number that's clearly padded with cost-saving line items that don't survive a second look, and the CFO has already said she won't take the deal to the board on numbers she doesn't trust. First, pull the actual overlapping cost centers — shared vendors, duplicate tooling, redundant headcount — and build the synergy case only from items with a clear, traceable mechanism, since a synergy number without a mechanism is exactly what got the last deck sent back. Sketch a conservative case and an aggressive case separately, and argue for presenting the conservative number as the headline with the aggressive case shown only as upside, on the theory that a CFO who catches one inflated line stops trusting the whole deck. Grade the final case against whether every line item has a named owner and a realistic timeline to actually realize it, and cut anything that doesn't.",
    },
    {
      title: "Plan day-one comms across employees, customers, and press",
      combines: ["planner-executor", "multi-agent", "chatbot", "evaluator"],
      prompt: "The deal closes at 6am, employees at both companies need to hear it from leadership before they see it in the press, customers of the smaller company are anxious about product continuity, and a wire story is expected to break by mid-morning regardless of what the company controls. Plan the sequence explicitly by the clock — internal announcement first, then customer communication, then press — since any of those three groups hearing it out of order is worse than a slightly later announcement to all three at once. Dispatch separate drafts for each audience in parallel once the sequence is set, since an employee announcement and a customer-facing one need completely different tones even though they're describing the same event. Draft the customer-facing version specifically to answer the one question anxious customers will actually have — does the product they use change — rather than a general congratulatory announcement that dodges it. Grade all three drafts against consistency with each other, since a customer who sees the press release and the customer email tell subtly different stories will notice.",
    },
  ],
  compliance: [
    {
      title: "Build a SOC 2 readiness plan from an unread gap assessment",
      combines: ["rag", "planner-executor", "agent", "evaluator"],
      prompt: "A consultant delivered a 40-page gap assessment three months ago, nobody has actually worked through it since, and a big prospect now has SOC 2 as a hard requirement for the deal to close. First, pull the actual gap assessment and extract every control that's currently failing, since re-deriving the gaps from scratch would waste the money already spent getting them identified. Plan remediation in order of what actually blocks certification versus what's a lower-severity finding auditors flag but don't gate on, since treating all forty gaps as equally urgent would blow the deal timeline trying to fix things that don't need fixing first. Have an agent draft the actual policy documents for the highest-priority gaps, since policy-writing is the most time-consuming part and the one most likely to stall without dedicated effort. Grade the resulting plan against the prospect's actual deal timeline and flag explicitly if full remediation genuinely can't happen before the deal needs to close, so sales can plan around it rather than be surprised by it.",
    },
    {
      title: "Determine whether a new feature triggers GDPR obligations",
      combines: ["rag", "tree-of-thought", "debate", "evaluator"],
      prompt: "The new personalization feature infers user preferences from behavior rather than collecting them directly, and it's genuinely unclear whether that counts as a new category of processing under GDPR or is covered by the existing privacy notice. First, pull the actual data flow — what's inferred, how it's stored, whether it's used to make automated decisions with legal or similarly significant effect — since the classification depends entirely on those specifics, not on how the feature is described in the product spec. Sketch two readings — that inference from existing lawfully-collected data doesn't create a new processing purpose, versus that it does because the inferred data reveals something users didn't knowingly disclose — and argue for the more conservative reading, since guessing wrong here creates regulatory exposure that a delayed launch doesn't. Grade the final determination against the actual text of the existing privacy notice and flag precisely what would need to change if the conservative reading is correct.",
    },
    {
      title: "Design an AI governance policy that survives legal review",
      combines: ["debate", "rag", "tree-of-thought", "evaluator"],
      prompt: "Legal rejected the first draft of the AI model-governance policy for being too permissive on customer-data use in fine-tuning, and engineering pushed back on the legal team's counter-draft for being too restrictive to actually build anything under. First, pull the actual current customer-data contracts and see what they do and don't permit, since the policy needs to be grounded in what's contractually allowed, not in either team's instinct about what feels appropriately cautious. Sketch two or three policy postures along that spectrum and argue for the middle position against both the permissive and restrictive extremes, using the actual contract language as the deciding evidence rather than a generic AI-ethics framework. Grade the resulting policy against one test: can an engineer read it and know, without asking legal every time, whether a specific proposed use is allowed — and revise anywhere the answer is unclear.",
    },
    {
      title: "Prepare for a surprise regulator audit with two weeks' notice",
      combines: ["planner-executor", "multi-agent", "rag", "evaluator"],
      prompt: "The notification letter arrived with a two-week runway and a list of document categories to have ready, and the compliance team has never been through this specific regulator's audit process before. First, pull every prior audit finding, however old, and any correspondence with this regulator, since patterns from past interactions are the best available signal for what they'll actually focus on this time. Plan the two weeks in reverse from the audit date — document assembly first week, internal review and gap-closing second week, final readiness check the day before — since starting with review before documents are assembled just wastes the limited runway. Dispatch separate workstreams to gather documentation from each affected department in parallel, since sequential collection would eat the whole two weeks on logistics alone. Grade the assembled response against the actual document list in the notification letter line by line, and flag any item that genuinely can't be ready in time so leadership can plan the conversation about it in advance.",
    },
    {
      title: "Reconcile conflicting state requirements for a new financial product",
      combines: ["router", "rag", "tree-of-thought", "evaluator"],
      prompt: "The new lending product needs to launch in twelve states, and at least four of them have licensing or disclosure requirements that actively conflict with each other, meaning one uniform product design won't be compliant everywhere. First, classify the twelve states by requirement profile rather than treating each individually, since several will share the same rules and only a handful actually need bespoke handling. Pull the specific conflicting requirements for the states that don't fit the common profile, and sketch whether the product can absorb the strictest common denominator without breaking unit economics, or whether it genuinely needs state-specific variants. Grade the resulting design against the two hardest states specifically — not the average case — since a design that passes eleven states and fails the twelfth still can't launch there, and that's the outcome that actually matters for the launch plan.",
    },
    {
      title: "Plan a whistleblower investigation without tipping off the subject",
      combines: ["planner-executor", "rag", "agent", "evaluator"],
      prompt: "An anonymous complaint alleges a director has been steering vendor contracts to a company they have an undisclosed relationship with, and any misstep in how the investigation is run risks either tipping off the subject or exposing the whistleblower. First, pull the actual vendor contract and payment history for the alleged relationship, since the investigation needs to start from verifiable financial records, not from the complaint's characterization of events. Plan the investigation steps in an order that gathers all externally-verifiable evidence — corporate filings, public records, financial trails — before anyone internal is interviewed, since interviewing too early is the most common way an investigation tips off its subject. Have an agent handle the document and records research specifically, keeping the interview planning as a separate, later-stage step gated on what the records actually show. Grade the investigation plan against one standard: does every step protect both the integrity of the evidence and the whistleblower's anonymity, and flag any step that doesn't.",
    },
  ],
  talent: [
    {
      title: "Redesign engineering org after a reorg left two teams orphaned",
      combines: ["tree-of-thought", "debate", "multi-agent", "evaluator"],
      prompt: "The platform and infra teams both report to a role that got eliminated in last week's reorg, both teams are now asking who they report to, and the answer affects two different VPs' actual scope and headcount. First, dispatch a pass on each of the two teams' current work and dependencies, since which VP they should report to depends on who they actually work with day to day, not on organizational tidiness. Sketch three placements — both teams under one VP, split between the two VPs along a natural technical boundary, or a new interim reporting line while a permanent decision gets made properly — and argue for the split placement against consolidating both under one VP, weighing which minimizes disruption to in-flight work this quarter specifically. Grade the recommended placement against what each team's own manager says their biggest current dependency actually is, and flag if the recommendation contradicts what either team reports.",
    },
    {
      title: "Build a retention plan after the team's best engineer gave notice",
      combines: ["rag", "memory-agent", "tree-of-thought", "evaluator"],
      prompt: "The strongest engineer on the payments team gave two weeks' notice yesterday, cited being underleveled and under-compensated relative to market in their exit conversation, and the manager wants to know if there's a real counter-offer worth trying or if it's already too late. First, pull the actual comp bands, this person's recent performance reviews, and their leveling history, since the counter-offer decision depends on whether their stated reason is accurate or is covering for something else entirely. Recall what's on record from the last two engineers who left this team citing similar reasons, since a pattern across three departures with the same complaint is a different problem than one person's individual grievance. Sketch two responses — a genuine counter-offer addressing the specific gap, or letting them go and focusing retention effort on the team's next-most-at-risk person instead — and grade which one actually addresses the root cause versus which just delays the same conversation with someone else next quarter.",
    },
    {
      title: "Diagnose an engagement-score drop isolated to one department",
      combines: ["agent", "rag", "ensemble", "evaluator"],
      prompt: "Company-wide engagement held steady this quarter, but one department dropped eleven points, and the survey's open-text comments are too vague on their own to tell whether this is one bad manager, one bad project, or something structural. First, have an agent cross-reference the department's engagement drop against recent org changes, project outcomes, and manager tenure, since the timing of any correlated change is the strongest available signal absent a direct explanation. Pull the actual open-text comments and extract the recurring themes independently three times, keeping only what's consistent across all three passes, since a handful of loud outlier comments can otherwise dominate the read. Grade the most likely explanation against whether it's addressable by HR directly or requires the department's own leadership to act, and say which, since misrouting this to the wrong owner is how these drops go unaddressed for another quarter.",
    },
    {
      title: "Design a leveling framework that survives the first calibration fight",
      combines: ["debate", "ensemble", "rag", "evaluator"],
      prompt: "The last leveling attempt fell apart in calibration when two managers couldn't agree on what separated a senior from a staff engineer, and this round needs concrete enough criteria that the same argument doesn't happen again. First, pull actual examples of work from engineers already at each level, since abstract criteria like \"broader scope\" mean nothing until they're anchored to specific, real examples people already agree on. Draft the level boundaries three separate times using different engineers' examples as anchors each time, and keep only the language that produces the same placement regardless of which set of examples was used, as a check against criteria that are really just describing one particular person rather than the level generally. Argue the hardest boundary case — the senior/staff line specifically, since that's where the last fight happened — from both sides, and sharpen the written criteria until neither side of that argument has room to make its case anymore. Grade the final framework by placing last cycle's most contested calibration case against it and confirming it now resolves cleanly.",
    },
    {
      title: "Plan a reduction in force that protects two critical skill sets",
      combines: ["planner-executor", "rag", "debate", "evaluator"],
      prompt: "The company needs to cut 15% of headcount, and two skill sets — the two engineers who understand the legacy billing system, and the one person who owns the compliance-reporting pipeline — represent single points of failure the business genuinely can't lose in this round regardless of performance ranking. First, pull the actual dependency map for those systems, confirming which specific people are truly irreplaceable in the near term versus assumed to be, since \"nobody else understands it\" is sometimes true and sometimes just an untested assumption. Plan the reduction in the standard order — performance and redundancy criteria first — but carve out the confirmed critical-dependency roles as an explicit exception before the list is finalized, and argue internally for why that exception is justified so it survives scrutiny rather than looking like favoritism. Grade the final list against the dependency map one more time to confirm no critical single point of failure was cut inadvertently through a criterion that didn't account for it.",
    },
    {
      title: "Build a succession plan for a founder-CEO's eventual transition",
      combines: ["tree-of-thought", "debate", "memory-agent", "evaluator"],
      prompt: "The board has asked for a succession plan even though the founder-CEO has given no indication of stepping back soon, and the plan needs to be real enough to be useful in an emergency without signaling to the company that a transition is imminent. First, recall what's actually on record about each internal candidate's track record and the board's past comments on each of them, since a succession plan built without that context risks proposing someone the board has already quietly ruled out. Sketch two scenarios — a planned, multi-year transition versus a sudden emergency one — since the right candidate and the right process genuinely differ between the two, and a single plan that only covers one scenario isn't actually complete. Argue the case for the strongest internal candidate against the case for an external search, using the actual gaps in the internal candidate's experience rather than generic succession-planning caution. Grade the final plan against whether it could actually be executed on 48 hours' notice if the emergency scenario happened tomorrow, not just whether it reads well as a document.",
    },
  ],
  cs: [
    {
      title: "Build a churn early-warning system from three disconnected signals",
      combines: ["agent", "router", "rag", "evaluator"],
      prompt: "Support ticket sentiment, product usage decline, and billing behavior each individually give a partial and noisy churn signal, and CS currently only reacts after an account has already decided to leave. First, have an agent pull all three signal streams for the accounts that churned in the last two quarters, and work backward to see how early each signal actually showed up before the churn decision, since the goal is early warning, not just correlation after the fact. Classify accounts into risk tiers based on which combination of signals is present, since a usage decline alone means something very different from a usage decline paired with declining support sentiment. Route each tier to a different CS response — a light-touch check-in for single-signal accounts, a structured save play for multi-signal ones — rather than treating every flagged account the same way. Grade the resulting model by backtesting it against last quarter's actual churned accounts and reporting how many it would have flagged with enough lead time to actually matter.",
    },
    {
      title: "Diagnose an NPS drop despite flat usage",
      combines: ["rag", "tree-of-thought", "ensemble", "evaluator"],
      prompt: "NPS for one customer segment dropped nine points this quarter while their product usage stayed completely flat, which rules out the most obvious explanation and leaves the actual cause unclear. First, pull the verbatim NPS comments for this segment specifically, not the aggregate score, since a flat usage number can hide a real experience problem the score alone won't explain. Branch into two explanations — a support or billing experience issue unrelated to the product itself, versus a competitive shift where this segment now has a comparison point they didn't have before — and check the verbatims for evidence of each rather than assuming which is more likely. Extract the dominant theme from the verbatims independently three times, keeping only what's consistent, since a handful of especially articulate detractors can otherwise dominate the read of what the whole segment actually feels. Grade the final explanation against whether it's something CS can act on directly or needs to be escalated to product, and say which.",
    },
    {
      title: "Design a win-back campaign for accounts that churned to a rival",
      combines: ["rag", "debate", "router", "evaluator"],
      prompt: "Thirty accounts churned to the same competitor over the past year, and a generic win-back email campaign to all thirty is unlikely to work since their reasons for leaving weren't all the same. First, pull each account's actual churn reason from the offboarding notes, since lumping together price-driven churn and feature-gap churn into one campaign message would speak to neither group effectively. Classify the thirty accounts by churn reason into two or three groups, then argue for a distinct message and offer for each group rather than one blended pitch, weighing what's actually changed since they left against what would need to be true for each specific reason to no longer apply. Grade each group's proposed message against whether it makes a claim the company can actually back up today, not an aspirational one, since a win-back pitch that overpromises risks a second, more permanent churn.",
    },
    {
      title: "Rebuild trust with a strategic account after a second missed SLA",
      combines: ["tree-of-thought", "debate", "chatbot", "evaluator"],
      prompt: "This account has now had two SLA breaches in the same quarter, the executive sponsor is openly questioning the renewal, and a generic apology-and-credit response already failed to satisfy them after the first breach. First, sketch what actually caused both breaches — whether they share a root cause or are unrelated incidents — since the account's trust concern is really about whether this keeps happening, and the answer to that depends entirely on whether the underlying problem has actually been fixed. Argue for a response that leads with the specific technical fix and its verification against one that leads with relationship-level reassurance, weighing which this particular executive sponsor is more likely to find credible given that the first apology already didn't land. Draft the chosen response in a tone that acknowledges the second breach specifically, not a templated apology that could apply to the first one too, and grade it against whether it commits to something concrete and checkable, not just an assurance.",
    },
    {
      title: "Build a health score that catches silent churn, not just angry tickets",
      combines: ["rag", "agent", "ensemble", "evaluator"],
      prompt: "The current health score is built almost entirely on support-ticket volume and sentiment, which means quiet accounts that are disengaging without ever filing a ticket score as healthy right up until they don't renew. First, have an agent pull login frequency, feature-adoption breadth, and admin-seat activity for accounts that churned quietly last year — the ones with no elevated ticket activity beforehand — to find what signal, if any, would have caught them. Build a revised score incorporating that signal, and run it three separate times against slightly different weighting of usage versus engagement, keeping only the version that would have flagged those quiet churns with meaningful lead time. Grade the new score by backtesting it against both the quiet churns and the loud, ticket-heavy churns from the same period, confirming it catches both types rather than trading one blind spot for another.",
    },
    {
      title: "Design a CS playbook for a product with three distinct buyer personas",
      combines: ["router", "multi-agent", "rag", "evaluator"],
      prompt: "The same product now sells to solo freelancers, mid-size agencies, and enterprise IT departments, and CS has been running one generic playbook across all three even though what \"success\" looks like is completely different for each. First, classify the current book of accounts into the three personas based on actual usage pattern and contract size, not just self-reported company type, since some accounts don't fit the persona they'd naturally be assumed to belong to. Dispatch a separate pass to define what a healthy adoption curve and a meaningful check-in cadence look like for each persona specifically, since a monthly check-in that's appropriate for enterprise IT would feel like unwanted overhead to a solo freelancer. Grade the resulting three playbooks against the accounts that have churned in each persona historically, confirming each playbook would have actually caught that specific persona's typical warning signs.",
    },
  ],
  supplychain: [
    {
      title: "Diagnose a supplier delay cascading into three launch dates",
      combines: ["agent", "tree-of-thought", "planner-executor", "evaluator"],
      prompt: "A key component supplier just announced a four-week delay, and it's not immediately clear which of the three product lines depending on that component can absorb the delay versus which will actually miss their launch date. First, have an agent trace the current inventory buffer and committed launch timeline for each of the three affected product lines, since the delay's actual impact depends entirely on how much buffer each line already has, not on the delay length alone. Branch into three response options — expedited air freight at a cost premium, a temporary substitute component pending qualification, or accepting the delay and pushing the launch date — and evaluate each specifically against which product lines can and can't tolerate it. Plan the chosen response per product line as an ordered set of actions with named owners and dates, and grade the final plan against whether any product line is still silently at risk of missing its date under it.",
    },
    {
      title: "Design a dual-sourcing plan after a single-supplier outage",
      combines: ["tree-of-thought", "debate", "planner-executor", "evaluator"],
      prompt: "A factory fire at the sole supplier for a critical component halted production for three weeks last quarter, and leadership wants a dual-sourcing plan so this can't happen again — but qualifying a second supplier is expensive and slow, and not every component actually needs it. First, sketch which components in the current supply chain carry genuine single-point-of-failure risk versus which have readily available alternates already, since a blanket dual-sourcing mandate across every component would be far more expensive than the risk justifies. Argue the case for prioritizing dual-sourcing on the highest-volume, longest-lead-time components first against spreading effort evenly across all flagged risks, weighing which approach actually reduces the most exposure per dollar spent. Plan the qualification process for the prioritized components in order, since supplier qualification takes real calendar time and can't all happen in parallel given quality-team capacity. Grade the resulting plan against the original fire scenario specifically — would this plan have actually prevented that three-week halt.",
    },
    {
      title: "Reconcile demand forecasts that disagree across sales, ops, and finance",
      combines: ["rag", "ensemble", "tree-of-thought", "evaluator"],
      prompt: "Sales' pipeline-based forecast, ops' historical-trend forecast, and finance's budget-driven forecast all show meaningfully different demand for next quarter, and production planning needs one number to actually order materials against. First, pull the actual methodology and underlying data behind each of the three forecasts, since reconciling them requires understanding why they disagree, not just averaging three numbers that were built on different assumptions. Generate a fourth, blended estimate three separate times weighting the three source forecasts differently each time, and see whether the result converges on a stable number or stays sensitive to the weighting, since a stable convergence is far more trustworthy to act on than a number that swings depending on how it's weighted. Branch into the two most plausible demand scenarios underlying the disagreement — sales' pipeline is too optimistic, or ops' historical trend doesn't account for a real underlying shift — and grade the final number against which scenario the most recent actual data supports.",
    },
    {
      title: "Plan warehouse capacity for a holiday spike three times normal volume",
      combines: ["planner-executor", "tree-of-thought", "agent", "evaluator"],
      prompt: "Last year's holiday volume caught the warehouse under-resourced and orders shipped late for eleven straight days, and this year's projected volume is even higher, so the same staffing and layout plan clearly won't hold. First, plan the ramp-up in phases — seasonal hiring and training, layout reconfiguration for peak-flow picking, then a stress test at partial volume before the real spike hits — since attempting all three simultaneously in the two weeks before peak is exactly what went wrong last year. Sketch two staffing models — a larger permanent seasonal headcount versus a smaller core team backed by a flex-labor surge plan — and evaluate each against last year's actual failure point, which was insufficient picking capacity during the first three peak days specifically, not overall labor shortage across the season. Have an agent build the stress-test simulation using last year's actual order data scaled to this year's projected volume, and grade the plan against whether the simulated peak clears without the same bottleneck reappearing.",
    },
    {
      title: "Diagnose a quality failure traced to one shift on one line",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "Defect rates on line 3 spiked specifically during the night shift over the past two weeks, while the same line's day shift and every other line stayed within normal tolerance, which rules out an equipment-wide or design problem. First, have an agent pull the actual defect logs, staffing roster, and any maintenance or calibration events specific to that shift and line, since the pattern is narrow enough that the cause is almost certainly something specific to that combination, not a general quality issue. Branch into three explanations — a specific piece of equipment drifting out of calibration only during that shift's run pattern, a training gap on that shift's crew, or a raw-material batch that happened to align with that shift's timing — and check each against the logs rather than assuming which is most likely from experience with similar past issues. Grade the confirmed cause against whether the fix is a one-time correction or needs a standing process change to prevent recurrence, and say which.",
    },
    {
      title: "Design a contingency plan for a key port's labor strike",
      combines: ["tree-of-thought", "planner-executor", "multi-agent", "evaluator"],
      prompt: "Dockworkers at the port handling 60% of the company's import volume are threatening a strike within two weeks, and there's no existing contingency plan since this port has never had a major disruption before. First, sketch three response options — rerouting to an alternate port with available capacity, air freight for the highest-priority SKUs only, or building inventory buffer now ahead of the strike date if it's still avoidable — and evaluate each against actual cost and lead-time tradeoffs specific to the company's product mix, not generic supply-chain contingency advice. Plan whichever combination gets chosen as an ordered sequence with hard trigger dates, since waiting until the strike actually starts to begin rerouting would forfeit the lead time that makes rerouting viable at all. Dispatch separate workstreams to logistics, for the physical rerouting, and to sales, for customer communication about potential delays, so both move in parallel rather than sales finding out after the fact. Grade the final plan against the specific SKUs that would run out of buffer fastest under a prolonged strike, and confirm those are the ones prioritized for air freight.",
    },
  ],
  marketing: [
    {
      title: "Rebuild positioning after a competitor copies the tagline",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "A well-funded competitor launched a campaign with a tagline close enough to ours that customers have started asking which company said it first, and the brand team needs a repositioning that doesn't read as reactive. First, pull the actual campaign performance data and customer perception research from before the competitor's launch, since the repositioning should build on what was already working, not abandon it out of anxiety over the copy. Sketch three directions — reinforce the original positioning more distinctively so the overlap becomes irrelevant, pivot to an adjacent angle the competitor hasn't touched, or address the similarity head-on with confidence — and argue for reinforcing distinctively against pivoting away entirely, weighing which risks looking more rattled by a competitor's move. Grade the resulting direction against actual customer research, not internal brand-team preference, and flag if the preferred direction isn't actually what the data supports.",
    },
    {
      title: "Diagnose why a rebrand's launch metrics missed the pitch deck",
      combines: ["rag", "tree-of-thought", "ensemble", "evaluator"],
      prompt: "The rebrand launched with strong internal excitement but website conversion and brand-recall survey numbers are both running well below what the pitch deck projected, and the agency and the internal team disagree about why. First, pull the actual pre- and post-launch conversion and survey data, since the disagreement needs to be resolved with numbers, not with each side's read of the launch's reception. Branch into two explanations — the creative execution underperformed the strategy, or the strategy itself was based on research that didn't generalize to the actual customer base — and check each against the data, since the fix is completely different depending on which one is true. Extract the recall-survey open-text themes independently three times to see what specifically isn't landing, keeping only the consistent findings. Grade the most likely explanation against the original pitch deck's stated assumptions, and be specific about which assumption turned out to be wrong.",
    },
    {
      title: "Build a crisis-proof brief after a tone-deaf ad backlash",
      combines: ["debate", "evaluator", "tree-of-thought", "chatbot"],
      prompt: "The last campaign generated real backlash for a joke that landed badly with a segment of the audience nobody on the creative team anticipated, and the next brief needs guardrails that would have actually caught that problem, not vague \"be more careful\" guidance. First, sketch what specifically went wrong with the last campaign's review process — was the risky element actually flagged and dismissed, or genuinely never surfaced at all — since the fix differs completely depending on the answer. Draft the new brief with an explicit, specific review step targeting the actual failure mode identified, then argue against the safest possible version of the brief the way a risk-averse legal reviewer would, to see whether the guardrails are specific enough to catch a similar issue without also killing anything with real creative edge. Grade the final brief on one test: would it have caught the specific problem from last time, not whether it feels appropriately cautious in the abstract.",
    },
    {
      title: "Design a multi-channel launch for a product with three audiences",
      combines: ["router", "planner-executor", "multi-agent", "evaluator"],
      prompt: "The new product serves individual consumers, small-business owners, and enterprise procurement teams, and a single launch message across all channels would undersell it to enterprise while overwhelming consumers with irrelevant detail. First, classify the planned channels by which audience each one actually reaches — social and search skew consumer and small-business, while sales-enablement content and analyst outreach reach enterprise — rather than pushing one unified message across every channel uniformly. Plan the launch sequence so consumer and small-business channels go first, generating early proof points and usage data that the enterprise-facing content can then cite, since enterprise buyers respond better to demonstrated traction than to launch-day hype alone. Dispatch separate creative workstreams per audience so each message can be tailored appropriately rather than one team stretching thin across three very different tones. Grade the full plan against whether an enterprise procurement lead and a consumer end-user would each see messaging that actually speaks to their specific concern, not a diluted version of the same pitch.",
    },
    {
      title: "Reconcile brand and performance marketing's attribution numbers",
      combines: ["rag", "tree-of-thought", "debate", "evaluator"],
      prompt: "Performance marketing's dashboard credits paid search for the majority of new signups, while brand's own survey shows most new customers say they came through word-of-mouth or brand awareness, and the two teams are now fighting over next year's budget split using numbers that can't both be right in the way each team is presenting them. First, pull the actual attribution methodology behind each number, since \"paid search drove signups\" and \"customers say they heard about us through word of mouth\" aren't necessarily contradictory if paid search is capturing the last click on a journey that brand actually started. Sketch two explanations — that performance marketing's last-click model is overcrediting itself for demand brand actually generated, or that brand's self-reported survey is unreliable because customers don't accurately recall how they first heard about a product — and argue for which explanation the actual data better supports rather than treating both teams' numbers as equally valid political inputs. Grade the reconciled view against whether it would actually change the recommended budget split, and say by how much.",
    },
    {
      title: "Build a messaging house that survives translation into five markets",
      combines: ["tree-of-thought", "debate", "router", "evaluator"],
      prompt: "The current messaging house is built around a wordplay-heavy tagline and a set of idioms that work well in English but are already known to translate awkwardly or lose meaning entirely in at least two of the five target markets. First, classify the five markets by how directly the current messaging would translate, since some markets can likely keep most of the existing house with light localization while others need genuinely new language, not just translation. Sketch two approaches for the markets that need real rework — a fully localized message built independently for that market's cultural context, or a simplified, idiom-free version of the global message that trades some distinctiveness for reliable translation — and argue for the simplified approach against full localization, weighing brand consistency across markets against how much each market's team would need to build from scratch. Grade the resulting messaging house by having it checked against a native speaker's read in each of the two hardest markets, and flag anywhere it still doesn't land as intended.",
    },
  ],
  dataplatform: [
    {
      title: "Design a feature store for three teams duplicating pipelines",
      combines: ["multi-agent", "planner-executor", "agent", "evaluator"],
      prompt: "Recommendations, fraud, and search teams have each independently built their own feature-engineering pipeline off the same underlying event data, and at least a third of the features are functionally identical across all three with slightly different names and slightly different bugs. First, dispatch a pass per team to catalog what features they actually compute and consume today, since the migration plan depends on knowing the real overlap, not an assumed one. Plan the migration in phases — build the shared store with the confirmed-overlapping features first, migrate one team as a pilot, then roll out to the remaining two — rather than attempting a simultaneous cutover for all three teams at once, since a single pilot will surface integration problems the other two teams would otherwise hit blind. Have an agent handle the actual feature-definition migration and validate that each migrated feature produces identical output to the team's existing pipeline before cutover. Grade the finished store against whether it actually eliminated the duplication, not just added a fourth pipeline alongside the original three.",
    },
    {
      title: "Diagnose a silent model regression from an upstream schema change",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "The fraud model's precision has quietly dropped over the past two weeks with no alerts firing, since the monitoring only tracks prediction volume, not prediction quality, and nobody noticed until a manual quarterly review caught it. First, have an agent pull the model's input feature distributions over the same window and compare them against the training-time distributions, since a silent regression with no code change usually traces back to the data feeding the model having shifted underneath it. Pull the recent changelog for every upstream system that feeds this model's features, since a schema change three systems upstream can silently corrupt a feature without ever touching the model's own code. Branch into two hypotheses — a genuine schema change altered a feature's meaning without changing its name or type, or a real shift in underlying fraud patterns that the model hasn't been retrained on — and check each against the actual distribution data. Grade the confirmed cause against what monitoring gap allowed it to go undetected for two weeks, and specify what alert would have caught it on day one.",
    },
    {
      title: "Build a data-quality contract system after a corrupted training run",
      combines: ["planner-executor", "workflow", "copilot", "evaluator"],
      prompt: "A malformed upstream batch silently corrupted last month's model training run, the bad data passed every existing check because none of the checks covered the specific field that broke, and rebuilding trust means the fix has to be systemic, not a single patched check. Plan the fix as validate-ingest-quarantine-alert, a fixed pipeline sequence since data-quality gating is exactly the kind of well-understood, repeatable step sequence that benefits from predictability over open-ended judgment at every batch. Design the actual contract schema — the specific field-level checks each upstream source commits to — as a change a person reviews and approves before it merges, the way any schema change to a shared system should be reviewed, rather than an agent silently defining what \"valid\" means for data feeding production models. Grade the resulting contract against the actual field that caused last month's corruption, confirming it would have been caught, and against at least two other plausible failure modes the current checks don't cover either.",
    },
    {
      title: "Plan a legacy warehouse-to-lakehouse migration",
      combines: ["planner-executor", "goal-stack", "tree-of-thought", "evaluator"],
      prompt: "Three hundred reports and dashboards currently query the legacy warehouse directly, migrating all of them at once is infeasible, and the migration will realistically span multiple quarters with different teams touching it at different times. First, sketch the migration's overall shape — table-by-table replication with dual-write, versus a full schema redesign in the new lakehouse from scratch — and evaluate each against how much of the existing 300 reports could migrate with minimal rework versus how many would need to be rebuilt regardless. Plan the chosen approach as an ordered sequence of table groups by actual query volume and business criticality, and keep that ordered list as a goal stack since this genuinely spans multiple quarters and will need to resume cleanly across team handoffs and reprioritizations. After each table group migrates, evaluate query-result parity between old and new against a sample of the actual reports that depend on it, not a synthetic test query, before marking that group complete and moving to the next.",
    },
    {
      title: "Decide whether to fine-tune or keep prompting for a high-volume task",
      combines: ["debate", "ensemble", "evaluator", "fine-tuned"],
      prompt: "The support-ticket classifier currently runs a general model with a long few-shot prompt at a volume that's starting to strain the latency and cost budget, and it's unclear whether a fine-tuned specialized model would actually be worth the training investment or is solving a problem prompting could still handle with tuning. First, run the current few-shot approach against a held-out set of tickets three separate times to establish its actual accuracy and consistency baseline, not an anecdotal sense that it's \"pretty good.\" Argue the case for fine-tuning — lower per-call latency and cost at this volume, more consistent output — against the case for continuing to prompt a general model with better examples and tighter instructions, using the actual measured baseline rather than a generic build-versus-buy heuristic. Grade the recommendation against the real cost curve at current and projected volume, and specify the volume threshold at which the recommendation would flip if it isn't already past it.",
    },
    {
      title: "Build an ML platform on-call runbook after an ownerless outage",
      combines: ["agent", "planner-executor", "memory-agent", "evaluator"],
      prompt: "The model-serving layer went down for forty minutes last week and the postmortem revealed nobody on call actually knew who owned diagnosing a serving-layer failure specifically, since the runbook only covered training-pipeline failures. First, recall what's on record from that incident and any prior serving-layer near-misses, since the runbook needs to be built from what actually goes wrong in practice, not a generic template for ML infrastructure in general. Plan the new runbook as an ordered triage sequence — check serving-layer health first, then upstream feature-pipeline health, then model-registry state — since diagnosing in the wrong order is part of what cost forty minutes last time. Have an agent draft the specific diagnostic commands and dashboards for each triage step, tested against the actual incident's symptoms to confirm they would have surfaced the real cause faster. Grade the finished runbook by walking through last week's actual incident against it and confirming it would have cut the forty minutes meaningfully.",
    },
  ],
  security: [
    {
      title: "Build a threat model for a new third-party integration",
      combines: ["tree-of-thought", "debate", "agent", "evaluator"],
      prompt: "A new partner integration needs read access to customer financial data through an API neither security team has reviewed before, and the product team wants to ship it this sprint. First, have an agent map the actual data flow — what the partner can read, what they can write, what happens if their credentials are compromised — since a threat model built on the integration's stated purpose rather than its actual technical access will miss real risk. Sketch three attack scenarios — partner credential compromise, a bug in the partner's own system exposing data back to us, and scope creep where the partner starts pulling more than originally agreed — and argue for which one represents the highest actual risk given this specific partner's security posture and the data in question, rather than treating all three as equally likely by default. Grade the integration's current access scope against the least-privilege version that would still let the partner do what they actually need, and flag the gap between the two explicitly before this ships.",
    },
    {
      title: "Design an access-review program after a month-long credential gap",
      combines: ["agent", "planner-executor", "rag", "evaluator"],
      prompt: "An ex-employee's credentials stayed active for over a month after their last day because offboarding relied on a manual checklist step that got missed, and the incident review needs to produce a program that doesn't depend on someone remembering to run a manual step. First, have an agent pull the actual offboarding process as currently documented and trace exactly where the manual step lives and why it got missed, since fixing the wrong step in the process wouldn't prevent a repeat. Plan the redesigned process to remove the manual dependency entirely — triggering deactivation directly from the HR system's termination event rather than from a person remembering a checklist item — and sequence the systems that need to be wired into that trigger by how much access risk each one represents. Grade the new process against the actual gap that caused this incident, confirming this specific failure mode is now structurally impossible, not just less likely.",
    },
    {
      title: "Investigate a suspicious authentication pattern",
      combines: ["agent", "tree-of-thought", "computer-use", "evaluator"],
      prompt: "Login attempts from a wide spread of IP addresses are hitting the same set of usernames with low-and-slow timing that doesn't trip the existing rate-limit alerts, and it's unclear whether this is automated credential stuffing or something else entirely. First, have an agent pull the actual authentication logs for the affected usernames and characterize the pattern precisely — timing, geographic spread, success rate — since the response differs completely depending on whether any attempts actually succeeded. Branch into two explanations — credential stuffing using a leaked password list, or a targeted attack against specific accounts using information gathered elsewhere — and check the pattern against each, since a targeted attack against specific named accounts is a materially different and more urgent risk than opportunistic stuffing. Where the internal tooling for reviewing the affected accounts only has a web console with no API, drive that console directly to check for any account showing signs of actual compromise rather than just failed attempts. Grade the final assessment against whether any account was actually breached, not just targeted, and scope the response accordingly.",
    },
    {
      title: "Build a vendor risk-tiering system for 300 unreviewed vendors",
      combines: ["router", "rag", "agent", "evaluator"],
      prompt: "Three hundred vendors have accumulated over several years with no consistent security review, procurement wants to unblock new vendor onboarding without waiting for all 300 to be reviewed first, and the security team has capacity to properly review maybe twenty a month. First, classify all 300 by the data access and system integration each one actually has, since a vendor with read-only access to marketing assets and one with write access to the customer database need completely different urgency, not the same review queue position. Pull whatever's already on file for each vendor — SOC 2 reports, existing contracts, prior incident history — to inform the tiering rather than starting the assessment from zero for each one. Have an agent draft the actual review checklist for the highest-risk tier specifically, since that's the tier where a superficial review would actually matter if something went wrong. Grade the resulting tiering against the twenty-vendor-per-month review capacity, and confirm the highest-risk tier alone doesn't already exceed a full year's capacity — if it does, that itself is the finding to escalate.",
    },
    {
      title: "Design a tabletop exercise for a supply-chain compromise scenario",
      combines: ["tree-of-thought", "multi-agent", "planner-executor", "evaluator"],
      prompt: "The security team has run tabletop exercises for ransomware and data breaches but never for a compromised software dependency, and a recent industry incident involving a poisoned open-source package makes this the obvious next scenario to test readiness against. First, sketch two or three realistic variants of a dependency-compromise scenario — a maintainer account takeover, a typosquatted package name, a legitimate package compromised post-publish — and pick the variant most plausible given the company's actual dependency management practices, not the most dramatic version. Plan the exercise as a sequenced injection of information — initial vague signal, confirmation of compromise, scope discovery, remediation decision — rather than revealing the full scenario upfront, since the point is testing how the team reacts to incomplete information in real time. Dispatch separate roles to engineering, security, and comms participants so each responds from their actual function rather than everyone reasoning generically about the whole incident. Grade the exercise afterward against whether it surfaced a real gap in the current response plan, not just whether participants found it engaging.",
    },
    {
      title: "Reconcile a pen-test report against engineering's fixed claims",
      combines: ["rag", "agent", "tree-of-thought", "evaluator"],
      prompt: "The pen-test report lists fourteen findings, engineering says nine of them are already fixed in a release that shipped after the test window closed, and the retest is scheduled for next week with real doubt about whether all nine claims will actually hold up. First, have an agent pull the actual code and configuration for each of the nine claimed fixes and verify the fix independently rather than taking the ticket status at face value, since a ticket marked \"done\" and a vulnerability that's actually closed aren't always the same thing. For any claimed fix that can't be verified with confidence from code alone, branch into whether it needs a live retest of that specific finding before the scheduled retest, versus whether the evidence available is sufficient to close it now. Grade the final list against the original report's severity ratings, and flag explicitly which of the five remaining unfixed findings are the ones that actually need to be prioritized before the retest, not just listed as still open.",
    },
  ],
  intelligence: [
    {
      title: "Build a complete teardown of a well-funded new entrant",
      combines: ["multi-agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "A well-funded startup just launched directly at our core market with a product that looks similar on the surface, and leadership wants a full read on how real the threat actually is before the next planning cycle, not just a first impression from the launch announcement. First, dispatch separate passes over their public pricing and packaging, their hiring patterns on job boards as a signal of what they're actually building next, and any win/loss notes our own sales team already has from deals where this competitor showed up. Pull the specific evidence behind each finding rather than general impressions, since \"they look well-funded and aggressive\" isn't something the roadmap team can act on. Sketch two or three ways the competitive picture could evolve over the next year — they stay a niche threat in one segment, they expand aggressively into our core segment, or they get acquired or fold before doing real damage — and grade which scenario the actual evidence gathered points toward most strongly.",
    },
    {
      title: "Determine if a competitor's pricing is a real threat or a stunt",
      combines: ["debate", "rag", "tree-of-thought", "evaluator"],
      prompt: "A competitor just announced pricing 40% below the market, and the sales team is already fielding \"why can't you match this\" questions, but it's unclear whether this is a sustainable strategic move or an unsustainable loss-leader meant to grab headlines and market share before quietly raising prices later. First, pull whatever's knowable about their unit economics from public filings, funding history, and any former-employee commentary, since the answer depends on whether they can actually sustain this price at their current cost structure, not on how the pricing looks on the surface. Sketch two explanations and argue for the loss-leader read against the sustainable-strategy read, using their funding runway and burn rate as the deciding evidence rather than assuming intent from the pricing move alone. Grade the resulting read against what it means for our own pricing response — a temporary stunt calls for holding firm and waiting it out, a sustainable move calls for an actual strategic response — and recommend one, not both.",
    },
    {
      title: "Forecast a competitor's response to our upcoming launch",
      combines: ["tree-of-thought", "debate", "ensemble", "evaluator"],
      prompt: "Our launch is confidential for another six weeks, but the market-leading competitor has responded fast and aggressively to every meaningful launch from any player in this space over the past two years, and product wants a read on what to expect so the launch plan can account for it. First, pull their historical response pattern from the last several competitive launches specifically — response time, whether they matched features or undercut on price, how loudly they responded publicly versus quietly — since that history is a much better predictor than generic assumptions about how a market leader typically behaves. Sketch three response scenarios and generate the most likely one independently three separate times using slightly different weightings of their historical pattern, keeping whichever scenario comes out consistently rather than trusting a single run. Argue against that consensus scenario the way their own strategy team might, to check whether there's a real blind spot in it. Grade the final forecast against what it implies our launch plan should specifically prepare for, not just a general \"expect a strong response.\"",
    },
    {
      title: "Synthesize eighteen months of scattered market research into one thesis",
      combines: ["rag", "memory-agent", "tree-of-thought", "evaluator"],
      prompt: "Eighteen months of customer interviews, analyst reports, and win/loss notes have accumulated across a dozen different documents with no single synthesis, and the strategy team needs one coherent market thesis to anchor next year's planning, not another pile of disconnected findings. First, pull the actual underlying research documents rather than working from summaries of summaries, since real synthesis requires going back to source material where nuance tends to have been lost in prior recaps. Recall which findings from this research have already been acted on versus which were noted and then forgotten, since a thesis that repeats an insight the company already tried and abandoned needs to explain why this time would be different. Sketch two or three candidate theses the research could support, and grade each against how much of the actual eighteen months of evidence it explains versus how much it has to ignore or explain away, keeping the one with the strongest overall fit rather than the most compelling narrative.",
    },
    {
      title: "Investigate a rumor that a major customer is evaluating a rival",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "A rumor reached the account team, secondhand through a partner, that our largest customer has started evaluating a competitor, and there's no confirmed signal yet, which means acting too aggressively on an unconfirmed rumor risks tipping off the account before there's anything real to respond to. First, have an agent pull the account's actual recent behavior — usage trend, support ticket sentiment, executive engagement level, contract renewal timing — to check for any independent signal consistent with the rumor before treating it as confirmed. Branch into two explanations — the rumor is accurate and reflects real dissatisfaction the usage data would also show, or it's a secondhand exaggeration of a routine market-scan the account runs periodically without real intent to switch — and weigh each against what the account data actually shows. Grade the confirmed risk level against whether it warrants a proactive executive outreach now or a lower-key monitoring posture, and recommend one specifically rather than a generic \"stay close to the account.\"",
    },
    {
      title: "Build a why-we-win, why-we-lose analysis from a quarter of deal data",
      combines: ["rag", "ensemble", "tree-of-thought", "evaluator"],
      prompt: "Sales leadership wants a real why-we-win-why-we-lose analysis for the board, not the usual anecdotal read from whichever deals reps happen to remember most vividly, and a full quarter of CRM deal data with loss-reason fields exists but has never been systematically analyzed. First, pull the actual loss-reason and win-reason fields plus the free-text deal notes for every closed deal in the quarter, since the structured loss-reason field alone is known to be unreliable when reps fill it in quickly at deal-close time. Extract the recurring themes from the free-text notes independently three separate times and keep only what's consistent across all three, as a check against a handful of memorable deals dominating the read. Branch into whether the dominant loss theme is a product gap, a pricing objection, or a competitive displacement, since each implies a different owner and fix. Grade the final analysis against whether it would actually change anything in next quarter's sales motion or product priorities, and name specifically what should change.",
    },
  ],
};

const TOOLING = [
  {
    category: "Model hubs & hosting",
    does: "Where trained models get published, versioned, downloaded, and often run directly.",
    examples: "Hugging Face, Ollama's model library, Replicate",
  },
  {
    category: "Training frameworks",
    does: "The libraries actual model training is written against — defining, running, and differentiating neural networks.",
    examples: "PyTorch, TensorFlow, JAX",
  },
  {
    category: "Classical ML",
    does: "Non-deep-learning machine learning — regression, decision trees, clustering — still the right tool for a lot of tabular-data problems.",
    examples: "scikit-learn, XGBoost, LightGBM",
  },
  {
    category: "Agent / orchestration frameworks",
    does: "Code scaffolding for chaining prompts, tools, and retrieval into the archetypes above, instead of wiring the loop by hand.",
    examples: "LangChain, LlamaIndex, Haystack",
  },
  {
    category: "Vector databases",
    does: "Store embeddings and do similarity search over them — the retrieval half of RAG (above).",
    examples: "Pinecone, Weaviate, Chroma, pgvector",
  },
  {
    category: "Experiment tracking / MLOps",
    does: "Log training runs, compare metrics across them, and manage a model's lifecycle from experiment to deployed checkpoint.",
    examples: "MLflow, Weights & Biases",
  },
  {
    category: "Inference serving",
    does: "Run a trained model efficiently at request time — batching, scaling, and managing GPU memory so it isn't wasted per-request.",
    examples: "vLLM, NVIDIA Triton, Hugging Face Text Generation Inference",
  },
];

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

// Name lookup for the "Combines:" tags on composed prompts below — draws
// from the same two lists rather than duplicating pattern names by hand.
const ALL_PATTERNS = [...ARCHETYPES, ...COMPLEX_AGENTS];

// One composed-prompt entry: a title, which patterns it draws on (linked
// back to their full cards above), and the prompt itself.
function ComposedPromptCard({ entry }) {
  return (
    <div className="card">
      <p style={{ marginBottom: "4px" }}>
        <b>{entry.title}</b>
      </p>
      <p className="composed-combines">
        Combines:{" "}
        {entry.combines.map((id, i) => {
          const pattern = ALL_PATTERNS.find((p) => p.id === id);
          return (
            <Fragment key={id}>
              {i > 0 && ", "}
              <a href={`#${id}`}>{pattern.name}</a>
            </Fragment>
          );
        })}
      </p>
      <Code wrap>{entry.prompt}</Code>
    </div>
  );
}

export default function Architecture() {
  return (
    <ContentLayout active="architecture" wide>
      <span className="kicker">Reference</span>
      <span className="badge">
        <i /> Reflects the live deployment
      </span>
      <h1>How Merit AC is built</h1>
      <p className="lead">
        Two things on this page: exactly how Merit AC is built and hosted, and a field guide to
        how AI systems get designed in general. The field guide stands on its own — read it
        whether or not you use Merit AC.
      </p>

      <Toc
        items={[
          { href: "#pipeline", label: "The ingestion & scoring pipeline" },
          { href: "#data-model", label: "Data model" },
          { href: "#deployment", label: "Where it runs" },
          { href: "#verdict", label: "Does this hosting choice make sense?" },
          { href: "#stubbed", label: "What's deliberately not built yet" },
          { href: "#archetypes", label: "AI system archetypes: diagrams, when to use, prompts to try" },
          { href: "#complex-agents", label: "Complex agent patterns: compounding the basics" },
          { href: "#tooling", label: "The ML/AI software landscape" },
          { href: "#composed-prompts", label: "Composed prompts: combining patterns for real work" },
          { href: "#advanced-prompts", label: "Advanced multi-stage prompts" },
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

      <TileNav items={ARCHETYPES} />

      {ARCHETYPES.map((arch) => (
        <ArchetypeCard entry={arch} key={arch.id} />
      ))}

      <h2 id="complex-agents">7. Complex agent patterns: compounding the basics</h2>
      <p>
        These six build on the archetypes in §6 rather than replacing them — a debate setup is
        two agentic loops plus a judge; a planner-executor is a loop wrapped around another
        loop. Reach for one of these once a single archetype from §6 genuinely isn't enough, not
        as a default starting point — each one adds real complexity (more calls, more places to
        debug, more cost) that has to be worth it.
      </p>

      <TileNav items={COMPLEX_AGENTS} />

      {COMPLEX_AGENTS.map((entry) => (
        <ArchetypeCard entry={entry} key={entry.id} />
      ))}

      <h2 id="tooling">8. The ML/AI software landscape</h2>
      <p>
        The patterns above describe how a system is wired; this is what it's actually built
        out of. Most real stacks combine several rows below — a RAG pipeline alone typically
        touches a model hub, a vector database, and an orchestration framework before it ever
        answers a question.
      </p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>What it does</th>
            <th>Examples</th>
          </tr>
        </thead>
        <tbody>
          {TOOLING.map((row) => (
            <tr key={row.category}>
              <td>
                <b>{row.category}</b>
              </td>
              <td>{row.does}</td>
              <td>{row.examples}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        This list is deliberately a landscape, not a directory — no pricing, versions, or
        endorsements, since those go stale fast and aren't the point here. For actively
        maintained, sourced entries with pricing and a verification date, see{" "}
        <a href="/models">the models &amp; tools directory</a>.
      </p>

      <h2 id="composed-prompts">9. Composed prompts: combining patterns for real work</h2>
      <p>
        Real tasks rarely use one pattern in isolation — a single request usually chains two or
        three together. Below: 48 prompts across ten categories, each naming the patterns from
        §6 and §7 it's built from, so you can trace exactly how they combine.
      </p>

      <h3>Complex design &amp; build tasks</h3>
      {COMPOSED_PROMPTS.design.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Daily / routine tasks</h3>
      {COMPOSED_PROMPTS.daily.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Research &amp; analysis tasks</h3>
      {COMPOSED_PROMPTS.research.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Incident &amp; ops tasks</h3>
      {COMPOSED_PROMPTS.ops.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Writing &amp; communication tasks</h3>
      {COMPOSED_PROMPTS.writing.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Learning &amp; onboarding tasks</h3>
      {COMPOSED_PROMPTS.learning.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Sales &amp; customer-facing tasks</h3>
      {COMPOSED_PROMPTS.sales.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Data &amp; analytics tasks</h3>
      {COMPOSED_PROMPTS.data.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Hiring &amp; people tasks</h3>
      {COMPOSED_PROMPTS.hiring.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Legal &amp; compliance tasks</h3>
      {COMPOSED_PROMPTS.legal.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h2 id="advanced-prompts">10. Advanced multi-stage prompts</h2>
      <p>
        The 48 prompts above chain two or three patterns for a task that's genuinely one request.
        The 90 below are heavier: each one combines three to five patterns because the underlying
        work actually needs that much orchestration — a multi-week migration, a board crisis, a
        deal that's stalled for reasons nobody's confirmed yet. Each is written as a short brief —
        role, situation, ordered phases, a constraint — rather than a single flowing ask, closer to
        how you'd actually hand this off to someone senior. 15 categories, 6 prompts each.
      </p>

      <h3>Complex engineering &amp; platform builds</h3>
      {ADVANCED_PROMPTS.engineering.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Enterprise sales &amp; GTM strategy</h3>
      {ADVANCED_PROMPTS.gtm.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Financial planning &amp; forecasting</h3>
      {ADVANCED_PROMPTS.finance.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Crisis &amp; incident command</h3>
      {ADVANCED_PROMPTS.crisis.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Product strategy &amp; roadmapping</h3>
      {ADVANCED_PROMPTS.product.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Executive &amp; board communication</h3>
      {ADVANCED_PROMPTS.exec.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>M&amp;A and corporate development</h3>
      {ADVANCED_PROMPTS.mna.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Regulatory &amp; compliance programs</h3>
      {ADVANCED_PROMPTS.compliance.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Talent &amp; org design</h3>
      {ADVANCED_PROMPTS.talent.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Customer success &amp; retention</h3>
      {ADVANCED_PROMPTS.cs.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Supply chain &amp; operations</h3>
      {ADVANCED_PROMPTS.supplychain.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Marketing &amp; brand strategy</h3>
      {ADVANCED_PROMPTS.marketing.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Data platform &amp; ML infrastructure</h3>
      {ADVANCED_PROMPTS.dataplatform.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Security &amp; risk programs</h3>
      {ADVANCED_PROMPTS.security.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}

      <h3>Strategic research &amp; competitive intelligence</h3>
      {ADVANCED_PROMPTS.intelligence.map((entry) => (
        <ComposedPromptCard entry={entry} key={entry.title} />
      ))}
    </ContentLayout>
  );
}
