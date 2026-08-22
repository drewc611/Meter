// The 30-day prompt archive. Days 1-10 walk the ten control disciplines from
// "The ten disciplines of governed agentic DevSecOps"; days 11-24 walk the
// fourteen domains from "Fourteen domains of the governed agentic platform";
// days 25-30 walk the six build phases of the /challenge capstone project.
// Every "why" line is grounded in Andrew Clark's Enterprise Agentic DevSecOps
// Handbook -- nothing here is a generic productivity-prompt filler.
export const PROMPTS = [
  {
    day: 1,
    slug: "architecture-rule",
    title: "Find where reasoning and authority are collapsed",
    track: "Discipline 1 of 10 — Architecture rule",
    prompt:
      "In this repository, list every place Claude Code (or any agent) can currently execute an action directly, without a separate identity check, policy check, or CI gate in between. For each one, name the specific service, IAM principal, log source, and deployment gate that should sit between the model's decision and the action.",
    why:
      "The handbook's architecture rule: a model may recommend a tool call, but the tool contract, identity, policy engine, network path, and target system determine whether it executes. Mapping the control to a named service and log source is what makes the architecture reviewable and testable — rather than dependent on prompt wording.",
    whatToDo:
      "Turn each gap you find into a tracked follow-up: which existing service (an IAM role, a CI gate, a policy engine) should own that boundary, and who owns closing it.",
  },
  {
    day: 2,
    slug: "claude-code-workflow",
    title: "Write (or fix) your CLAUDE.md contract",
    track: "Discipline 2 of 10 — Claude Code workflow",
    prompt:
      "Read this repository's CLAUDE.md (or note that one doesn't exist). Does it tell an agent to discover the repo, read existing build instructions, inspect files before changing them, produce a plan, make the minimum change, run deterministic validation, and present a diff with evidence? Rewrite it so it does.",
    why:
      "The handbook's own CLAUDE.md contract: preserve existing security and CI workflows, reuse established patterns, run tests and validation before proposing a PR, never touch IAM or protected controls without approval, and summarize changed files, validation output, remaining risks, and rollback steps. A confident natural-language answer is not evidence that a build, policy check, or deployment is correct.",
    whatToDo:
      "Commit the rewritten CLAUDE.md as its own PR, and start requiring the same five things (diff, evidence, risks, rollback, validation output) in every agent-authored change from here on.",
  },
  {
    day: 3,
    slug: "repository-controls",
    title: "Protect the workflows the agent shouldn't be allowed to touch",
    track: "Discipline 3 of 10 — Repository controls",
    prompt:
      "List the files and workflows in this repository that an agent should never be allowed to rewrite just to make a build pass: security workflows, deployment definitions, shared modules, generated artifacts, sensitive configuration. Propose branch-protection or CODEOWNERS rules that enforce it.",
    why:
      "The handbook is explicit: do not allow the agent to rewrite enterprise guardrails simply to make a build pass. The point of naming these files is that the control becomes a named, testable rule instead of a hope.",
    whatToDo:
      "Add the protected paths to CODEOWNERS or a branch-protection rule today, not after the first incident.",
  },
  {
    day: 4,
    slug: "identity-boundary",
    title: "Audit what credentials the agent actually inherits",
    track: "Discipline 4 of 10 — Identity boundary",
    prompt:
      "Trace exactly what AWS or cloud credentials an agent session in this environment can use right now. Is it a scoped, short-lived workload identity, or does it inherit a developer's broad interactive permissions by default?",
    why:
      "Use workload identities and short-lived credentials; separate inbound user authentication from the agent's outbound authorization to tools and resources. Inheriting a developer's broad permissions by default is the single most common shortcut that undermines the whole model.",
    whatToDo:
      "If the answer is \"it inherits broad permissions,\" that's the fix to prioritize before anything else on this list — narrow it to a dedicated role first.",
  },
  {
    day: 5,
    slug: "tool-design",
    title: "Replace one broad tool with a narrow one",
    track: "Discipline 5 of 10 — Tool design",
    prompt:
      "Pick the single broadest tool or permission an agent has access to in this project (a shell, an admin role, an unscoped API key). Design a narrow, typed replacement: a clear purpose, constrained arguments, predictable output, a timeout, and an auditable authorization path.",
    why:
      "A good tool has a clear purpose, constrained arguments, predictable output, timeout behavior, and auditable authorization. The handbook's implementation note is blunt: convenience permissions granted during a pilot tend to survive into production and defeat the entire control model.",
    whatToDo:
      "Ship the narrow tool, then actually remove the broad one — a narrow tool that coexists with the old broad access doesn't change anything.",
  },
  {
    day: 6,
    slug: "validation",
    title: "List your independent validation gates",
    track: "Discipline 6 of 10 — Validation",
    prompt:
      "Enumerate every independent validation gate this repository's pipeline actually runs: unit tests, integration tests, terraform fmt/validate/plan, policy-as-code, SAST, SCA, container scanning, secrets scanning, artifact integrity. For each missing one, propose the smallest addition that would close the gap.",
    why:
      "These gates are independent on purpose — an agent's own confidence is not one of them. A confident natural-language answer is not evidence that a build, policy check, or deployment is correct.",
    whatToDo:
      "Add the highest-value missing gate (usually secrets scanning or SCA, if either is absent) this week, not as a someday item.",
  },
  {
    day: 7,
    slug: "approval",
    title: "Design the approval screen for a real change",
    track: "Discipline 7 of 10 — Approval",
    prompt:
      "For the last change an agent (or a human) shipped to this project, write out exactly what a reviewer would need to see before approving it: the proposed action, affected resources, policy result, validation evidence, and rollback plan. Is your current review process actually showing all five?",
    why:
      "Human approval should occur at a meaningful boundary, with the exact proposed action, affected resources, policy result, validation evidence, and rollback plan visible before authorization is requested — not a summary that trusts the agent's account of its own work.",
    whatToDo:
      "If your current PR template is missing the rollback plan or policy result, add those fields now.",
  },
  {
    day: 8,
    slug: "observability",
    title: "Reconstruct one execution path end to end",
    track: "Discipline 8 of 10 — Observability",
    prompt:
      "Pick one real change from this repository's history. Try to reconstruct, from your existing logs alone, the complete path: model invocation, tool call, identity used, policy decision, tool result, deployment event, health signal. Where does the trail go cold?",
    why:
      "Operators should be able to reconstruct the complete execution path from what's captured — model invocation, tool call, identity, policy decision, tool result, deployment event, health signal. Wherever the trail goes cold is exactly where an incident would be hardest to investigate.",
    whatToDo:
      "Instrument the first place the trail went cold before moving on to the next day's prompt.",
  },
  {
    day: 9,
    slug: "failure-handling",
    title: "Design the rollback you don't have yet",
    track: "Discipline 9 of 10 — Failure handling",
    prompt:
      "For your riskiest recent deployment, describe the retry, timeout, circuit-breaker, idempotency, dead-letter, and rollback behavior that actually exists today. Design the one that's missing.",
    why:
      "Retries, timeouts, circuit breakers, idempotency, dead-letter handling, and rollback need to be designed independently of the model — non-deterministic reasoning should sit inside deterministic operational boundaries, not depend on the agent behaving well.",
    whatToDo:
      "Test the rollback path you designed against a real (non-production) failure before you trust it.",
  },
  {
    day: 10,
    slug: "production-criterion",
    title: "Score this workflow against the production checklist",
    track: "Discipline 10 of 10 — Production criterion",
    prompt:
      "Score your current agent-assisted workflow against six criteria: named owner and business outcome; documented trust boundary and data path; scoped workload identity and explicit tool inventory; independent validation and security gates; human approval for high-consequence actions; observable execution, rollback, and retained evidence. Where does it fail?",
    why:
      "A workflow is production-ready only when permissions are bounded, validation is repeatable, rollback is tested, evidence is retained, and performance is measured against a human-only baseline — this is the handbook's own chapter checkpoint, applied to your own system instead of a hypothetical one.",
    whatToDo:
      "Treat any \"no\" on this list as a blocker for expanding the agent's access further, not a note for later.",
  },
  {
    day: 11,
    slug: "platform-operating-model",
    title: "Draw your own three-concern split",
    track: "Domain 1 of 14 — Platform operating model",
    prompt:
      "Draw your own version of the platform split: which part of your system does reasoning (the model), which part does engineering execution (repository-centered work), and which part holds enterprise authority (identity, policy, logging, deployment)? Name the actual service or team behind each box.",
    why:
      "The handbook's platform is intentionally split into three concerns — reasoning, engineering execution, and enterprise authority — precisely so that AWS identity, policy, network, logging, security, and deployment services determine what actions are permitted, not the model itself.",
    whatToDo:
      "If any box is empty (nothing currently holds \"enterprise authority\"), that's this week's highest-priority gap.",
  },
  {
    day: 12,
    slug: "cloud-transformation",
    title: "Frame the rollout as capability uplift, not replacement",
    track: "Domain 2 of 14 — Cloud transformation and enablement",
    prompt:
      "Write a one-page framing of your agentic-coding rollout using AWS CAF's four phases — Envision, Align, Launch, Scale. Be explicit that this is a controlled capability uplift, not a replacement for existing architecture, security, operations, or engineering accountability.",
    why:
      "The handbook is direct about the framing risk: introduce the platform as a controlled capability uplift, not as a replacement for architecture, security, operations, or engineering accountability — the same distinction that keeps a rollout from reading as a headcount threat.",
    whatToDo:
      "Share the one-pager with whoever owns security and platform architecture before the pilot starts, not after.",
  },
  {
    day: 13,
    slug: "claude-code-engineering",
    title: "Make your repository legible to an agent",
    track: "Domain 3 of 14 — Claude Code enterprise engineering",
    prompt:
      "Audit whether this repository is well-structured for an agent: explicit instructions, deterministic validation commands, a narrow set of tools. What's missing that would make Claude Code guess instead of know?",
    why:
      "Claude Code is most useful when it is given a well-structured repository, explicit instructions, deterministic validation commands, and a narrow set of tools — the repository becomes the operating context and CLAUDE.md becomes the durable engineering contract.",
    whatToDo:
      "Fix the single biggest source of ambiguity you find (usually missing or stale build instructions) before adding more agent access.",
  },
  {
    day: 14,
    slug: "claude-on-bedrock",
    title: "Separate model access from tool authority",
    track: "Domain 4 of 14 — Claude on Amazon Bedrock",
    prompt:
      "If you're using (or considering) Amazon Bedrock for governed model access, write out exactly what the model can decide vs. what IAM, identity, gateway, and policy actually decide on its behalf. Is that split enforced in code, or only in a document?",
    why:
      "Amazon Bedrock provides a governed model-access layer for Claude and other foundation models — keep model inference separate from tool authority. The model can decide what it wants to do; IAM, AgentCore Identity, Gateway, Policy, and downstream systems decide whether the action is allowed.",
    whatToDo:
      "If the split only exists in a document, that's the gap — enforce it with an actual IAM boundary this week.",
  },
  {
    day: 15,
    slug: "bedrock-agentcore",
    title: "Map your stack onto AgentCore's modular services",
    track: "Domain 5 of 14 — Amazon Bedrock AgentCore",
    prompt:
      "List which of AgentCore's modular services — Runtime, Memory, Gateway, Identity, Policy, built-in tools, Observability, Evaluations — your current setup already has an equivalent for, even informally, and which are genuinely missing.",
    why:
      "AWS positions AgentCore's services as composable — usable together or independently. Mapping your own stack against them surfaces which control is missing outright vs. which one already exists under a different name.",
    whatToDo:
      "Prioritize whichever is missing outright (usually Policy or Observability) over swapping out something that already works.",
  },
  {
    day: 16,
    slug: "mcp-identity-gateway-policy",
    title: "Check whether your MCP tools still need authorization",
    track: "Domain 6 of 14 — MCP, Identity, Gateway and Policy",
    prompt:
      "For every MCP-exposed tool in this project, confirm there's an authorization check downstream of it — not just a standardized interface. Where does authentication happen, and where does contextual authorization happen?",
    why:
      "MCP standardizes tool interaction but does not remove the need for authorization. A Gateway can centralize discovery and invocation, Identity handles authentication, and Policy applies contextual authorization to data-plane actions — three distinct jobs, easy to assume one covers the others.",
    whatToDo:
      "If any tool has standardized interaction but no policy check behind it, that tool is the priority fix.",
  },
  {
    day: 17,
    slug: "devsecops-pipelines",
    title: "Confirm CI/CD, not the agent, gates promotion",
    track: "Domain 7 of 14 — Agentic DevSecOps pipelines",
    prompt:
      "Trace your last agent-proposed change through your pipeline. At which step, exactly, did an independent system (not the agent) build, test, scan, package, approve, deploy, and verify the artifact? Name each step's owner.",
    why:
      "A coding agent should never be the only validation system for its own work — CI/CD must independently build, test, scan, package, approve, deploy, and verify the resulting artifact.",
    whatToDo:
      "Any step where the answer is \"the agent asserted this was fine\" is not yet a real gate — build the missing check.",
  },
  {
    day: 18,
    slug: "security-approval-boundaries",
    title: "Scale autonomy to consequence, explicitly",
    track: "Domain 8 of 14 — Security engineering and approval boundaries",
    prompt:
      "Sort your agent's current permissions into two buckets: things that can reasonably be automated (repository reads, searches, test execution, Terraform plans) and things that need stronger controls and explicit authorization (IAM mutation, production deployment, secrets operations, destructive actions, policy exceptions). Is anything in the wrong bucket today?",
    why:
      "Autonomy should scale with consequence. The handbook draws this line explicitly rather than leaving it implicit, because an implicit line is the one that gets crossed under deadline pressure.",
    whatToDo:
      "Move anything in the wrong bucket immediately — this is a security fix, not a backlog item.",
  },
  {
    day: 19,
    slug: "observability-evaluation",
    title: "Connect a request to its full trace",
    track: "Domain 9 of 14 — Observability and evaluation",
    prompt:
      "For one recent agent session, produce a single trace that connects the request to model activity, tool selection, policy decisions, tool results, latency, errors, and final outcome. What tooling would you need to make this a five-minute exercise instead of an hour of log archaeology?",
    why:
      "Agent systems require traces that connect a request to model activity, tool selection, policy decisions, tool results, latency, errors, and final outcomes — AgentCore Observability's answer is CloudWatch plus OpenTelemetry-compatible tracing, but the requirement holds regardless of stack.",
    whatToDo:
      "If this took more than a few minutes, that's your next observability investment, not a one-off exercise to repeat manually.",
  },
  {
    day: 20,
    slug: "dora-delivery-performance",
    title: "Put a number on whether the agent is actually helping",
    track: "Domain 10 of 14 — DORA and delivery performance",
    prompt:
      "Pull your deployment frequency, lead time for changes, change failure rate, and time to restore service for the periods before and after agent adoption. Alongside them, log agent-specific numbers: adoption, escalation rate, error rate, latency, cost.",
    why:
      "Agent adoption is successful only when the delivery system improves — measure the four DORA keys and reliability together with agent adoption, escalation, error, latency, and cost, not agent activity in isolation.",
    whatToDo:
      "If change failure rate went up alongside faster lead times, that's a real finding — don't let a faster number hide a riskier one.",
  },
  {
    day: 21,
    slug: "govcloud-regulated-workloads",
    title: "Check your region's actual authorization boundary",
    track: "Domain 11 of 14 — GovCloud and regulated workloads",
    prompt:
      "If you operate in a regulated environment (GovCloud, FedRAMP, similar), verify — against current official documentation, not memory or a blog post — the actual service availability and authorization boundary for every AWS service your agent stack depends on in that region.",
    why:
      "Regulated deployments must be built from the actual service availability and authorization boundary in the target region — network paths, identities, logging, KMS keys, data residency, egress, and evidence retention have to be designed before autonomous tool access is enabled, not discovered afterward.",
    whatToDo:
      "Any service you can't confirm in the current official scope table gets flagged for your account team before it's relied on.",
  },
  {
    day: 22,
    slug: "implementation-runbooks",
    title: "Write the runbook for your riskiest agent workflow",
    track: "Domain 12 of 14 — Implementation runbooks",
    prompt:
      "Write a complete runbook for your single riskiest production agent workflow: prerequisites, repository instructions, identity, tools, model access, validation, security checks, approval, deployment, observability, rollback, evidence collection.",
    why:
      "Each production workflow needs a repeatable runbook covering all of these — a workflow that only one person can operate from memory is not actually production-ready, whatever its test coverage looks like.",
    whatToDo:
      "Have someone who didn't write the runbook try to follow it — any step they can't complete from the doc alone is the fix.",
  },
  {
    day: 23,
    slug: "rollout-3060-90",
    title: "Set your own baseline before you expand",
    track: "Domain 13 of 14 — 30/60/90-day rollout",
    prompt:
      "Define the bounded workflow and the specific baseline metrics you'll compare it against before expanding agent access any further. What does \"measurable delivery benefit without increased failure, security exceptions, or operational burden\" actually look like for your team, in numbers?",
    why:
      "Start with bounded workflows and baseline metrics. Expand only after the pilot shows measurable delivery benefit without increased failure, security exceptions, or operational burden — not enthusiasm, adoption numbers, or a good demo.",
    whatToDo:
      "Write the expansion criteria down before you start the pilot — deciding them after you already like the results defeats the point of having a baseline.",
  },
  {
    day: 24,
    slug: "technical-reference",
    title: "Build your own service-to-control map",
    track: "Domain 14 of 14 — Technical reference",
    prompt:
      "Build your own version of a service reference table: every service or capability your agent stack touches, its role in your platform, and the specific control it's responsible for. Where two services seem to overlap in responsibility, pick one owner.",
    why:
      "The handbook consolidates service roles, control mappings, example instructions, and acceptance criteria into one reference specifically so nothing is left as an assumption — the same discipline applied to your own stack turns tribal knowledge into a reviewable document.",
    whatToDo:
      "Put this table in your repository's docs, not a slide deck — it needs to be as durable and reviewable as CLAUDE.md.",
  },
  {
    day: 25,
    slug: "capstone-foundation",
    title: "Build the foundation, before the agent gets write access",
    track: "Capstone 1 of 6 — Foundation",
    prompt:
      "Stand up the repository structure, a sandbox environment, a scoped workload identity, logging, and a real CLAUDE.md — with no agent write access yet. Confirm the repository and cloud boundary are fully operational without it.",
    why:
      "Exit criterion from the challenge's Foundation phase: the repository and cloud boundary are operational without agent write access. Everything else in the capstone depends on this existing first.",
    whatToDo:
      "Don't grant any agent access until this phase's exit criterion is genuinely met — it's tempting to skip ahead, and it's the one shortcut that undoes everything downstream.",
  },
  {
    day: 26,
    slug: "capstone-read-only-agent",
    title: "Let the agent look, before it can touch anything",
    track: "Capstone 2 of 6 — Read-only agent",
    prompt:
      "Enable repository discovery, search, architecture inspection, test discovery, and Terraform plan/read operations only. Confirm the agent can analyze the project and produce a plan without mutating any protected resource.",
    why:
      "Exit criterion: the agent can analyze the project and produce a plan without mutating protected resources. This phase proves the agent's reasoning is useful before you trust it with any authority at all.",
    whatToDo:
      "Have the agent produce a real plan for a real (small) change here, and review the plan itself — not just whether it eventually worked.",
  },
  {
    day: 27,
    slug: "capstone-controlled-change",
    title: "Let the agent make one small, reviewable change",
    track: "Capstone 3 of 6 — Controlled code change",
    prompt:
      "Enable scoped file edits, local validation, branch creation, and pull-request generation for one bounded change request. Confirm it produces a reviewable PR with deterministic validation evidence attached.",
    why:
      "Exit criterion: a bounded request produces a reviewable PR with deterministic validation evidence — the first time the agent's output is something a human actually reviews and approves, not just observes.",
    whatToDo:
      "Review this first PR unusually carefully — it's your first real signal for whether the guardrails from phases 1-2 are actually holding under real use.",
  },
  {
    day: 28,
    slug: "capstone-devsecops-gates",
    title: "Make sure the agent can't pass its own build",
    track: "Capstone 4 of 6 — DevSecOps gates",
    prompt:
      "Add tests, IaC validation, SAST, SCA, secrets and container scanning, policy checks, and artifact integrity to the pipeline. Then deliberately try to get a bad change through — an inserted secret, a disabled test, an unregistered cloud call — and confirm each one is caught.",
    why:
      "Exit criterion: the agent cannot make its own work pass without independent pipeline success. The required security tests from the capstone are explicit about this: disable a failing security workflow, insert a secret, attempt an unregistered cloud operation — each attempt must be refused or blocked, not merely logged.",
    whatToDo:
      "Run all six required security tests from the capstone (see the challenge page) before calling this phase done, not just the ones that occurred to you.",
  },
  {
    day: 29,
    slug: "capstone-approval-deploy",
    title: "Add the human decision, and the rollback that has to work",
    track: "Capstone 5 of 6 — Approval and deploy",
    prompt:
      "Add an approval state, a sandbox deployment step, health checks, and a rollback path. Force a failed health check on purpose and confirm the run records the failure and executes (or clearly presents) the rollback.",
    why:
      "Exit criterion: only approved, validated artifacts reach the sandbox environment. The capstone's required test here is specific: force a failed sandbox health check after deployment, and the run must record failure and execute or present the defined rollback path — an untested rollback is not a rollback.",
    whatToDo:
      "If the forced failure didn't produce a clean rollback, fix that before treating this phase as complete — it's the one failure mode you don't want to discover in a real incident.",
  },
  {
    day: 30,
    slug: "capstone-observability-evaluation",
    title: "Reconstruct the whole run from one correlation ID",
    track: "Capstone 6 of 6 — Observability and evaluation",
    prompt:
      "Correlate model, tool, policy, CI, approval, deployment, latency, cost, and outcome data under a single execution ID. Confirm an operator who wasn't involved in the run can reconstruct exactly what happened and compare it against your human-only baseline.",
    why:
      "Exit criterion: an operator can reconstruct a run and compare it with the baseline. This is also the capstone's evidence package and final-demonstration bar — the demo is successful only if the controls are visible, not merely if the code works.",
    whatToDo:
      "Hand the evidence package to someone who wasn't in the room for the run and ask them to explain what happened — if they can't, the observability isn't done yet. Then move on to running the full capstone end to end on the challenge page.",
  },
];
