import { Fragment } from "react";
import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "guides/ai-system-design-patterns.html",
  title: "AI System Design Patterns — Merit AC Guides",
  description:
    "A field guide to how AI systems get designed in general -- twelve archetypes, six complex agent patterns, and the ML/AI software landscape, each with a diagram. Independent of the Merit AC product itself.",
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

export default function AISystemPatterns() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide</span>
      <span className="badge">
        <i /> Independent of the product
      </span>
      <h1>AI system design patterns</h1>
      <p className="lead">
        A field guide to how AI systems get designed in general — twelve archetypes, six complex
        agent patterns that compound them, and the software landscape they're built out of.
        Read it whether or not you use Merit AC.
      </p>

      <Toc
        items={[
          { href: "#archetypes", label: "AI system archetypes: diagrams, when to use, prompts to try" },
          { href: "#complex-agents", label: "Complex agent patterns: compounding the basics" },
          { href: "#tooling", label: "The ML/AI software landscape" },
        ]}
      />

      <h2 id="archetypes">1. AI system archetypes: diagrams, when to use, prompts to try</h2>
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

      <h2 id="complex-agents">2. Complex agent patterns: compounding the basics</h2>
      <p>
        These six build on the archetypes above rather than replacing them — a debate setup is
        two agentic loops plus a judge; a planner-executor is a loop wrapped around another
        loop. Reach for one of these once a single archetype above genuinely isn't enough, not
        as a default starting point — each one adds real complexity (more calls, more places to
        debug, more cost) that has to be worth it.
      </p>

      <TileNav items={COMPLEX_AGENTS} />

      {COMPLEX_AGENTS.map((entry) => (
        <ArchetypeCard entry={entry} key={entry.id} />
      ))}

      <h2 id="tooling">3. The ML/AI software landscape</h2>
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

    </ContentLayout>
  );
}
