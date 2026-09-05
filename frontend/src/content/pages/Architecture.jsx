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
  healthcare: [
    {
      title: "Retune a sepsis early-warning system without missing real cases",
      combines: ["rag", "tree-of-thought", "agent", "evaluator"],
      prompt: "The ICU's sepsis early-warning system fires roughly ninety alerts a day across four hundred beds, nurses have started silencing it within seconds out of habit, and the one true positive it caught last month arrived twenty minutes after a nurse had already muted it. First, pull six months of alert history against actual sepsis-onset outcomes and current staffing ratios per unit, since retuning the threshold blind, without knowing which alerts historically preceded a real deterioration, would just move the false-alarm problem rather than fix it. Branch into three retuning approaches — raising the vital-sign threshold uniformly, weighting the score by unit acuity so the ICU and the general ward alert differently, and adding a required trend-over-time component instead of a single-reading trigger — and work each against the actual six months of data rather than a theoretical sensitivity curve. Have an agent run each candidate threshold against every historical case that later developed sepsis, not just the alerts that fired, since the real risk here is a threshold that quiets the noise by also missing real deterioration. Grade the finalist against one number specifically: how many of the historical true positives it would have still caught, not just how much it cuts the daily alert volume, and refuse to ship a version that trades either away.",
    },
    {
      title: "Migrate 40 clinics off a legacy EHR without losing an active chart",
      combines: ["planner-executor", "workflow", "agent", "evaluator"],
      prompt: "Forty clinics need to move off the legacy EHR onto the new vendor platform before the old system's support contract lapses in five months, and clinic staff can't tolerate more than a two-hour scheduling blackout on migration day without patient safety risk from missed appointment reminders. Plan the migration as a fixed sequence — data-mapping validation, shadow-run in parallel with the old system, one-clinic pilot cutover, staged rollout by clinic size, legacy decommission — since getting this order wrong is what causes a mid-migration data gap, not any single step done poorly. Run the shadow-run and staged-rollout phases as a scripted pipeline rather than an open-ended agent loop, since the steps and validation checks at each clinic are already known and repeatable; reserve an agent specifically for the pilot clinic's cutover weekend, where unmapped legacy fields and real-time discrepancies actually need judgment rather than a fixed script. Before any clinic beyond the pilot goes live, evaluate patient-record parity between old and new systems on every active chart at that clinic, not a sample, and hold that clinic's cutover if even one active medication record doesn't reconcile. State explicitly, before rollout begins, what a same-day rollback looks like once a clinic is midway through cutover, since past migration day it stops being simple.",
    },
    {
      title: "Decide a prior-authorization appeal for a denied cancer drug",
      combines: ["debate", "rag", "evaluator", "chatbot"],
      prompt: "A patient's oncologist submitted a prior-authorization appeal for a drug the insurer's utilization-management team denied on cost grounds, the patient's next infusion window closes in eight days, and the reviewer assigned to the appeal has never handled this specific drug-diagnosis combination before. First, pull the denial letter, the original clinical documentation, and the published coverage policy the denial cites, since the appeal has to argue against the actual cited policy language, not a general sense that the drug seems reasonable. Argue the insurer's original cost-and-alternatives rationale against the physician's clinical-necessity case, weighing the specific published exceptions criteria in the policy against what the patient's chart actually documents about failed prior treatments, since a generic sympathy argument won't move a reviewer bound by the written criteria. Grade the resulting recommendation strictly against whether the chart's documented facts satisfy every listed exception criterion, not just most of them, since a partial match still gets denied on reappeal. Once the recommendation is a clear overturn, draft the notice to the patient's care team in plain, direct language a case manager can read over the phone today, since the eight-day window means the decision has to be usable immediately, not just correct on paper.",
    },
    {
      title: "Run ER incident command through a flu-season capacity surge",
      combines: ["agent", "goal-stack", "planner-executor", "evaluator"],
      prompt: "Three regional hospitals are simultaneously over capacity during the worst week of flu season, the ER's boarding count has hit double its normal ceiling, and staff are making ad hoc diversion calls with no shared view of which hospital actually has real capacity right now. Take command of a single ordered plan instead of letting each site manage diversion independently, and push the current highest-priority subgoal — get boarded patients placed somewhere safe within the hour — ahead of the slower work of fixing the intake process that let boarding build up in the first place, since those are not the same goal tonight. Keep the slower fixes on an explicit stack so they aren't lost once the immediate crunch eases — the interim diversion protocol itself becomes a subgoal to formalize properly once the surge passes. Have an agent continuously reconcile real-time bed availability across all three sites, since a diversion decision based on a status board that's twenty minutes stale is worse than no data at all. Before calling any site stable, evaluate whether its boarding count actually dropped below the safety threshold or just shifted onto ambulance hold times, since the second isn't actually resolution.",
    },
    {
      title: "Diagnose why a readmission-risk model quietly stopped being right",
      combines: ["agent", "rag", "tree-of-thought", "reflection"],
      prompt: "The readmission-risk model has been in production for two years, its flagged-patient list used to reliably predict who'd bounce back within thirty days, and for the last quarter its top-decile patients are readmitting at barely above the model's own baseline rate. First, have an agent pull the model's actual prediction history against real readmission outcomes over the last four quarters, since a feeling that it's less accurate needs to become a specific number before anyone can fix anything. Branch into three explanations — the patient population's underlying case mix shifted since training, a recent change in discharge-planning workflow altered the very outcome the model predicts, or a data pipeline upstream started silently dropping a feature the model relies on — and check each against the pulled history rather than guessing from the model card. Once the most likely cause is confirmed, propose the fix, then critique that diagnosis one more time against the full four quarters, specifically checking whether it explains the timing of when the drift actually started, not just the fact that it happened, since a fix aimed at the wrong start date will look like it worked and then quietly fail again next quarter.",
    },
    {
      title: "Resolve a tumor board's conflicting treatment recommendations",
      combines: ["multi-agent", "debate", "rag", "evaluator"],
      prompt: "A patient with three overlapping conditions has oncology recommending an aggressive chemo regimen, cardiology flagging real risk given her heart function, and palliative care raising whether the regimen's expected survival benefit is worth what it would cost her quality of life in the time she has left, and the tumor board meets in two hours. First, dispatch one pass per specialty to pull that specialty's actual relevant data on this patient — tumor staging and response likelihood, cardiac ejection fraction and treatment tolerance, and the patient's own documented goals-of-care conversation — rather than each specialist arguing from general clinical judgment alone. Debate the aggressive-regimen case against the reduced-intensity alternative directly on this patient's specific numbers, not on which specialty typically carries more weight in the room, since a genuinely borderline cardiac tolerance changes the calculus in a way a generic risk table won't capture. Synthesize the debate into one recommendation, then grade it explicitly against the patient's own stated goals-of-care documentation, and flag plainly if the medically optimal option and the patient's actual stated preference point in different directions, since that gap is the board's decision to make, not something to paper over.",
    },
  ],
  education: [
    {
      title: "Investigate a suspected wave of AI-written essays without false-accusing honest students",
      combines: ["agent", "rag", "ensemble", "evaluator"],
      prompt: "Forty of the two hundred essays submitted in an intro composition course read like they could be AI-generated, the professor doesn't want to accuse anyone on vibes alone, and a wrongful accusation at this university triggers a formal academic-integrity hearing that follows a student's record for years. First, have an agent pull each flagged student's earlier submitted writing from the same semester as a baseline, since a stylistic shift only means something in the context of how that specific student actually writes, not against a generic detector score. Run the comparison against each student's own baseline three separate times with slightly different framing, and keep only the students where all three runs agree the shift is real and substantial, treating any run that disagrees with itself as insufficient grounds on its own. Pull the assignment's actual prompt and rubric to separate a genuine authorship shift from a student who just followed unusually detailed feedback from office hours, since the second looks similar to a detector flag but isn't misconduct. Grade the final shortlist against one bar only — would this hold up read aloud to the student directly, with specifics, not just a probability score — and drop anyone who doesn't clear it before this goes anywhere near a hearing.",
    },
    {
      title: "Build individualized remediation plans after a district-wide math-test collapse",
      combines: ["router", "planner-executor", "memory-agent", "evaluator"],
      prompt: "State math scores came back and sixty percent of the district's eighth graders failed, but \"failed\" is masking at least three distinct problems — some students never grasped fractions in sixth grade, some can compute but freeze on word problems, and some simply stopped attending regularly during the testing unit — and the district has eight weeks before the next assessment window. First, classify every failing student by their actual specific gap using their item-level test breakdown, not just their overall score, since a fractions intervention wasted on a word-problem student burns time neither group has to spare. Plan each gap-group's eight-week intervention as its own sequence, ordered so the most foundational skills get reinforced before anything that depends on them, since stacking word-problem practice on an unresolved fractions gap just compounds the original failure. Track each student's specific documented gap and what's already been tried across the eight weeks so week six's tutor isn't repeating week two's failed approach without knowing it happened. Grade the finished plan against actual practice-assessment results at the midpoint, not attendance or effort, and reroute any student whose specific gap turns out to have been misclassified.",
    },
    {
      title: "Settle a school board fight over adopting a new reading curriculum",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The school board is split down the middle between keeping the phonics-heavy curriculum adopted three years ago and switching to a newer balanced-literacy program a neighboring district just adopted, and the vote is in two weeks with both camps citing studies the other side disputes. First, pull this district's own three years of reading-assessment data broken out by the specific skills each curriculum claims to prioritize, since a study from a different district's population doesn't settle what's actually happening with these specific students. Sketch what continuing the current curriculum with added intervention support would look like against what a full switch would look like in year one, since a switch carries its own transition cost that the comparison studies don't capture. Argue the case for staying the course against the case for switching, using this district's actual three-year trend as the deciding evidence rather than either side's cited external research, and be explicit about what specifically in the data supports each side rather than restating position. Grade the recommendation against the one metric the board actually has authority to act on — reading proficiency by grade three — and state plainly whether either path is likely to move that number meaningfully within one budget cycle, not just eventually.",
    },
    {
      title: "Redesign financial aid before a demographic enrollment cliff hits",
      combines: ["tree-of-thought", "planner-executor", "rag", "evaluator"],
      prompt: "The university's incoming class next fall is projected against a well-documented national decline in the college-age population, financial aid has been drawing down the endowment's discretionary fund for three straight years to hit enrollment targets, and the board wants a plan that doesn't just keep discounting harder until the fund runs dry. First, pull the actual three years of aid-award data against yield rate and the discretionary fund's real remaining runway, since a plan built on hoped-for yield improvement rather than what's actually happened three years running will just repeat the same drawdown. Sketch three paths — hold the discount rate flat and accept a smaller incoming class, shift aid dollars toward the specific applicant segments that have shown the best yield response historically, or reduce the number of low-yield-probability offers sent at all — and sequence whichever path is chosen into concrete admissions-cycle deadlines, since aid strategy decided after early-decision offers go out is too late to matter for this cycle. Grade the chosen path against the discretionary fund's actual runway under a conservative yield assumption, not the optimistic one that got the fund into this position, and flag explicitly if even the conservative path still draws the fund down further.",
    },
    {
      title: "Roll out an AI tutoring platform without breaking veteran teachers' lesson plans",
      combines: ["planner-executor", "debate", "memory-agent", "evaluator"],
      prompt: "The district wants to roll out an AI tutoring add-on across every middle school math classroom starting next semester, it visibly helps students who are behind grade level, and the district's most effective veteran teachers have built their entire lesson pacing around a specific in-class review routine the tool would displace if turned on by default. First, recall what happened the last time the district pushed a classroom tool district-wide without an opt-in period — the specific complaints, which teachers disengaged, and how long the rollout actually took to stick — rather than treating this as a fresh rollout with no relevant history. Argue for a hard district-wide default-on against an opt-in period for veteran teachers specifically, weighing how much faster the strugglers benefit against the real risk of the district's best teachers quietly working around the tool rather than adapting to it. Plan the rollout in phases — opt-in for any teacher who wants it now, default-on for new and non-tenured teachers next term, full rollout the term after — and grade the plan specifically against whether it protects the veteran teachers' actual outcomes data, not just overall district usage numbers that could mask them disengaging.",
    },
    {
      title: "Coordinate a district's response to a leaked student-records breach",
      combines: ["multi-agent", "planner-executor", "rag", "evaluator"],
      prompt: "A vendor's misconfigured file share exposed a spreadsheet with several hundred students' names, grades, and disciplinary records for an unknown period before a parent found it and called the superintendent directly, and FERPA's notification obligations, the vendor contract's liability terms, and parent communication all need to move without anyone accidentally confirming more than what's actually verified. First, pull the vendor's access logs and the file share's configuration history to establish what was actually exposed and to whom, since the notification scope and legal obligation both hinge on facts nobody has confirmed yet. Plan the response as an ordered sequence — contain the exposure, confirm exact scope, determine FERPA notification requirements specifically, then parent communication — since a parent letter that goes out before scope is confirmed risks either under- or over-stating what happened, and either mistake here erodes trust for years, not weeks. Dispatch a legal workstream and a comms workstream in parallel once containment and scope are confirmed, and grade the drafted parent notification against the confirmed facts only, flagging anything that speculates about what the vendor might have also exposed beyond what the logs actually show.",
    },
  ],
  logistics: [
    {
      title: "Reroute a global network around a blocked shipping chokepoint",
      combines: ["multi-agent", "planner-executor", "tree-of-thought", "evaluator"],
      prompt: "A major shipping chokepoint just closed with no announced reopening date, roughly three thousand containers are now stuck or need rerouting, and every day of delay costs specific customers with contractual delivery windows real penalty exposure. First, dispatch a regional pass per affected trade lane — Asia-to-Europe, Asia-to-US-West, and the intra-Asia feeder routes — to independently assess what's actually stuck versus reroutable for that lane specifically, since a single global reroute plan would waste time reconciling constraints that don't actually interact across lanes. Within the highest-penalty-exposure lane, sketch three reroute options — the longer alternate sea route, a rail-plus-truck combination, and splitting the highest-value containers onto air freight at a steep cost premium — and sequence the decision so the plan for the worst-exposed lane locks in first, since capacity on the alternate routes is itself limited and lanes that decide late get whatever's left. Grade the combined plan against the actual named customer contracts with delivery penalties, not average transit time improvement, and flag explicitly which specific customers still miss their window even under the best available reroute, so account teams can get ahead of those calls today.",
    },
    {
      title: "Triage fifteen thousand daily shipment exceptions during peak season",
      combines: ["router", "workflow", "agent", "evaluator"],
      prompt: "Peak season is generating around fifteen thousand shipment exceptions a day network-wide, the exception queue used to be handled by a small team eyeballing each one, and that team is now three weeks behind with holiday delivery promises on the line. First, classify every incoming exception into one of four categories — weather delay, customs hold, warehouse mis-pick, and address-correction needed — since each category has a completely different resolution path and lumping them into one undifferentiated queue is exactly what created the three-week backlog. Run the weather-delay and address-correction categories through a fixed pipeline that resolves the routine cases automatically, since those two categories are high-volume and well-understood enough that a scripted resolution beats a person re-deciding the same thing fifteen thousand times a day. Reserve an agent specifically for the customs-hold category, since that one genuinely varies enough — different countries, different documentation gaps — to need real judgment rather than a fixed script. Evaluate the whole system weekly against how many exceptions actually clear within the promised delivery window, not queue-clearance speed alone, since clearing an exception a day after the promised delivery date isn't actually a win.",
    },
    {
      title: "Diagnose a warehouse robot fleet's intermittent picking failures",
      combines: ["agent", "tree-of-thought", "ensemble", "reflection"],
      prompt: "The automated picking fleet at the regional distribution center has started dropping roughly two percent of picks into the wrong tote, always intermittently, and the error rate is just high enough to trigger customer complaints but low enough that engineering can't reproduce it on demand in the test bay. First, have an agent pull three weeks of pick logs to characterize exactly when the errors cluster — by shift, by specific robot unit, by SKU size, or by warehouse zone — since a vague sense that it's flaky and a finding that it fails specifically on units 4 and 7 during the overnight shift call for completely different fixes. Branch into three hypotheses — a sensor calibration drift specific to certain units, a shared-shelf congestion issue that only shows up at overnight pick density, and a firmware timing bug under high-throughput conditions — and check each against the actual log clustering rather than the most likely-sounding story. Apply the fix indicated by whichever hypothesis the logs actually support, then critique the diagnosis by rerunning the same three-week log analysis against the two weeks following the fix, and say plainly if the error rate didn't drop to near zero rather than calling a partial improvement a resolution.",
    },
    {
      title: "Rebuild a last-mile network after losing a regional carrier overnight",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "The regional last-mile carrier handling forty percent of rural delivery volume in one distribution zone just gave sixty days' notice they're exiting the market entirely, and there's no existing backup contract in place for that zone. First, pull the actual delivery-density data and current service-level performance for that zone, since a replacement plan built on assumed rural delivery economics rather than this zone's real density and cost-per-stop will misprice the transition badly. Sketch three replacement paths — onboarding a second regional carrier at a higher per-stop cost, absorbing the zone into the company's own delivery fleet at a large capital cost, and temporarily degrading the delivery-window promise in that zone while a longer-term solution gets built — and argue the fast-but-expensive path against the slower-but-cheaper path specifically on what sixty days actually allows, since some of these options simply can't be operational in time regardless of which is cheaper long-term. Grade the chosen path against the sixty-day deadline as a hard constraint first, cost second, and flag explicitly if the preferred option can't realistically be live before the current carrier's exit date, since a good plan that isn't ready in time isn't actually the plan.",
    },
    {
      title: "Hold a distribution network together through a multi-region winter storm",
      combines: ["swarm", "agent", "tree-of-thought", "evaluator"],
      prompt: "A multi-state winter storm is hitting six regional distribution centers differently — two are fully snowed in, two have partial road access, and two are operational but receiving rerouted volume from the closed ones — and routing every decision through one central dispatcher is already causing hour-long delays on calls that need to happen in minutes. Rather than centralizing every rerouting decision, let each distribution center's local dispatcher work its own capacity and access constraints independently against a shared real-time volume board everyone reads and writes to, so a decision at one center isn't blocked waiting on a call that has nothing to do with it. For the two centers absorbing rerouted volume specifically, since their capacity constraint is the least predictable one right now, branch into two plans — temporary overflow staffing versus selectively delaying the lowest-priority shipment classes — and pursue whichever the center's actual incoming volume trend supports rather than guessing from this morning's numbers. Before declaring any center stable, evaluate it against its own backlog specifically, since the storm having passed for one center's roads doesn't mean the volume it absorbed from a closed center has actually cleared yet.",
    },
    {
      title: "Roll out warehouse automation without breaking the floor's fastest pickers",
      combines: ["planner-executor", "debate", "memory-agent", "evaluator"],
      prompt: "The new automated sortation system cuts pick-to-pack time by nearly a third for most of the floor, but the facility's fastest manual pickers — the ones who've built up their own shortcut routes over years and consistently beat the system's suggested paths — are the ones most disrupted by being forced onto the automated routing. First, recall what happened during the last major floor-process change at this facility, specifically which workers pushed back, what the actual productivity dip looked like in the first month, and whether it ever fully recovered, rather than assuming this rollout starts from a blank slate. Argue for switching every picker onto the automated routing immediately against letting the top performers keep working their own routes for a transition period, weighing the near-term throughput cost of losing the top performers' efficiency against the risk of the automation looking worse than manual in month one specifically because of that carve-out. Plan the rollout in phases — automation on for average and below-average performers first, a defined evaluation period for whether the top performers' manual routes actually still beat the system, full rollout only if they don't — and grade the plan against whether it would have protected this facility's top performers' actual output the last time a change like this happened.",
    },
  ],
  energy: [
    {
      title: "Manage rolling blackouts across a grid during a record heatwave",
      combines: ["swarm", "agent", "tree-of-thought", "evaluator"],
      prompt: "A record heatwave has pushed grid demand to an all-time peak across a service territory covering four interconnected regions, two of which are already load-shedding on rolling schedules while the other two still have headroom, and coordinating every shed-versus-hold decision through one control room has started lagging real conditions by critical minutes. Rather than centralizing every decision, let each region's grid operator manage its own load-shedding schedule independently against a shared real-time capacity board the other three regions can see and react to, so a region with headroom can offer emergency transfer capacity the moment it's available rather than waiting for a central call. For the two regions already shedding, branch into two mitigations — extending rolling-outage windows to spread the pain more predictably versus requesting emergency transfer from the two regions with headroom — and pursue whichever the actual transfer-capacity numbers support in the moment, not a plan drawn up before the peak hit. Before any region declares itself stable, evaluate it against its own specific demand forecast for the next four hours, not current conditions alone, since the heatwave's peak may not have arrived in every region yet even where load has stopped climbing.",
    },
    {
      title: "Stress-test a renewable-plus-storage integration plan against grid stability",
      combines: ["tree-of-thought", "rag", "ensemble", "evaluator"],
      prompt: "The utility wants to add six hundred megawatts of wind and solar plus battery storage to a grid that's historically run on dispatchable gas and coal, and the grid operations team is split on whether the storage capacity in the current proposal is actually enough to smooth the renewable output's variability or just enough to look adequate on paper. First, pull the actual historical output-variability data for wind and solar in this specific region, since a storage sizing based on generic renewable-integration studies from a different climate and grid topology won't reflect what actually happens here on a low-wind cloudy week. Sketch two storage configurations — the proposal's current sizing and a materially larger one — and run each against three different historical worst-week variability profiles independently, keeping only the configuration that holds up consistently across all three rather than looking merely adequate against a single cherry-picked week. Grade the chosen configuration against the single worst week in the historical data, not the average week, and state plainly whether the grid would have needed emergency dispatchable backup under that specific week even with the proposed storage in place.",
    },
    {
      title: "Build a winter hedging strategy for a volatile energy-trading desk",
      combines: ["rag", "ensemble", "debate", "evaluator"],
      prompt: "The trading desk needs a winter hedging position locked in within the week, natural gas prices have been unusually volatile the last two months, and the desk is split between a physical forward-contract hedge and a financial-derivatives-only position that's cheaper to unwind if the winter turns out mild. First, pull the desk's actual historical exposure and settlement data from the last three volatile winters, since a hedge sized on this year's forecast alone, without checking how badly past forecasts missed in similar volatility conditions, is how a supposedly-hedged desk still gets burned. Generate the recommended hedge ratio three separate times using slightly different weightings of historical volatility versus current forward-curve pricing, and treat a ratio that swings widely across the three runs as a sign the position is more uncertain than a single confident number would suggest. Argue the physical-forward case for certainty of supply against the financial-derivatives case for flexibility if the winter turns out mild, using the desk's actual unwind-cost history from the last time a hedge had to be reversed mid-season. Grade the final position against the single worst-case cold snap in the historical data, not the base-case forecast, before it's locked in.",
    },
    {
      title: "Investigate a power plant's intermittent control-system anomaly before restart",
      combines: ["agent", "tree-of-thought", "debate", "evaluator"],
      prompt: "A power plant's control-system logs are showing an intermittent anomaly in the turbine governor readings, the plant is currently offline for the investigation, and every hour it stays down costs real capacity payments while every hour spent over-investigating a benign glitch delays getting a needed generator back on the grid during a tight-supply week. First, have an agent pull the full control-system log history around every prior occurrence of this anomaly signature, since a genuinely new failure mode and a known, already-characterized sensor quirk call for completely different urgency. Branch into two explanations — a real developing mechanical issue in the governor itself, or a known sensor-calibration drift that's cosmetic and has occurred before without incident — and check the current readings against the specific signature of each from the historical log data rather than treating this as an unprecedented event. Argue for an immediate cautious restart under close monitoring against holding the plant offline for a full physical inspection first, using the specific evidence for which explanation the logs actually support, not a blanket safety-first default that ignores what the data shows. Grade the final call against the plant's own safety protocol thresholds explicitly, and never let restart pressure from the tight-supply week override a genuine safety flag.",
    },
    {
      title: "Roll out smart meters without breaking legacy commercial billing",
      combines: ["planner-executor", "tree-of-thought", "memory-agent", "evaluator"],
      prompt: "The utility's smart-meter rollout covers the whole service territory over eighteen months, and a legacy segment of about four thousand commercial customers is still on a decades-old demand-based billing structure that the new meters' default interval-billing format would silently break the moment it flips on. First, recall exactly what happened during the utility's last billing-system change affecting a legacy customer segment — the specific complaint volume, how long it took support to stabilize, and which accounts churned to a competitor supplier where that's an option — rather than assuming this rollout is unprecedented. Sketch two transition paths — migrating the legacy segment onto the new billing format on the same rollout schedule as everyone else, or holding that segment on its current structure until a purpose-built transition plan exists — and weigh rollout-schedule simplicity against the real risk of a billing-shock complaint spike hitting the utility's largest commercial accounts specifically. Plan the rollout in phases — new meters install everywhere on schedule, but the legacy segment's billing format switches only after its own dedicated transition communication and a bill-comparison period — and grade the plan against whether it would have prevented the specific complaint pattern from the last change, not just against overall rollout velocity.",
    },
    {
      title: "Contain a cascading transmission failure across three interconnected utilities",
      combines: ["agent", "goal-stack", "planner-executor", "evaluator"],
      prompt: "A transmission line failure has cascaded across three interconnected utilities' shared grid, two of the three have already had automatic protective systems isolate sections of their network, and it's still unclear whether the cascade is fully contained or whether isolating further sections is about to be necessary. Plan the response in strict order — confirm the cascade has stopped spreading, then identify the originating fault, then plan restoration sequencing across all three utilities, then run the joint post-event review — since restoring power in one utility's isolated section before confirming the original fault is actually cleared risks re-triggering the same protective cascade. Keep containment confirmation, root-cause identification, and restoration as separate items on a shared goal stack across all three utilities' operations centers, so no utility starts its own restoration before the joint containment confirmation clears, since an uncoordinated restoration is exactly the failure mode that turns a contained event into a second cascade. Have an agent continuously reconcile real-time load and frequency data across all three utilities' networks, since restoration sequencing decided on data that's even a few minutes stale risks overloading a section that looks clear but isn't. Before declaring the event over, evaluate explicitly whether the originating fault is actually repaired, not just whether the cascade has stopped.",
    },
  ],
  media: [
    {
      title: "Write a moderation policy for a harmful-content pattern spreading faster than review capacity",
      combines: ["debate", "tree-of-thought", "ensemble", "evaluator"],
      prompt: "A new manipulated-video format is spreading across the platform faster than the existing moderation policy categories cover, review queues are already three days behind on flagged instances, and two policy teams disagree on whether this should be handled under the existing synthetic-media policy or needs its own new category with a lower removal bar. First, sketch three policy framings — extend the existing synthetic-media policy's removal criteria to explicitly cover this pattern, write a narrow new category with a stricter and faster-acting removal bar, or handle it case-by-case under general harm policy until a clearer pattern of actual harm emerges — since choosing wrong here either under-covers real harm or over-removes borderline content that shouldn't qualify. Debate the case for the stricter fast-acting new category against the case for extending the existing policy, weighing moderator training time to implement each against how much real harm accumulates during whichever ramp-up period is required. Draft the finalized policy language independently three separate times, keeping only the version that produces the same removal decision on the same five test examples every time, since a policy that yields inconsistent moderator decisions on the same content is a policy that isn't actually specific enough yet. Grade the final language against the three-day backlog specifically, and confirm it would resolve most of the backlogged cases unambiguously, not just the clearest ones.",
    },
    {
      title: "Fact-check a breaking story against conflicting eyewitness accounts before deadline",
      combines: ["agent", "rag", "tree-of-thought", "reflection"],
      prompt: "Three eyewitnesses are giving meaningfully different accounts of how a public incident unfolded, two wire services have already published conflicting early details, and the newsroom's own deadline is ninety minutes away with the story leading tonight's coverage either way. First, have an agent pull every available primary source — the eyewitness statements in full rather than the summarized quotes already circulating, any available timestamped media, and the two wire services' sourcing notes — since deciding which account to lead with based on secondhand summaries risks repeating whichever error is already spreading fastest. Branch into the three possible sequences of events the conflicting accounts imply, and check each against whatever timestamped or geolocatable evidence actually exists, ruling out whichever sequence the physical evidence contradicts rather than picking the account from the most credentialed-sounding source. Where more than one sequence remains genuinely unresolved with ninety minutes left, write the story to state plainly what's confirmed and what's still disputed, rather than picking one contested account and presenting it as settled. Critique the draft one more time against one standard before it publishes — does every specific claim in it trace to a source the story could actually name if challenged.",
    },
    {
      title: "Diagnose why a recommendation-algorithm update cratered engagement",
      combines: ["agent", "rag", "ensemble", "evaluator"],
      prompt: "Average session watch time dropped nine percent within a week of a recommendation-algorithm update meant to improve content diversity, and it's unclear whether the update is working as intended and just needs time to build habit, or whether it broke something the previous version was doing right. First, have an agent pull the actual engagement funnel broken out by user segment and content category, since a headline drop in watch time could mean the update hurt everyone equally or badly hurt one specific segment while barely touching the rest, and the fix differs completely depending on which. Generate the most likely explanation for the drop independently three separate times from the same funnel data, and keep only the explanation that comes out consistently across all three runs rather than trusting whichever story sounds most plausible on a single pass, since a genuine root cause should hold up under repeated independent analysis of the same data. Once the consistent explanation is identified, grade it against the update's original stated goal specifically — did diversity actually improve even as watch time dropped, which would argue for patience, or did diversity not improve either, which would argue for reverting — and recommend one path, not both, to the product team before the next release cycle locks in.",
    },
    {
      title: "Negotiate a content-licensing deal against an aggregator's take-it-or-leave-it offer",
      combines: ["tree-of-thought", "debate", "rag", "reflection"],
      prompt: "A major content aggregator that drives a meaningful share of referral traffic just presented a take-it-or-leave-it licensing rate that's forty percent below the publisher's current internal valuation of that traffic, with a decision needed before the aggregator's stated deadline in ten days. First, pull the publisher's actual referral-traffic data from that aggregator specifically — volume, conversion to subscription, and the trend over the last year — since arguing from a general sense that the traffic is valuable won't hold up against the aggregator's own data-backed lowball. Sketch three responses — accept the reduced rate to preserve the relationship, walk away and absorb the traffic loss, or counter with a narrower licensing scope that protects the highest-value content categories at a better rate — and argue the walk-away case against the accept case using the actual traffic-value data specifically, since this decision shouldn't turn on relationship goodwill when real revenue is at stake. Critique the recommended path one more time against the specific ten-day deadline and the publisher's actual dependency on that traffic source for current-quarter subscription targets, and flag plainly if walking away would blow through a target that leadership hasn't yet been told is at risk.",
    },
    {
      title: "Coordinate live multi-desk coverage of a fast-unfolding breaking story",
      combines: ["multi-agent", "router", "planner-executor", "evaluator"],
      prompt: "A major event is unfolding in real time, incoming tips and source material are arriving faster than one editor can triage, and text, video, and social desks each need different material from the same raw incoming stream without duplicating each other's verification work. First, classify every incoming tip or source as it arrives into breaking-fact, context-background, or unverified-rumor, since routing an unverified rumor to the social desk with the same urgency as a confirmed fact is exactly the kind of mistake that becomes its own story. Dispatch the confirmed breaking-facts stream to all three desks simultaneously so none waits on the others, while routing the unverified-rumor stream to a single verification pass first, and sequence social-desk publishing specifically to lag text by whatever the verification pass actually needs, since social is the desk with the least natural friction before something goes out. Before any desk publishes a new development, evaluate it against whether the confirming source is actually independent of the source that first reported it, not just a second outlet repeating the same original claim, since two restatements of one unverified tip isn't confirmation.",
    },
    {
      title: "Rebuild an editorial copy pipeline that drifted toward clickbait",
      combines: ["workflow", "copilot", "reflection", "evaluator"],
      prompt: "The AI-assisted headline and copy-editing pipeline that speeds up the newsroom's daily volume has, over several months of small individually-reasonable tweaks, drifted toward headlines that read noticeably closer to clickbait than the editorial standards actually allow, and nobody signed off on that drift explicitly. Run the headline-generation step as a fixed pipeline stage rather than an open-ended agent, since the sequence — draft headline, check against style guide, human editor review — is already well understood and the goal here is predictability, not more autonomy. Keep every suggested headline as a draft an editor reviews and explicitly approves before it publishes, the same as any other copilot suggestion, since the drift happened specifically because small headline tweaks started feeling too routine to warrant a real second look. Critique the pipeline's own recent output against the actual written editorial standards document, headline by headline over the last month, and name specifically which phrasing patterns crept in that the standards would have flagged had anyone checked. Grade the proposed fix against whether it would have caught every one of those specific drifted headlines, not just the most obvious ones, before it goes back into daily use.",
    },
  ],
  publicsector: [
    {
      title: "Triage an unemployment-claims backlog after a surge without gutting fraud controls",
      combines: ["router", "workflow", "agent", "evaluator"],
      prompt: "Unemployment claims tripled within three weeks of a regional plant closure, the agency's caseworker team can process maybe a third of that volume at normal quality, and the state's fraud-control unit is worried that speeding up processing to clear the backlog will also wave through the fraudulent claims that normally get caught by careful review. First, classify every incoming claim by risk signal — clear-cut claims matching the plant closure's known layoff list, claims with fraud-risk indicators like new bank accounts or mismatched employment history, and everything in between — since treating all three the same either slows down the obviously legitimate claims or waves through the risky ones. Run the clear-cut category through a fixed fast-track pipeline that verifies against the layoff list and pays out quickly, since that category is high-volume and well-understood enough for a scripted process rather than full manual review. Reserve an agent for the fraud-risk category specifically, since those claims genuinely vary enough to need real investigation rather than a script. Evaluate the whole system weekly against both numbers that matter — average days to payment for the clear-cut category and the fraud unit's confirmed catch rate on the flagged category — and treat improving one at the expense of the other as a failure, not a tradeoff to accept quietly.",
    },
    {
      title: "Settle a contested rezoning fight between two irreconcilable constituencies",
      combines: ["debate", "tree-of-thought", "multi-agent", "evaluator"],
      prompt: "A proposed rezoning would let a stalled lot become mixed-income housing, longtime residents are showing up to every hearing citing traffic and neighborhood-character concerns, the developer says the project doesn't pencil out without the requested density, and the council vote is in three weeks. First, dispatch separate research passes to pull the actual traffic-study data, comparable density projects' outcomes in similar neighborhoods, and the developer's stated financial threshold, since the hearing has mostly generated positions, not the underlying facts either side's position depends on. Sketch what approval at the requested density looks like against a reduced-density compromise the residents' association has floated, and argue the full-density case for genuinely solving the area's housing shortage against the reduced-density case for addressing the traffic concern directly, using the actual traffic-study numbers rather than the loudest anecdote from the hearing. Grade the resulting recommendation against the developer's stated financial threshold explicitly, since a compromise that satisfies residents but doesn't pencil out for the developer isn't actually a viable path, and state plainly whether the reduced-density option clears that threshold or not before the council votes on something that might not be buildable.",
    },
    {
      title: "Migrate a mainframe benefits-eligibility system without dropping an active claim",
      combines: ["planner-executor", "workflow", "agent", "evaluator"],
      prompt: "The decades-old mainframe system determining eligibility for a major public-benefits program needs to move to a modern platform before the vendor's maintenance contract lapses in six months, and a single day of downtime during the transition would delay benefit payments to families who depend on them arriving on a fixed schedule. Plan the migration as a fixed sequence — parallel-run the new system against the mainframe's actual eligibility determinations without it making any live decisions yet, validate discrepancies, migrate one benefit category at a time starting with the simplest eligibility rules, then decommission the mainframe category by category — since attempting all benefit categories at once is exactly the kind of big-bang cutover that has failed at other agencies attempting this same migration. Run the parallel-validation and staged-cutover phases as a scripted pipeline, since the steps are already known and repeatable across categories, and reserve an agent specifically for reconciling discrepancies between old and new eligibility determinations, since that's the step requiring real judgment about whether a mismatch is a bug or a legitimate rule difference. Before any category goes fully live on the new system, evaluate every active case in that category for eligibility-determination parity, not a sample, and hold the cutover if even one active case's benefit amount would change unexpectedly.",
    },
    {
      title: "Clear a public-records backlog through a legacy case system with no API",
      combines: ["agent", "computer-use", "workflow", "evaluator"],
      prompt: "The agency's public-records office has a backlog of over two thousand pending requests, and the only system holding the source documents is a decades-old case-management application with no API, accessible only through its original desktop interface. First, have an agent classify the backlog by request complexity — straightforward single-document requests, requests spanning multiple case files, and requests likely to require a legal exemption review — since routing all of them through the same manual process is part of why the backlog reached two thousand. For the straightforward category specifically, since the legacy system exposes no API, drive the desktop application's own interface directly — searching the case index, opening each matching record, and staging it for release — the same way a records clerk would, rather than waiting on an IT modernization project with no committed timeline. Run that retrieval-and-staging step as a repeatable pipeline once the pattern is confirmed reliable across a test batch, since the steps involved are the same for every straightforward request. Evaluate every staged release against the applicable exemption rules before anything actually goes out the door, and never let backlog-clearance speed override a legitimate exemption that the fast-track process might otherwise skip checking.",
    },
    {
      title: "Coordinate a multi-county wildfire evacuation with no single incident commander",
      combines: ["swarm", "agent", "planner-executor", "evaluator"],
      prompt: "A fast-moving wildfire is threatening five counties simultaneously, each with its own emergency management office, its own evacuation-zone boundaries, and its own road-capacity constraints, and no single state-level authority can approve evacuation-order changes fast enough to keep up with a fire moving this quickly. Rather than routing every evacuation-zone decision through one state coordinator, let each county's emergency manager issue and adjust its own evacuation orders independently against a shared real-time fire-perimeter and road-capacity map every county can see, so a county whose access road is filling up can redirect residents to a neighboring county's shelter without waiting on state sign-off. Have an agent continuously update the shared fire-perimeter data from live tracking feeds, since a county planning its evacuation zones against even a thirty-minute-old perimeter risks drawing the boundary in the wrong place entirely. Within any single county, plan its own evacuation as an ordered sequence — highest-risk zones first, then adjacent zones, then shelter-in-place guidance for zones outside the current threat — since evacuating in the wrong order creates the exact road congestion that traps the highest-risk residents behind slower-moving traffic. Before any county stands down its evacuation order, evaluate its own zone specifically against the current fire perimeter, not the perimeter from when the order was issued.",
    },
    {
      title: "Reconcile a grant program's reported outcomes against what was actually spent",
      combines: ["agent", "rag", "debate", "evaluator"],
      prompt: "A state legislative audit is questioning whether a workforce-training grant program's reported job-placement outcomes actually match what the money was spent on, three years of grantee reports claim placement numbers that look unusually strong compared to similar programs elsewhere, and the agency needs a real answer before the audit hearing, not a defense of the reported numbers as-is. First, have an agent pull the actual underlying placement records each grantee submitted as backup for their reported numbers, rather than working from the summary totals in the annual reports, since summary totals are exactly where an inflated number would get smoothed into looking plausible. Argue the case that the grantees are genuinely outperforming comparable programs due to a real design advantage against the case that the reported placement definition is being applied more loosely than in comparable programs, counting things like short-term or unrelated employment as a placement, using the actual backup records for a sample of grantees as the deciding evidence rather than assuming good faith or bad faith by default. Grade the finding against the audit's specific question — do the numbers hold up under the same placement definition comparable programs use — and state plainly which grantees' numbers do and don't hold up, not a single blended answer that obscures which specific ones are the actual problem.",
    },
  ],
  manufacturing: [
    {
      title: "Diagnose an intermittent defect crossing three production lines",
      combines: ["agent", "tree-of-thought", "ensemble", "evaluator"],
      prompt: "A specific weld joint has started failing final inspection at just under two percent across three production lines that share the same weld-cell design, the failure rate is high enough to matter at this plant's volume but too low to reproduce reliably in an isolated test, and the plant manager needs an answer before the next shift's output ships. First, have an agent pull three weeks of inspection data broken out by line, shift, and the specific weld-cell's calibration log, since a genuinely shared root cause and three lines coincidentally drifting independently would call for very different fixes. Branch into three hypotheses — a shared consumable-material batch used across all three lines, a shared calibration drift in the weld-cell's control software common to all three, and three independent local causes that happen to produce a similar-looking failure — and check each against the actual clustering in the pulled data rather than assuming a shared cause because the lines share equipment. Once the data points clearly to one hypothesis, apply the fix, then verify it by rerunning inspection on the next full shift's output across all three lines rather than one, since a fix confirmed on only the line that reported the problem first risks missing that another line's contribution to the failure rate was never actually addressed. Grade the fix against the full two-percent baseline, not just whichever line looked most improved.",
    },
    {
      title: "Roll out predictive maintenance without losing what veteran technicians catch by hand",
      combines: ["workflow", "debate", "memory-agent", "evaluator"],
      prompt: "The plant is rolling out a predictive-maintenance system across forty machines that flags likely failures before they happen, and the maintenance floor's most experienced technicians — the ones whose manual inspection routine has caught real problems the system's own pilot run missed twice — are the ones most skeptical of trusting an alert over their own judgment. First, recall what's on record from the pilot specifically, including both times the technicians' manual inspection caught something the system missed, rather than treating the system's overall pilot accuracy numbers as the whole story. Argue for making the system's alerts the primary trigger for maintenance work orders against keeping the technicians' manual rounds as the primary check with the system as a supplementary signal, weighing the system's genuine speed and consistency advantage against the two specific documented misses that a purely alert-driven process would have let through. Run the rollout as a fixed staged sequence — system alerts run alongside manual rounds with no behavior change for the first month, technicians' overrides tracked and reviewed, full transition to alert-primary only for machine categories where the system's accuracy proves out — and grade the plan specifically against whether it would have caught both of the pilot's documented misses, not just against the system's aggregate false-negative rate.",
    },
    {
      title: "Reroute three plants around a single-source component shutdown",
      combines: ["swarm", "agent", "debate", "evaluator"],
      prompt: "A single-source supplier of a critical fastener component has shut down unexpectedly with no restart date, three plants depend on that exact component for different product lines, and coordinating every plant's sourcing decision through one central procurement team is already taking too long given each plant's on-hand inventory is depleting at a different rate. Rather than centralizing the sourcing decision, let each plant's local procurement lead work its own qualified-alternate-supplier search independently against a shared inventory-depletion board all three plants can see, so a plant with only three days of stock left isn't waiting on a plant with three weeks of buffer to finish its own evaluation first. For the plant with the shortest runway specifically, argue for qualifying a new supplier's component on an expedited basis with reduced testing against temporarily substituting a slightly different fastener spec that requires an engineering sign-off, weighing which option that plant's actual remaining runway realistically allows time for, since the expedited-qualification path may simply not finish before that plant runs out regardless of which option is technically better. Before any plant declares itself resupplied, evaluate its new source against the full original spec, not just the property that caused the immediate shortage, since a fastener that's fine on tensile strength but wrong on corrosion resistance is still the wrong part for some of these product lines.",
    },
    {
      title: "Decide whether to restart a line after a near-miss safety incident",
      combines: ["agent", "tree-of-thought", "debate", "evaluator"],
      prompt: "A stamping-line operator narrowly avoided a serious injury when a safety interlock triggered a fraction of a second before it should have engaged automatically, the line has been down for four hours already, and every additional hour down costs real production against a customer delivery commitment while restarting before the interlock timing issue is understood risks a repeat with worse luck next time. First, have an agent pull the interlock's full sensor and timing log from the incident and cross-reference it against the maintenance history for that specific interlock unit, since a documented prior near-miss on the same unit and a genuinely first-time event call for very different urgency. Branch into two explanations — a mechanical wear issue specific to this interlock unit that a targeted repair would fix, or a broader timing-calibration issue that could exist across every interlock unit of the same model on the floor — and check which the sensor log actually supports rather than assuming the narrower, more convenient explanation. Argue for restarting this line alone under close monitoring once the specific unit is repaired against a floor-wide inspection of every same-model interlock before restarting anything, using the specific evidence for how isolated or systemic the log data shows this to be. Grade the final call strictly against the plant's own safety protocol, and never let the delivery commitment shorten the investigation.",
    },
    {
      title: "Decide whether to fine-tune a vision model for defect classification at volume",
      combines: ["ensemble", "debate", "fine-tuned", "evaluator"],
      prompt: "The defect-classification system currently runs a general vision model with an extensive prompt describing every defect category, inspecting roughly eighty thousand units a day, and the per-unit latency and API cost are both becoming a real constraint as the line's throughput target increases next quarter. First, run the current prompted approach against a held-out set of manually-graded units three separate times to establish its actual accuracy and consistency baseline at today's volume, not an impression that it's working fine from spot-checking a handful of results. Argue the case for fine-tuning a smaller specialized model on the plant's own labeled defect images — lower per-unit latency and cost at the higher target throughput, more consistent categorization across shifts — against the case for continuing to prompt a general model with a refined prompt and more examples, using the actual measured baseline accuracy and the real cost curve at both current and next-quarter volume, not a generic build-versus-buy default. Grade the recommendation against the specific throughput number the line needs to hit next quarter, and state explicitly the volume threshold at which the recommendation flips, in case the throughput target changes again before the decision is implemented.",
    },
    {
      title: "Contain a nonconforming-parts recall already shipped to three OEM customers",
      combines: ["agent", "planner-executor", "multi-agent", "evaluator"],
      prompt: "Incoming inspection data has revealed that a batch of a critical structural fastener produced over a three-week window fell outside spec on a tolerance that wasn't being actively monitored at the time, and parts from that batch have already shipped to three OEM customers with unknown quantities already installed in finished vehicles. First, have an agent trace the affected batch to specific lot numbers and cross-reference shipment records to establish exactly which OEM customers received how many units, since the entire response plan's urgency and scope changes completely depending on whether this is a hundred units or ten thousand. Plan the response as an ordered sequence — confirm scope precisely, notify the three OEM customers with the specific lot numbers affected, support each customer's own containment of already-installed units, then implement the monitoring fix that would have caught this tolerance in the first place — since notifying customers with vague lot information forces each of them to over-scope their own search, wasting time on unaffected units. Dispatch a workstream to each of the three OEM relationships in parallel once scope is confirmed, since each customer's own containment process and internal escalation differ. Grade the finished response against whether the tolerance-monitoring fix would have actually caught this specific batch, not a generic strengthening of inspection that might miss the same failure mode again.",
    },
  ],
  realestate: [
    {
      title: "Decide whether to convert a half-empty office tower to residential",
      combines: ["tree-of-thought", "rag", "ensemble", "evaluator"],
      prompt: "A twelve-story office tower is running at thirty-one percent occupancy with no realistic path back to profitability as office space, and converting it to residential units would require major structural work to add plumbing risers and light wells that the building's floor plate wasn't designed for. First, pull the actual structural assessment, the local zoning allowance for residential conversion at this address, and comparable conversion project costs from similar-era buildings, since a conversion decision made on rough per-square-foot intuition rather than this building's actual floor-plate constraints risks committing capital to a conversion that turns out structurally impractical partway through. Sketch full residential conversion against a partial conversion keeping the lower floors as office or retail and converting only the upper floors where the floor plate suits residential units better, and generate the revenue-versus-conversion-cost case for each option independently three separate times with slightly different assumptions about achievable residential rents, keeping only the option that comes out ahead consistently rather than trusting a single optimistic run. Grade the winning option against the building's actual remaining office leases and their expiration dates, and flag explicitly if it requires displacing tenants with leases that don't expire for years, since that timeline constraint could make the theoretically-better option impractical.",
    },
    {
      title: "Replan a construction critical path around a steel-delivery delay",
      combines: ["planner-executor", "workflow", "memory-agent", "evaluator"],
      prompt: "A structural-steel supplier just notified the general contractor of a five-week delivery delay on a project with a penalty clause that kicks in at any delay past the contracted completion date, and the project currently has only an eleven-day float built into the schedule. Plan the recovery as an ordered sequence — confirm the actual revised steel delivery date rather than the supplier's optimistic estimate, identify which downstream trades can resequence to work around the delay without waiting on steel, and only then decide whether acceleration costs like overtime or additional crews are actually necessary — since paying for acceleration before confirming how much of the delay other trades can absorb through resequencing would waste money on a problem partially solved for free. Run the trade-resequencing analysis as a scripted pass through the existing project schedule, since the dependencies between trades are already documented and known, and recall the supplier's own historical reliability on similar delays from past projects with this same contractor relationship, since that judgment call genuinely requires weighing evidence rather than following a fixed rule. Evaluate the final recovery plan against the actual penalty-clause date as a hard constraint, and state explicitly, before committing to any acceleration spend, whether resequencing alone closes enough of the gap to make that spend unnecessary.",
    },
    {
      title: "Model a commercial mortgage's refinancing risk at a rate cliff",
      combines: ["rag", "ensemble", "debate", "evaluator"],
      prompt: "A commercial mortgage on a stabilized apartment portfolio matures in four months, the fixed rate it was locked in at is roughly three points below where refinancing rates currently sit, and the debt-service coverage ratio at the new rate comes uncomfortably close to the lender's minimum covenant. First, pull the property's actual trailing-twelve-month net operating income and the specific lender covenant language, since modeling the refinance against a rough rent-growth assumption rather than this portfolio's real trailing income risks understating how close to the covenant line the deal actually sits. Generate the projected debt-service coverage ratio under the new rate three separate times using slightly different but each individually defensible rent-growth and expense assumptions, and treat a wide spread across the three runs as a signal that the deal's safety margin is genuinely thin, not just a modeling nuance to average away. Argue the case for refinancing now to lock in certainty against the case for a short-term bridge loan to wait for a possible rate improvement, using the actual coverage-ratio spread from the three runs as the deciding evidence rather than a generic rate-forecast argument. Grade the recommended path against the covenant's minimum explicitly, under the most conservative of the three runs, not the average one.",
    },
    {
      title: "Diagnose a portfolio-wide occupancy decline across twelve buildings",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "Occupancy across a twelve-building residential portfolio has dropped six points over two quarters, the decline isn't uniform across buildings, and the portfolio manager needs to know whether this is one shared cause worth a company-wide fix or several buildings independently struggling for unrelated reasons before the quarterly ownership review. First, have an agent pull occupancy, move-out survey responses, and local rent-comp data broken out building by building, since a portfolio-wide average hides whether this is three buildings badly hit and nine fine, or a genuine broad softening. Branch into three explanations — a shared pricing misstep across the portfolio's renewal strategy, a handful of buildings facing genuinely new local competition from recently-opened comparable properties, and unrelated building-specific service issues showing up in the move-out surveys — and check each against the building-level data rather than assuming one explanation applies portfolio-wide. Grade the most likely explanation against the actual building-by-building breakdown, and name specifically which buildings the recommended fix would help versus which ones need a different, building-specific response, rather than presenting a single portfolio-wide initiative that would leave some buildings' actual problem unaddressed.",
    },
    {
      title: "Clear forty stalled permits through a municipal portal with no API",
      combines: ["computer-use", "agent", "workflow", "evaluator"],
      prompt: "Forty development projects have permits stalled in a municipal portal that exposes no API, each project's holdup could be a missing document, an unpaid fee, or a review still pending with a specific department, and the development team currently checks status manually one project at a time through the portal's own web interface. First, have an agent classify the forty projects by likely holdup type using whatever status text the portal does display for each, since a missing-document holdup and a pending-department-review holdup call for completely different next actions. Since the portal has no API, drive its own web interface directly for each project — searching by permit number, reading the current status detail, and capturing exactly what's blocking it — the same way a permit coordinator would manually, since there's no faster path available. Once the pattern for reading status reliably across projects is confirmed on a handful of test cases, run that same status-check as a repeatable weekly pass across all forty rather than resuming fully manual checks each time. Evaluate every flagged missing-document case against the specific document the portal actually lists as outstanding, not a generic checklist, and confirm the recommended next action would actually resolve that specific project's stated holdup before it's sent to the project team.",
    },
    {
      title: "Run due diligence on a twelve-building acquisition before a tight close",
      combines: ["multi-agent", "planner-executor", "rag", "evaluator"],
      prompt: "A twelve-building mixed-use portfolio acquisition needs full due diligence completed in three weeks to meet the seller's exclusivity deadline, each building carries its own title history, environmental assessment, and zoning-compliance status, and missing a material issue on even one building could tank the deal's underwriting after close. First, dispatch one diligence pass per building to independently pull and assess that building's actual title records, environmental reports, and zoning-compliance history, rather than one team working through all twelve sequentially, since sequential review at this pace would not finish inside the three-week window. Plan the synthesis step to prioritize flagging any building whose issues are severe enough to affect the deal's overall underwriting, sequencing those buildings' findings to reach the deal team first rather than waiting for all twelve reports to finish in parallel, since a deal-breaking issue on one building needs to surface as early as possible, not at the same moment as the routine findings on the other eleven. Pull the actual comparable-transaction data for any building whose findings suggest a valuation discrepancy from the seller's stated numbers, rather than accepting the seller's pro forma at face value. Grade the consolidated report against the deal's actual underwriting assumptions building by building, and name explicitly which specific buildings, if any, no longer support the price being paid for the portfolio as a whole.",
    },
  ],
  insurance: [
    {
      title: "Underwrite a $40M warehouse policy from two inspectors' contradictory reports",
      combines: ["rag", "tree-of-thought", "debate", "evaluator"],
      prompt: "A renewal underwriting file for a $40 million total-insured-value distribution warehouse has two independent inspection reports that flatly disagree on whether the sprinkler system's water supply meets the coverage's required flow rate, and the renewal quote is due to the broker in two days. First, pull both inspection reports along with the prior three years of loss history and the underwriting manual's specific flow-rate threshold, since the decision has to rest on the documented standard, not on which inspector sounds more confident. Sketch three paths — bind at standard terms trusting the more recent inspection, bind with a flow-rate warranty endorsement that shifts risk back onto the insured, or decline pending a third independent inspection — and argue for the warranty-endorsement path against binding clean, weighing the account's premium value and broker relationship against the actual exposure if the lapsed system is real and a fire loss follows. Grade the recommended path against the one number that matters most, the probable maximum loss if the flow rate is deficient and a fire occurs, and state explicitly whether the premium being quoted still makes sense if that worst case is the real one.",
    },
    {
      title: "Investigate a contractor-linked water-damage claims cluster before renewal season",
      combines: ["agent", "ensemble", "tree-of-thought", "evaluator"],
      prompt: "Fourteen water-damage claims have come in over three months, all naming the same restoration contractor, and claims leadership needs to know before the state files its annual fraud-referral report whether this is coordinated fraud or just one contractor who happens to get a lot of referral business. First, have an agent pull the full claim files, adjuster notes, and payout history for all fourteen claims and cross-reference the loss dates, addresses, and policyholder tenure to establish what's actually connected versus coincidental. Independently re-run the pattern analysis three separate times against slightly different groupings of the claims — by neighborhood, by policy-inception date, and by adjuster assigned — and treat only the pattern that shows up consistently across all three as real signal, since a coincidence that looks damning in one grouping and vanishes in another isn't evidence. Branch into two explanations for whatever pattern survives — genuine claims-staging fraud versus an aggressive but legal contractor who canvasses recent water-loss neighborhoods — and check each against physical evidence in the files, not adjuster suspicion alone. Grade the final finding against the state's actual fraud-referral evidentiary threshold before recommending a referral, since an unsupported referral costs credibility with the fraud bureau for every future one.",
    },
    {
      title: "Rebuild the gulf-coast cat model before a reinsurance treaty renewal",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "The reinsurer wants updated hurricane catastrophe-model output on the gulf-coast homeowners book before agreeing to treaty terms in three weeks, and the two vendor models the company licenses disagree on the 1-in-100-year loss estimate by nearly 30%. First, pull the actual policy-level exposure data — construction type, distance to coast, roof age — feeding both models, since a divergence this large usually traces back to how each model is weighting a specific exposure variable, not just different disaster science. Sketch three ways to present the number to the reinsurer — lead with the more conservative model's output, blend both models into one weighted estimate, or present both with an explained rationale for the gap — and argue for presenting both with rationale against blending, on the ground that a reinsurer who later discovers the blend hid a real disagreement will price the next renewal worse out of distrust. Grade the chosen approach against what the treaty actually needs to close, the attachment point and ceding commission the reinsurer will accept, and flag explicitly if honesty about the model gap risks losing terms the company needs, since that tradeoff has to be named, not buried in a footnote.",
    },
    {
      title: "Adjudicate a disputed $1.8M bodily-injury claim with dueling medical opinions",
      combines: ["debate", "rag", "evaluator", "reflection"],
      prompt: "The claimant's independent medical exam attributes chronic pain to the accident, the company's IME attributes it to a pre-existing degenerative condition, the reserve is set at $1.8 million, and litigation counsel needs a settlement-authority recommendation by Friday. First, pull both full IME reports, the claimant's medical history predating the accident, and imaging records from both before and after the loss date, since the actual medical record, not either doctor's summary conclusion, is what a jury would ultimately weigh. Argue the claimant's causation theory against the company's pre-existing-condition theory using only the imaging and treatment-timeline evidence on file, not either expert's credentials or track record, since the case will be won or lost on the timeline, not on whose expert is more senior. Draft a settlement-authority recommendation from whichever side's argument holds up better under that scrutiny, then critique it once more specifically for whether it accounts for how a jury sympathetic to an injured claimant might discount the pre-existing-condition defense regardless of its medical merit, and adjust the recommended authority number if it doesn't.",
    },
    {
      title: "Trace a loss-ratio spike from 62% to 81% before the next rate filing",
      combines: ["agent", "tree-of-thought", "ensemble", "evaluator"],
      prompt: "The state's personal-auto loss ratio jumped from 62% to 81% over two quarters, the actuarial team suspects one driver segment but can't yet say which, and any rate change beyond 6% requires a new filing that takes ninety days to clear the department of insurance. First, have an agent segment the claims data by age band, vehicle class, territory, and tenure, and pull frequency and severity trends for each segment independently rather than assuming the aggregate number reflects a uniform shift. Branch into three hypotheses — a genuine frequency increase concentrated in one territory, a severity increase from rising repair costs across the whole book, or a mix shift where a previously small, worse-performing segment simply grew as a share of the book — and test each against the segmented data specifically. Rerun the segment attribution three times with slightly different quarter boundaries to confirm the finding isn't an artifact of exactly where the quarter lines fall. Grade the final diagnosis against whether the recommended rate action fits inside the 6% filing threshold, and if it doesn't, say explicitly that a full filing is required rather than quietly rounding the number down to avoid it.",
    },
    {
      title: "Triage 3,000 wildfire claims in the first 72 hours without a single bottleneck",
      combines: ["swarm", "agent", "workflow", "evaluator"],
      prompt: "A fast-moving wildfire has generated roughly 3,000 claims in under three days, the catastrophe-response team is fifteen adjusters against a queue that's still growing, and routing every claim through one central triage desk would fall behind the volume within hours. First, run a fixed intake workflow for the clear-cut cases — total-loss residential claims with a confirmed address inside the evacuation perimeter — since these need consistent, predictable handling and fast advance payments, not judgment calls, and a rigid pipeline processes them faster than an open-ended review would. For every claim that doesn't fit that clean pattern — partial damage, disputed boundary addresses, commercial properties with business-interruption exposure — let each regional adjuster team work its own queue independently against a shared claims-status board rather than waiting on a central coordinator, since no single reviewer can hold the full caseload's context. Have an agent flag any claim where damage extent or address is ambiguous for human review rather than letting it silently auto-process through the fixed workflow. Grade the triage system daily against how many claims are still unassigned past 48 hours, and escalate staffing immediately if that number isn't shrinking, not at the end of the week.",
    },
  ],
  nonprofit: [
    {
      title: "Build a grant budget that satisfies a funder's restricted-use rules without starving the program",
      combines: ["rag", "debate", "evaluator"],
      prompt: "A $600,000 two-year grant restricts 70% of funds to direct program delivery, but the program the funder wants to support can't actually run without the data-evaluation and case-management staff the funder's guidelines classify as overhead, and the proposal is due in five days. First, pull the funder's actual restricted-use guidelines line by line, along with the organization's real cost breakdown for running this program at its current scale, since guessing at what counts as 'direct delivery' versus 'overhead' from memory is exactly how a budget gets rejected by the funder's compliance reviewer later. Argue for reclassifying the case-management staff as direct-delivery cost, since without them the program can't actually deliver outcomes the grant is meant to fund, against the more conservative reading that keeps them as overhead and instead trims the program's caseload target to fit within the 30% ceiling. Grade the final budget against two things independently — whether it would survive the funder's own compliance audit, and whether the resulting program design can plausibly hit the outcomes promised in the narrative — and flag it explicitly if a budget that satisfies the funder's rules would require promising outcomes the org privately doesn't believe it can deliver.",
    },
    {
      title: "Diagnose a donor-retention drop after the flagship program pivoted",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "Monthly-giving retention dropped from 84% to 61% in the two quarters since the organization pivoted its flagship after-school program from direct tutoring to a train-the-trainer model, and the development team can't yet tell whether donors are unhappy with the pivot itself or something unrelated. First, have an agent pull actual lapsed-donor records — giving history, any survey responses, cancellation-page free-text comments — rather than relying on the development team's anecdotal sense of donor sentiment from the handful who called in. Branch into three explanations — donors specifically object to the train-the-trainer model feeling less direct, an unrelated billing-system migration around the same time caused technical lapses unrelated to sentiment, or overall giving fatigue that would show up regardless of the pivot — and check each against the actual data, since the free-text comments and the billing-system timeline should each point clearly toward one explanation or rule it out. Grade the confirmed cause against the retention target the board set for this fiscal year, and state plainly whether hitting that target now requires reversing part of the pivot or fixing a technical problem that has nothing to do with the program model.",
    },
    {
      title: "Design a program evaluation a skeptical foundation program officer will actually trust",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "The foundation's program officer has said outright that the organization's last self-reported outcomes data 'felt like a marketing deck,' and the renewal grant depends on submitting an evaluation methodology within three weeks that she'll actually find credible. First, pull the foundation's own published evaluation standards and two evaluations from peer organizations that this same funder has previously approved, since designing a methodology in a vacuum ignores exactly what this specific funder has already signaled it will accept. Sketch three approaches — a fully external third-party evaluator, an internal evaluation with an external methodology audit, and a mixed-methods design combining outcome data with qualitative case studies — and argue for the internal-plus-audit approach against the fully external option, weighing cost and turnaround time against how much independence the program officer actually needs to see to trust the result. Grade the final methodology against the specific complaint that triggered this — would the resulting report read as marketing to the same skeptical reader, or does the audit component genuinely change that impression — and revise the design if it doesn't clearly answer that complaint.",
    },
    {
      title: "Respond to a major donor's concern after critical local press on program outcomes",
      combines: ["debate", "chatbot", "reflection", "evaluator"],
      prompt: "A local news story quoting former program participants raised real questions about outcome claims the organization has used in its last two annual reports, the organization's largest individual donor — responsible for 15% of unrestricted revenue — has emailed asking directly whether the story is accurate, and a defensive non-answer risks losing that gift entirely. First, argue for a fully transparent response that acknowledges which specific claims in the story are accurate against a more measured response that corrects factual errors in the story while standing behind the program's overall impact, since conflating 'the story got some details wrong' with 'the criticism has no merit' would be dishonest if any part of it is actually true. Draft the response in the executive director's own voice, direct and specific to this donor's actual question rather than a boilerplate statement meant for anyone, addressing precisely what the story alleged. Critique the draft once more specifically for anything that could read as deflecting rather than answering, and cut any sentence that answers a question the donor didn't ask instead of the one they did. Grade the final response against one test: does it give this specific donor enough to decide, honestly, whether to keep giving.",
    },
    {
      title: "Reallocate program budget after a restricted grant's surprise clawback threat",
      combines: ["planner-executor", "rag", "evaluator", "goal-stack"],
      prompt: "A state grant funding 40% of the youth-mentorship program's budget just sent notice that a documentation gap from last year's reporting could trigger a $180,000 clawback, the program has six weeks of runway at current spend, and program staff still need to keep serving the 220 kids currently enrolled while this gets resolved. First, pull the actual grant agreement's documentation requirements and last year's submitted reports side by side to establish precisely what's missing, since the response can't be planned around a guess at the gap. Keep three goals on an explicit stack in priority order — resolve the documentation gap with the state within the response deadline, secure six weeks of bridge funding from unrestricted reserves in case the clawback proceeds anyway, and keep program delivery to current enrollees uninterrupted throughout — since letting any one of these quietly slide while attention is on the other two is the actual risk here. Sequence the plan so bridge-funding approval happens in parallel with the documentation response rather than after, since waiting for the state's answer before securing a fallback would burn through the six weeks of runway. Grade the plan weekly against whether all three goals are still on track, not just the loudest one.",
    },
    {
      title: "Build the board deck defending a new earned-income line against mission-drift concerns",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The organization wants to launch a fee-for-service consulting arm using its program staff's expertise to fund the free program, three board members have already signaled concern this looks like mission drift toward serving whoever can pay, and the vote is in two weeks. First, pull the organization's actual founding mission statement and its last three years of program-outcome data for the free offering, since the deck's argument has to connect to what the org has actually committed to, not an abstract defense of earned-income models in general. Sketch three structures — a fully separate for-profit subsidiary, a fee-for-service line inside the existing nonprofit with revenue ring-fenced to fund the free program, and a sliding-scale model that keeps every client inside the same mission-driven offering — and argue for the ring-fenced fee-for-service line against the sliding-scale model, weighing revenue predictability against the mission-drift optics risk the skeptical board members specifically raised. Grade the final proposal against the exact concern those three board members voiced, not a generic earned-income pitch, and state explicitly what safeguard in the proposal answers their specific worry.",
    },
  ],
  gaming: [
    {
      title: "Restore ranked-ladder integrity after a wave of coordinated cheating",
      combines: ["agent", "tree-of-thought", "ensemble", "evaluator"],
      prompt: "Top-500 ranked matches in the competitive shooter have seen a spike in reports of wallhacks and aim-assist scripts that the current anti-cheat heuristic isn't catching, community trust in the ladder is visibly cratering on social channels, and a scheduled esports qualifier that feeds real prize money runs in ten days. First, have an agent pull match telemetry — flick-to-kill timing, wall-peek accuracy, headshot rate against unseen targets — for the accounts named in community reports, rather than relying on report volume alone, since report volume also spikes from salty losers accusing legitimate high-skill players. Branch into three detection approaches — tightening the existing statistical heuristic's thresholds, adding a new signature specifically for the wallhack pattern being reported, and a manual review queue for qualifier-eligible accounts only given the tight timeline — and evaluate each on false-positive rate against a sample of known-legitimate pro players' historical matches, since banning a legitimate qualifier competitor days before the event would be its own crisis. Run the chosen detection pass three times against slightly different telemetry windows to confirm flagged accounts are consistent, not an artifact of one bad match. Grade the final ban list against the qualifier roster specifically before publishing it, and require manual confirmation for any account with prize money on the line.",
    },
    {
      title: "Contain a currency-duplication exploit before it destroys the in-game economy",
      combines: ["agent", "planner-executor", "evaluator", "workflow"],
      prompt: "A duplication exploit in the crafting-trade interface let a small number of players multiply premium currency overnight, the exploit has since been patched, but an estimated 40 million duplicated units are already in circulation and the marketplace's prices are visibly inflating hour by hour. First, run a fixed pipeline to identify every account that benefited from the exploit and quantify exactly how much duplicated currency each holds, since this data-forensics step is well-defined and doesn't benefit from open-ended judgment. Plan the remediation in strict order — freeze marketplace listings above a threshold price to stop inflation from compounding further, claw back duplicated currency from confirmed exploiter accounts, then unfreeze the marketplace gradually — since unfreezing before the clawback completes would let remaining duplicated currency keep distorting prices. Have an agent handle the edge cases the fixed pipeline can't resolve cleanly — accounts that both exploited the bug and made legitimate purchases in the same window — since those need judgment about how much to actually claw back. Grade the finished remediation against whether marketplace prices for staple items have returned within 10% of pre-exploit baseline, not just whether the clawback numbers reconcile on paper.",
    },
    {
      title: "Decide whether to roll back a patch that broke matchmaking but fixed a beloved glitch",
      combines: ["debate", "tree-of-thought", "evaluator"],
      prompt: "The latest patch fixed a server-side desync bug that was causing real match-ending crashes, but it also accidentally removed a wall-jump glitch that a large, vocal segment of the speedrunning and movement-tech community had built entire play styles around, and social sentiment has turned sharply negative within a day of release. First, sketch three paths — full rollback to the previous build, keep the current patch and officially declare the glitch unsupported going forward, or ship a targeted follow-up patch that restores the wall-jump specifically while keeping the desync fix — and weigh each against the actual crash-report volume the desync fix eliminated, since that number is the real stakes here, not just community noise volume. Argue for the targeted follow-up patch against a full rollback, on the ground that reintroducing the crash bug to satisfy one segment's playstyle preference would trade a confirmed stability win for community goodwill that a well-communicated fix could recover anyway. Grade the recommended path against both the crash-report metric and the community sentiment metric independently, and be explicit if the targeted-patch timeline realistically can't ship before sentiment does lasting damage to retention, since that possibility should change the recommendation, not just get noted as a risk.",
    },
    {
      title: "Triage a coordinated review-bomb during a day-one launch window",
      combines: ["swarm", "agent", "chatbot", "evaluator"],
      prompt: "The new title launched six hours ago to strong early player numbers, but a coordinated review-bombing campaign — seemingly triggered by a since-deleted marketing claim about a feature that shipped differently than promised — has dropped the storefront rating from 88% to 61% in under four hours, and the marketing and community teams are reacting independently without coordinating a single response. First, let the community-response team and the marketing team each work their own piece in parallel against a shared incident doc rather than funneling every decision through one person, since community needs to respond to players in real time while marketing works out the actual correction to the disputed claim, and waiting on each other would cost hours neither team has. Have an agent separate the reviews into genuine bug complaints versus review-bomb noise referencing the marketing dispute specifically, since the response to each is different and conflating them risks looking dismissive of real bugs. Draft the public response in a tone that owns the marketing miscommunication plainly rather than being defensive about it, since defensiveness is what tends to extend a review-bomb rather than end it. Grade the response against whether it actually corrects the disputed claim in plain language, not just apologizes vaguely without saying what was wrong.",
    },
    {
      title: "Rework matchmaking after smurfing data reveals the real driver of new-player churn",
      combines: ["rag", "tree-of-thought", "debate", "evaluator"],
      prompt: "New-player thirty-day retention has been declining for two quarters, the live-ops team's working theory has been that onboarding is too confusing, but a fresh pull of matchmaking data shows a disproportionate share of churned new accounts lost repeatedly to accounts with skill signatures that look like experienced players on fresh accounts. First, pull the actual match history for a sample of churned new accounts and compare opponent skill signatures against the matchmaking rating each opponent account was assigned, since the smurfing theory needs to be checked against real matches, not just team intuition. Sketch two competing responses — a stricter placement-match system that assigns new accounts a provisional rating faster based on early-match performance, or a hard separate matchmaking pool for accounts under a certain hour threshold regardless of apparent skill — and argue for the separate-pool approach against faster placement, weighing how quickly each would actually reduce new-player exposure to smurfs against the risk of a separate pool feeling like a demotion to genuinely new players who are just good. Grade the chosen design against thirty-day retention for the next cohort specifically, and set a clear number in advance for what improvement would confirm the fix actually worked.",
    },
    {
      title: "Walk back a monetization backlash without gutting the live-service revenue model",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The new battle-pass structure locks core cosmetic progression behind a second paid track, community backlash has been sharp enough that a major streamer publicly called it predatory, but the monetization team's finance model shows this structure is the only one currently on the roadmap projected to hit next quarter's revenue target. First, pull the actual conversion and revenue data from the first week of the new structure alongside the previous season's numbers, since the decision needs to be grounded in what players are actually spending, not just how loud the backlash sounds on social channels. Sketch three responses — revert fully to the previous structure, keep the current structure but add a smaller free-track concession that addresses the loudest specific complaint, or hold the current structure unchanged and ride out the backlash — and argue for the free-track concession against a full revert, weighing the actual revenue gap a full revert would create against how much of the backlash that partial concession would plausibly defuse. Grade the recommended response against next quarter's revenue target explicitly, and state the dollar gap if the concession doesn't fully close it, rather than presenting the compromise as costless.",
    },
  ],
  biotech: [
    {
      title: "Decide whether to halt a Phase II arm after an unexpected adverse-event signal",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "Three serious adverse events have appeared in the high-dose arm of a 180-patient Phase II trial over the last six weeks, none clearly attributable to the drug versus the patients' underlying condition, and the data safety monitoring board meets in four days to decide whether the arm continues. First, pull the full adverse-event case reports, the patients' baseline comorbidities, and the trial's pre-specified stopping-rule thresholds, since the decision has to be measured against what was defined before the trial started, not against how alarming three events feels in isolation. Sketch three positions to bring into the DSMB discussion — halt the high-dose arm only, halt the entire trial pending review, or continue with enhanced monitoring — and argue for halting the high-dose arm alone against continuing with enhanced monitoring, weighing the statistical likelihood these events are drug-related given the patients' baseline risk against the cost of losing a full arm's worth of efficacy data this early. Grade the final recommendation against the trial's own pre-specified stopping rule explicitly, and flag clearly if the recommendation would go against what that rule technically requires, since overriding a pre-specified rule needs to be named as such to the board, not quietly reasoned around.",
    },
    {
      title: "Resolve conflicting assay results before a lead-compound go/no-go decision",
      combines: ["ensemble", "tree-of-thought", "evaluator"],
      prompt: "The binding-affinity assay run in-house shows the lead candidate hitting its target well within spec, but a confirmatory assay run by an external CRO shows binding roughly three times weaker, and the go/no-go decision to advance into lead optimization is scheduled for Monday with a fixed budget that can't support re-running both. First, re-run the in-house assay conditions independently three times on fresh reagent lots specifically to check whether the original in-house result was itself reproducible, since a single run that doesn't replicate under its own protocol shouldn't be trusted over the CRO's number regardless of source. Branch into two explanations for the discrepancy that remain live after that check — a genuine assay-condition difference between the two labs, such as buffer pH or temperature, versus a real compound-stability issue that only shows up under the CRO's longer incubation time — and design the one additional confirmatory experiment that would distinguish between them cleanly, given the budget only supports one more run. Grade the go/no-go recommendation against whichever explanation the confirmatory experiment actually supports, and state plainly if the timeline doesn't allow for that experiment before Monday, since deciding on unresolved conflicting data is a materially different recommendation than deciding on resolved data.",
    },
    {
      title: "Recover a multi-site trial after enrollment falls behind at half the sites",
      combines: ["agent", "planner-executor", "rag", "evaluator"],
      prompt: "The trial needs 300 patients enrolled by year-end to preserve statistical power, twelve of the twenty-two sites are running behind their enrollment targets, and the sponsor's steering committee wants a recovery plan before approving any budget for additional sites. First, have an agent pull site-level enrollment data, screen-failure rates, and each lagging site's specific bottleneck — slow IRB approvals, insufficient patient population, or under-resourced site staff — since a single generic 'enroll faster' directive won't fix three different underlying problems. Plan the recovery in phases — first, unblock the sites where the bottleneck is administrative and fixable quickly, then reallocate enrollment targets away from sites with a genuine patient-population shortfall toward the strongest-performing sites, then only after those steps, evaluate whether new sites are actually needed — since adding new sites before exhausting cheaper fixes at existing ones burns budget the steering committee is reluctant to approve. Grade the resulting plan against the 300-patient year-end target under a conservative enrollment-rate assumption, not an optimistic one, and state explicitly if the target is no longer achievable even with the recovery plan, rather than presenting a plan that only works if everything goes right from here.",
    },
    {
      title: "Reconcile a CRO's data-integrity flag against internal records before an FDA submission",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "The contract research organization running the trial's bioanalytical work flagged an anomaly in one batch of pharmacokinetic samples — results inconsistent with the rest of the dataset in a way that could indicate a handling error or could indicate a real biological outlier — three weeks before the NDA submission's data lock. First, have an agent pull the CRO's full chain-of-custody documentation for the flagged batch alongside the raw analytical data for every other batch in the same study, since the question of whether this is a handling artifact or a real signal has to be answered from the actual documentation trail, not from how unusual the result looks in isolation. Branch into two explanations — a sample-handling or chain-of-custody break specific to that batch, versus a genuine subpopulation of patients metabolizing the drug differently — and check each against whether any other data point, such as those patients' other lab values or reported side effects, corroborates a real biological explanation. Grade the finding against what the FDA submission's data-integrity narrative actually needs to say, and be explicit that a submission asserting the flagged batch is excludable as a handling error requires stronger documentation than a submission that simply reports the outlier and its likely explanation.",
    },
    {
      title: "Prioritize a high-throughput screening hit-list under limited synthesis capacity",
      combines: ["router", "ensemble", "tree-of-thought", "evaluator"],
      prompt: "The high-throughput screen against the new target returned 340 hits above the activity threshold, medicinal chemistry can only synthesize and validate about 25 follow-up compounds this quarter, and picking wrong means burning a quarter of scarce synthesis capacity on dead ends. First, classify all 340 hits by chemical series — since related hits sharing a scaffold should be evaluated as a group rather than each competing individually for one of the 25 slots — and by counter-screen result, filtering out anything showing activity against the known off-target panel regardless of primary-target potency. Within the surviving series, score the top candidates independently three times using different weightings of potency, predicted synthetic tractability, and novelty versus existing patent literature, and treat a candidate whose rank swings wildly across the three scoring runs as one needing a chemist's judgment call rather than the formula's. Sketch two allocation strategies — concentrate the 25 slots on the two most promising series to build real structure-activity data, or spread across five series to hedge against any one series turning out to be a dead end — and grade the chosen strategy against how much true structure-activity relationship data it would actually generate this quarter, not just against hit count covered.",
    },
    {
      title: "Draft the DSMB briefing after an interim analysis shows marginal efficacy",
      combines: ["rag", "debate", "evaluator", "reflection"],
      prompt: "The trial's pre-planned interim analysis shows the primary endpoint trending in the right direction but not reaching the pre-specified significance threshold, enrollment is 60% complete, and the sponsor's leadership is under pressure to decide whether to continue, stop for futility, or adapt the sample size, with the DSMB briefing due in one week. First, pull the actual interim statistics, the trial's pre-specified futility boundary, and the conditional power calculation given current enrollment, since the recommendation has to be grounded in what the statistical plan actually says a marginal-but-not-significant result implies about the trial's chances of eventually succeeding. Argue the case for continuing unchanged, on the ground that the trend is real and the trial is underpowered at this interim point by design, against the case for a sample-size re-estimation, on the ground that conditional power at current effect size is genuinely borderline and an adaptive increase is exactly what the protocol allows for a case like this. Draft the briefing recommending whichever case the conditional-power number actually supports, then critique the draft once more specifically for whether it's presenting genuine statistical reasoning or hopeful spin dressed as statistics, since a DSMB that senses spin will scrutinize everything else in the submission harder.",
    },
  ],
  retail: [
    {
      title: "Diagnose an inventory stockout cascade during a flash promotion",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "A 48-hour flash promotion on a top-20 SKU sold through the entire allocated inventory in six hours, the demand-forecasting model that sized the promotion badly underestimated it, and merchandising needs to know before the next planned promotion in three weeks whether this was a forecasting-model failure or a one-off viral spike that shouldn't change the model at all. First, have an agent pull the actual sell-through curve hour by hour, the promotion's paid-media spend and reach compared to prior promotions of similar size, and the forecasting model's specific input assumptions for this SKU. Branch into two explanations — the forecasting model's baseline demand assumption for this SKU category is systematically too conservative, versus this specific promotion got an unplanned organic social boost that a model reasonably couldn't have predicted — and check each against whether other SKUs promoted the same week without the social boost also underperformed their forecasts, since that comparison cleanly separates a model problem from a one-off. Grade the finding against the upcoming promotion's inventory allocation plan specifically, and state a concrete revised allocation number rather than a general note to 'stock more,' since the next promotion's buy has to be placed before this gets fully resolved.",
    },
    {
      title: "Rebuild markdown strategy after a seasonal SKU was massively over-ordered",
      combines: ["tree-of-thought", "ensemble", "evaluator"],
      prompt: "The buying team ordered 40% more units of the season's flagship outerwear style than sell-through data now suggests will move at full price, six weeks remain in the selling season, and every week of delay on markdown decisions costs margin on units that will eventually have to be discounted anyway. First, sketch three markdown paths — an immediate deep first-cut markdown to clear volume fast, a shallower first cut with a scheduled second cut in three weeks if sell-through doesn't respond, and a targeted markdown only in the specific regions and channels showing the weakest sell-through rather than a blanket cut — and evaluate each against how much margin each path preserves under a realistic sell-through response, not an optimistic one. Independently project sell-through under each path three separate times using slightly different elasticity assumptions, since a markdown plan that only looks good under one optimistic elasticity assumption is fragile, and keep only the projections that hold up reasonably consistently across all three. Grade the recommended path against the actual constraint that matters most here — clearing enough units before the season ends that none carry over into next year's aged-inventory writeoff — and state the specific week by which the plan needs a checkpoint to confirm it's working or trigger the deeper cut.",
    },
    {
      title: "Redesign ship-from-store fulfillment after picking errors spike",
      combines: ["workflow", "agent", "evaluator"],
      prompt: "Ship-from-store order accuracy has dropped to 91% from a historical 98% since the chain expanded ship-from-store to cover 200 more locations last month, each mis-shipped order costs roughly $28 in returns and reshipment, and store associates are complaining the new picking process doesn't fit how their stores are actually laid out. First, run the standard picking-and-packing sequence as a fixed workflow for the common case — single-item orders from well-stocked SKUs — since that's the bulk of volume and benefits from a consistent, trainable process rather than open-ended judgment at every store. For the harder cases specifically — multi-item orders spanning different store zones, or orders for SKUs the store's on-hand inventory doesn't actually match what the system shows — let an agent handle the exception, flagging a discrepancy to the associate rather than forcing a guess, since these are exactly the cases driving the accuracy drop. Evaluate the redesigned process at a sample of the ten worst-performing new locations specifically, not the chain average, since the rollout's actual weak point is concentrated there, and confirm the fix closes the gap at those stores before declaring the redesign successful chain-wide.",
    },
    {
      title: "Resolve a shelf-space standoff between two category managers",
      combines: ["debate", "rag", "evaluator"],
      prompt: "The snacks category manager and the beverage category manager both want the same end-cap placement for the upcoming quarter, each has sales data supporting their own category's case, and the planogram deadline for print production is two days away. First, pull the actual sales-lift data from the last three end-cap placements for both categories, along with each category's current margin contribution and growth trajectory, since the decision needs to rest on real comparative performance rather than on whichever manager presents more persuasively. Argue the snacks case — historically higher impulse-purchase lift from end-cap placement — against the beverage case — lower per-unit lift but higher margin and a new product launch this quarter that needs visibility — using only the pulled data, and let the argument that survives scrutiny on margin-adjusted lift, not raw units sold, decide the placement. Grade the final decision against the store's overall quarterly revenue target rather than either category's individual target, since a decision that helps one category manager hit their number at the expense of total store performance isn't actually the right call, and state explicitly what the losing category gets instead this quarter so it isn't just a flat no.",
    },
    {
      title: "Diagnose a checkout cart-abandonment spike after a platform migration",
      combines: ["agent", "tree-of-thought", "ensemble", "evaluator"],
      prompt: "Cart-abandonment rate jumped from 68% to 79% in the two weeks since the e-commerce checkout flow migrated to a new payment platform, the migration was supposed to be a backend-only change with no visible impact, and the engineering team insists nothing user-facing changed. First, have an agent pull the actual funnel data step by step through checkout — cart, shipping info, payment entry, confirmation — to identify precisely which step the abandonment is concentrated at, rather than treating 'checkout is worse' as one undifferentiated problem. Branch into three explanations for whatever step shows the drop — a subtle latency increase in the new payment platform's response time, a payment-method option that quietly stopped working for a subset of browsers, or an unrelated seasonal pattern that coincidentally lines up with the migration date — and check each against session-replay data and browser-type breakdowns specifically. Independently re-run the funnel analysis on three different date-range windows around the migration to confirm the drop timing actually lines up with the migration and isn't an artifact of how the date range was chosen. Grade the confirmed cause against whether it's fixable before the upcoming holiday traffic surge, and state a clear yes-or-no on that timeline, not just a diagnosis.",
    },
    {
      title: "Plan a store-closure list under conflicting real-estate and brand-presence constraints",
      combines: ["multi-agent", "debate", "tree-of-thought", "evaluator"],
      prompt: "Finance wants to close the 30 lowest-revenue stores to hit next year's margin target, real estate flags that a third of those stores are locked into leases with punitive early-termination costs that would erase most of the savings, and brand wants flagship presence maintained in at least one store per major metro regardless of that location's individual profitability. First, dispatch a pass each to finance, real estate, and brand to quantify their actual constraint in hard numbers — true net savings after termination costs, and the specific metro markets brand considers non-negotiable — rather than working from each department's qualitative preference. Sketch two closure lists — pure revenue-rank order versus a lease-cost-adjusted order that skips high-termination-cost stores even if they're low revenue — and argue for the lease-adjusted list against pure revenue rank, since a list that looks decisive on revenue but destroys most of its savings in termination fees doesn't actually hit finance's real goal. Reinstate any flagship-metro store the pure ranking would have closed, and grade the final list against the original margin target with the actual net-of-termination-cost savings number, stating plainly if the adjusted list falls short of the target and by how much, rather than presenting a compromised list as if it fully solves the original ask.",
    },
  ],
  telecom: [
    {
      title: "Coordinate a fiber-cut outage disrupting emergency-services routing",
      combines: ["agent", "goal-stack", "planner-executor", "evaluator"],
      prompt: "A construction crew severed a major fiber trunk line, cutting voice and data service to roughly 80,000 subscribers in the affected region, and initial reports suggest 911 call routing for part of that area may be failing over incorrectly to a distant call center instead of the local dispatch. First, push restoring correct 911 call routing to the top of the goal stack ahead of general service restoration, even though far more subscribers are affected by the general outage, since a misrouted emergency call has categorically higher stakes than a delayed data connection. Keep general service restoration and the eventual root-cause fiber repair as separate items lower on the stack so they aren't dropped once the 911 routing issue is confirmed fixed. Have an agent verify the 911 routing fix by placing test calls from within the affected exchange rather than trusting the network-configuration change alone, since a config change that looks correct on paper can still fail in practice. Plan the general restoration as an ordered sequence — reroute traffic through the backup trunk, confirm capacity holds under full regional load, then schedule the physical repair — and grade the fix at each phase against whether it's actually restoring service for real subscribers, not just clearing the network-monitoring alert.",
    },
    {
      title: "Resolve a roaming-charges billing dispute with a partner carrier",
      combines: ["rag", "agent", "evaluator"],
      prompt: "A partner carrier is disputing $2.3 million in roaming charges from the last quarter, claiming the usage records don't match their own subscriber logs, and the dispute has to be resolved before the next quarterly settlement cycle closes in ten days or the discrepancy carries forward and compounds. First, have an agent pull both carriers' raw call-detail and data-session records for the disputed period and reconcile them at the individual-session level rather than comparing only the aggregate totals, since a $2.3 million gap in an aggregate figure can hide a much smaller number of genuinely mismatched records mixed with records that actually do match. Pull the interconnect agreement's specific rate schedule and rounding rules for the disputed traffic type, since a chunk of this kind of dispute often traces back to a rate-schedule interpretation difference rather than a data problem at all. Grade the reconciliation's finding against the actual interconnect agreement language before presenting a number back to the partner carrier, and be explicit about how much of the $2.3 million is a genuine data mismatch versus a rate interpretation disagreement, since the two require entirely different resolutions and conflating them in the response would only prolong the dispute.",
    },
    {
      title: "Plan spectrum reallocation for a 5G rollout against a hard FCC deadline",
      combines: ["planner-executor", "tree-of-thought", "debate", "evaluator"],
      prompt: "The company has committed to a public 5G buildout timeline requiring spectrum currently used for a legacy 4G service in twelve markets to be reallocated within five months to meet an FCC deployment milestone, and roughly 400,000 subscribers still actively use devices that only support the legacy service in those markets. First, sketch three reallocation approaches — an aggressive full cutover with subsidized device upgrades for affected subscribers, a phased market-by-market cutover starting with markets that have the lowest legacy-device penetration, or a technical overlay that preserves partial legacy capacity on a narrower spectrum slice while still freeing most of the band — and weigh each against whether it can plausibly meet the five-month deadline given equipment lead times. Argue for the phased approach against the full cutover, on the ground that starting with low-penetration markets buys real operational learning before the highest-exposure markets convert, against the case that phasing risks running out of runway before the deadline if any phase slips. Plan the chosen approach as an ordered sequence of market cutovers with a hard checkpoint after the first two, and grade the plan against the FCC deadline explicitly, stating clearly if the current device-upgrade subsidy pace is actually fast enough to hit it or if it needs to be accelerated now, not discovered at month four.",
    },
    {
      title: "Diagnose a churn spike after a rate-plan restructure rollout",
      combines: ["agent", "rag", "tree-of-thought", "evaluator"],
      prompt: "Voluntary churn rose from 1.8% to 3.1% monthly in the six weeks since a rate-plan simplification collapsed twelve legacy plans into four new tiers, customer service reports a rise in confused billing calls, but it's unclear whether churn is driven by customers landing on a worse effective rate or by confusion and mistrust regardless of actual cost impact. First, have an agent pull the actual before-and-after monthly bill for a sample of churned customers specifically, comparing their old legacy-plan rate to what they were mapped to under the new tier structure, rather than assuming the new tiers were revenue-neutral for everyone as originally modeled. Branch into two explanations — a meaningful subset of customers genuinely landed on a materially worse rate under the new mapping, versus rates are roughly equivalent but the change itself, poorly communicated, eroded trust regardless of actual cost — and check the bill-comparison data to see which explanation the churned sample actually supports. Grade the finding against the retention team's live win-back conversation notes with a sample of these churned customers, confirming the stated reason customers give lines up with what the billing data shows, and flag it if the two don't match, since fixing the wrong problem would leave churn unaddressed.",
    },
    {
      title: "Manage a multi-service network degradation with no single root cause",
      combines: ["swarm", "agent", "tree-of-thought", "evaluator"],
      prompt: "A regional network element is degraded in a way that's affecting voice call quality, mobile data throughput, and a fleet of industrial IoT sensors differently, with no single failure mode connecting all three, and routing everything through one central network-operations lead is already creating a queue of unaddressed alarms. Rather than funneling every finding through one coordinator, let each affected service's on-call team investigate its own degradation independently against a shared incident channel everyone reads, so voice troubleshooting doesn't wait on data-team findings that may not even be related. For the IoT sensor fleet specifically, since its failure pattern is the least understood, branch into two hypotheses — a firmware update pushed to the sensors around the same time coincidentally causing reporting gaps, versus genuine backhaul congestion from the same degraded element affecting voice and data — and check each against sensor firmware-version logs and backhaul utilization graphs respectively. Have an agent continuously re-poll all three services' health metrics rather than relying on a one-time snapshot, since a degradation this uneven can shift which service is worst affected hour to hour. Grade each of the three services independently against its own service-level baseline before declaring the incident resolved, since restoring voice quality doesn't mean the IoT fleet's backlog has actually cleared.",
    },
    {
      title: "Decide the infrastructure investment tradeoff between rural mandate and urban capacity",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The state's universal-service mandate requires expanding broadband to underserved rural counties within eighteen months or the company loses eligibility for a $40 million subsidy, but network engineering says the company's densest urban markets are approaching capacity limits that, without new investment this year, will start causing real congestion during peak hours for the company's highest-revenue subscriber base. First, pull the actual subsidy terms and penalty structure for missing the rural mandate alongside the urban network's real utilization trend and the revenue at risk if urban congestion starts driving churn, since the tradeoff has to be weighed on real numbers rather than which constituency is louder internally. Argue the case for fully funding the rural buildout on schedule, protecting the subsidy and regulatory standing, against the case for partially deferring rural spend to fund urban capacity first, protecting near-term revenue and the higher-value subscriber base, using only the pulled financial data on both sides. Grade the recommended allocation against whether it still technically satisfies the minimum threshold of the state mandate even if not fully, and state explicitly, in a form the board can act on, what real risk remains on the side that gets less funding, rather than presenting the split as risk-free for both.",
    },
  ],
  sports: [
    {
      title: "Build the trade-deadline call between win-now and rebuild",
      combines: ["tree-of-thought", "debate", "rag", "evaluator"],
      prompt: "The team sits two games out of the final playoff spot with six weeks left in the season, the front office is split between trading young prospects for proven veteran help to chase the playoff spot now, or holding the prospects and selling impending free agents for future assets, and the deadline is four days away. First, pull the actual roster's advanced performance metrics, the prospects' current trade value against comparable recent deals, and the team's realistic playoff-odds model under both scenarios, since the decision has to rest on real probability, not on how the current five-game winning streak feels. Argue the win-now case — the playoff odds model shows a real, non-trivial chance if the specific positional gap gets filled — against the rebuild case — the model shows the odds are still long even with the upgrade, and the prospects being traded have a much higher expected future value than a first-round playoff exit — using the model's actual numbers on both sides. Grade the recommended move against the front office's stated multi-year competitive window, not just this season, and state plainly if chasing this year's long-shot odds would meaningfully damage the roster's outlook two years out, since that tradeoff needs to be named explicitly before the deadline, not discovered afterward.",
    },
    {
      title: "Diagnose a star player's performance decline — injury, form, or fatigue",
      combines: ["agent", "ensemble", "tree-of-thought", "evaluator"],
      prompt: "The team's leading scorer has seen efficiency drop noticeably over the last eight games, the player insists nothing is wrong physically, but the medical staff, the coaching staff, and the analytics group each have a different working theory, and the playoff race means the team can't afford to guess wrong about how to manage the player's remaining minutes. First, have an agent pull the player's actual biomechanical tracking data, workload and minutes-played trend over the last six weeks, and shot-quality metrics independent of makes and misses, rather than relying on the eye test that's currently producing three conflicting opinions. Branch into three explanations — an unreported minor injury affecting mechanics, cumulative fatigue from workload, or a genuine tactical adjustment by opponents specifically targeting this player — and check each against the tracking data, since fatigue and injury show up differently in biomechanical signatures than a defensive scheme change does. Independently re-score the shot-quality analysis three times using different opponent-defense baselines to confirm the finding isn't sensitive to which games get compared. Grade the final diagnosis against the specific decision it needs to inform — how to manage this player's minutes for the remaining stretch — and give a concrete number, not a vague caution.",
    },
    {
      title: "Adjust in-game strategy from halftime data showing an opponent tendency",
      combines: ["agent", "tree-of-thought", "evaluator"],
      prompt: "The team trails by eleven points at halftime, and the analytics staff's live tracking shows the opponent has run the same specific pick-and-roll counter against the team's base defense on nearly 70% of their possessions in the second quarter specifically, a tendency the coaching staff hadn't planned for pregame. First, have an agent confirm the pattern is real and not a small-sample artifact by checking it against the opponent's full-season tendency data for that same play call, since adjusting a whole defensive scheme at halftime based on eight second-quarter possessions that turn out to be a fluke would be worse than making no adjustment at all. Sketch two adjustments — switch the defensive coverage on that specific pick-and-roll entirely, or make a smaller personnel change that puts a better on-ball defender against the ball-handler who's been running it — and weigh each against how much in-game practice time exists to actually communicate and execute the change in the two minutes of halftime remaining. Grade the chosen adjustment against one number only, whether the opponent's success rate on that specific play call in the third quarter actually drops from the first-half rate, and be ready to abandon the adjustment quickly if it doesn't.",
    },
    {
      title: "Handle a locker-room morale crisis after a benching decision leaks",
      combines: ["debate", "chatbot", "reflection", "evaluator"],
      prompt: "The head coach benched the team's second-leading scorer for the fourth quarter of last night's loss over what was described internally as an attitude and effort issue, a private locker-room conversation about the decision leaked to a beat reporter within hours, and the team has a shootaround in two hours where every player and the media will be watching how the coach handles it. First, argue for the coach directly and publicly explaining the actual reason for the benching, treating the player like an adult in front of the team, against a more private approach that addresses it only one-on-one with the player and gives a deliberately vague public answer, weighing which approach is more likely to actually repair the specific relationship damaged here versus which minimizes further media attention. Draft what the coach should say to the team as a whole, in the coach's own established voice and standards, not a generic accountability speech that could apply to any team. Critique the draft once more for whether it actually addresses what every player in that room already knows leaked, since a speech that pretends the leak didn't happen will read as evasive. Grade the final approach against whether it gives the benched player a credible path back into the rotation, not just a public reprimand with no resolution.",
    },
    {
      title: "Build a draft evaluation reconciling three scouts' conflicting reports",
      combines: ["ensemble", "debate", "rag", "evaluator"],
      prompt: "Three area scouts filed conflicting reports on the same top-15 draft prospect — one calls him a franchise cornerstone, one flags a durability concern from a college injury history, and one questions whether his skill set translates against better competition — and the draft board meeting to finalize the team's board order is tomorrow morning. First, pull the prospect's actual college medical records, snap-by-snap game film against the toughest opponents specifically, and combine-testing data, since the three scouts' disagreement has to be checked against the underlying evidence each of them was presumably working from, not just weighted by scout seniority. Argue the durability concern against the translates-to-the-next-level concern directly, using the actual medical file and the film against strong competition respectively, since these are two genuinely different risks that could each independently sink the pick and shouldn't be blended into one vague 'some concerns' summary. Grade the final board placement against the team's specific positional need and risk tolerance this draft cycle, not a generic best-player-available ranking, and state explicitly which of the two real risks the team is choosing to accept if it drafts him, rather than presenting the pick as risk-free.",
    },
    {
      title: "Set a load-management plan under conflicting medical and performance pressure",
      combines: ["debate", "tree-of-thought", "rag", "evaluator"],
      prompt: "The team's star player is dealing with a chronic knee issue that the medical staff says requires reduced minutes and periodic rest days to avoid a season-ending flare-up, but the front office is under pressure from a nationally televised playoff-positioning stretch where every win matters, and the player himself has said publicly he wants to play through it. First, pull the actual medical imaging trend and workload data correlating minutes played to past flare-up incidents, since the decision needs to be grounded in this specific player's documented pattern, not a generic load-management framework built for a different player's body. Argue the medical case for a strict rest-day schedule against the performance case for playing through the stretch with reduced but continuous minutes, weighing the actual playoff-seeding value of the next several games against the real, data-supported risk of a flare-up that would end the season entirely. Grade the resulting plan against whether it's something the medical staff would sign off on as genuinely safe, not just politically comfortable for all three parties, and state plainly if the front office's preferred plan is being adopted over medical advice, since that needs to be an explicit, named decision, not something smoothed over as a consensus.",
    },
  ],
  regops: [
    {
      title: "Prepare for a surprise regulatory audit with two weeks' notice",
      combines: ["planner-executor", "agent", "rag", "evaluator"],
      prompt: "The regulator notified the company yesterday of an unscheduled compliance audit covering the last eighteen months of records, on-site review begins in two weeks, and the regulatory-affairs team has never assembled a response this fast before, with several requested document categories scattered across three different systems. First, pull the actual audit-notice letter's specific document and process requests line by line, since preparing generically for 'a compliance audit' instead of this specific letter's actual scope wastes the limited time available. Plan the response as an ordered sequence — inventory what's requested and where it currently lives, assign an owner per document category, conduct an internal pre-review to catch gaps before the regulator does, then compile the final response package — since skipping the internal pre-review to save time is exactly how a gap the company could have caught itself gets caught by the regulator instead. Have an agent handle the actual document retrieval and cross-referencing across the three systems, flagging any category where the on-file records look incomplete rather than silently assembling whatever exists. Grade the final response package against the audit letter's specific requests one item at a time before submission, and treat any unresolved gap as something to disclose proactively in a cover note rather than leave for the regulator to discover unexplained.",
    },
    {
      title: "Interpret a new rule's ambiguous reach into an existing product line",
      combines: ["rag", "debate", "tree-of-thought", "evaluator"],
      prompt: "A newly published regulation uses language that could plausibly be read to cover the company's existing flagship product line or could just as plausibly be read to exclude it, the regulator's own guidance doesn't resolve the ambiguity, and the compliance program needs a documented interpretation before next quarter's product review, since guessing wrong in either direction carries real cost. First, pull the rule's actual text, the preamble explaining its intent, and any public comment-period responses the regulator gave to similar questions from other companies, since the interpretation needs to trace to the actual regulatory record, not to what the compliance team would prefer the rule to mean. Sketch two readings — the narrow reading that excludes the product line, and the broad reading that includes it — and argue for the broader, more conservative reading against the narrower one, weighing the cost of unnecessary compliance overhead if the narrow reading turns out correct against the cost of an enforcement action if the broad reading was the right one and the company guessed wrong. Grade the final interpretation against how defensible it would be if the regulator later disagrees, specifically whether the documented reasoning would look like a good-faith reasonable interpretation or a convenient rationalization, and revise the memo if it reads as the latter.",
    },
    {
      title: "Design a remediation plan after a regulator's formal finding letter",
      combines: ["planner-executor", "workflow", "agent", "evaluator"],
      prompt: "The regulator's finding letter cites four specific control deficiencies in the company's data-handling program, gives ninety days to submit a remediation plan, and threatens escalated enforcement if the same deficiencies recur at the next examination, which history suggests means the plan actually has to work, not just look complete on paper. First, plan the remediation as a fixed sequence per deficiency — root-cause the specific control gap, design the fix, implement it, then independently test that it holds under a simulated version of whatever triggered the original finding — since each of the four deficiencies needs its own instance of this same well-defined sequence rather than one open-ended cleanup effort. Run the ongoing monitoring the plan establishes as a workflow with clearly defined checks at fixed intervals, since sustained compliance monitoring is exactly the kind of steady, repeatable process that benefits from a predictable pipeline rather than judgment calls each time. Have an agent specifically handle testing whether each implemented fix would have actually caught the original triggering event, since that's the step requiring real investigation rather than a checklist. Grade the finished plan against the regulator's actual letter, deficiency by deficiency, and flag any deficiency where the fix addresses the symptom the regulator cited but not the root cause underneath it, since that gap is what causes recurrence at the next exam.",
    },
    {
      title: "Reconcile two regulators' conflicting guidance on the same activity",
      combines: ["debate", "rag", "tree-of-thought", "evaluator"],
      prompt: "Two regulators with overlapping jurisdiction over the same business activity have issued guidance that, read literally, requires two different and partially incompatible controls, the company operates under both regulators' authority simultaneously, and the compliance calendar has an attestation to one of them due in three weeks. First, pull both regulators' actual guidance documents and any prior examination correspondence indicating how each has treated similar tension in other companies' programs, since a documented pattern of how each regulator has actually handled overlap in practice matters more than the literal text alone. Sketch two approaches — build to whichever regulator's requirement is stricter and treat that as satisfying both, or maintain genuinely separate parallel controls that each independently satisfy its own regulator — and argue for the stricter-satisfies-both approach against maintaining parallel controls, weighing operational cost and audit complexity against the residual risk that the stricter reading doesn't actually fully satisfy the other regulator's specific requirement despite appearing to. Grade the chosen approach against the upcoming attestation specifically, and if genuine doubt remains about whether it satisfies the other regulator too, recommend disclosing the approach proactively to that regulator rather than attesting silently and hoping it's never tested.",
    },
    {
      title: "Decide whether to self-disclose a historical filing error just discovered",
      combines: ["debate", "rag", "evaluator", "reflection"],
      prompt: "An internal audit just discovered that a required regulatory filing submitted eighteen months ago understated a reportable metric due to a since-fixed calculation error, the error was not caught by the regulator at the time, and regulatory affairs has to decide within days whether to proactively self-disclose the historical error or quietly correct it going forward without flagging the past filing. First, pull the actual regulation's self-disclosure provisions and any public enforcement precedent on how this specific regulator has treated voluntary versus discovered errors, since the decision should rest on the real regulatory framework's incentives, not on an instinct to avoid drawing attention. Argue the case for proactive self-disclosure — regulators typically treat voluntary, promptly corrected errors far more leniently than ones they discover independently later — against the case for quiet correction, on the ground that the error may be small enough it would never surface on its own and disclosure invites scrutiny that wouldn't otherwise happen. Draft the self-disclosure recommendation, then critique it once more specifically for whether choosing silence is actually a defensible judgment call or a rationalization to avoid short-term discomfort, since that distinction is exactly what a later enforcement review would scrutinize if the error is ever found some other way.",
    },
    {
      title: "Triage a backlog of regulatory change notices with limited review capacity",
      combines: ["router", "agent", "ensemble", "evaluator"],
      prompt: "The regulatory-change monitoring feed has produced 85 unreviewed notices across four product lines over the last two months because the one analyst who normally triages them was out on leave, some of these notices carry hard compliance deadlines that may already be close, and the team now has to catch up without simply reviewing them in the order they arrived. First, classify every notice by product line and by whether it's a substantive requirement change versus a routine administrative update, since the 85 notices are not equally urgent and treating them as one undifferentiated queue is how a real deadline gets missed at position 60. Within the substantive-change notices specifically, have an agent extract each one's actual compliance deadline and estimated implementation effort, and independently double-check the deadline extraction on a sample of them against the original notice text, since misreading a deadline here is the single costliest kind of error in this whole backlog. Sort the surviving substantive notices by nearest deadline rather than by product-line importance, and grade the final triage order against whether any notice with a deadline inside the next thirty days ended up anywhere but the top of the queue.",
    },
    {
      title: "Coordinate a multi-jurisdiction license renewal with different requirements per region",
      combines: ["multi-agent", "planner-executor", "rag", "evaluator"],
      prompt: "The company holds operating licenses in nine states, each with its own renewal cycle, its own required documentation, and its own recent changes to renewal criteria, three renewals fall due within the same six-week window this year for the first time, and missing any one of them halts operations in that state immediately with no grace period. First, dispatch a pass per state to pull that state's actual current renewal requirements and confirm what changed since the last renewal cycle, since assuming this year's requirements match last year's is exactly the kind of shortcut that causes a missed requirement in whichever state quietly updated its criteria. Plan the three overlapping renewals as parallel workstreams with their own internal deadlines working backward from each state's actual filing date, rather than treating the crunch as one combined effort, since document requirements genuinely differ and combining them risks assembling the wrong package for a given state. Grade each state's renewal package against that state's specific requirements checklist independently before submission, not against a generic combined checklist, and confirm explicitly, state by state, that nothing is still pending with fewer than five business days left before its deadline.",
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
