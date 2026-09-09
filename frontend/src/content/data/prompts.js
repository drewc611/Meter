// The 30-day prompt archive. Days 1-10 walk the ten control disciplines from
// "The ten disciplines of governed agentic DevSecOps"; days 11-24 walk the
// fourteen domains from "Fourteen domains of the governed agentic platform";
// days 25-30 walk the six build phases of the /challenge capstone project.
// Every "why" line is grounded in the team's own Enterprise Agentic DevSecOps
// Handbook -- nothing here is a generic productivity-prompt filler.
//
// Each `prompt` is a full role + context + numbered-steps + constraints +
// output-format structure, written to be pasted as-is into either ChatGPT or
// Claude (or any other chat assistant) -- no tool-specific assumptions like
// live repo access, since not every reader's assistant has that. Where the
// task needs the repo, the prompt tells the reader what to paste in.
export const PROMPTS = [
  {
    day: 1,
    slug: "architecture-rule",
    title: "Find where reasoning and authority are collapsed",
    track: "Discipline 1 of 10 — Architecture rule",
    prompt:
      "Act as a security architect brought in after a routine pull request from an AI coding agent turned out to have quietly touched deployment permissions nobody remembered granting it -- now leadership wants a full map of how much autonomous authority the agent holds everywhere else, before it happens again.\n\nContext: I'm going to paste in a directory listing, a CI/CD config, and any IAM or deployment policy files from my repository. In a governed setup, a model may recommend a tool call, but identity, policy, network, and deployment systems decide whether it actually executes -- reasoning and authority are supposed to be separate layers, not collapsed into one.\n\nDo the following, in order:\n1. List every place in what I paste where an agent could execute an action directly, with no separate identity check, policy check, or CI gate sitting between the model's decision and the action.\n2. For each one, name the specific service, IAM principal, log source, and deployment gate that should sit in between, even if it doesn't exist yet.\n3. Rank the list by blast radius if that action were taken incorrectly -- what's the worst plausible outcome.\n\nConstraints:\n- Don't recommend removing agent capability wholesale; the goal is inserting a control point, not blocking use of the agent.\n- Cite the actual file, script, or config line each gap lives in, not a general category.\n- If nothing I paste shows an existing control, say so plainly instead of inferring one that might exist elsewhere.\n\nOutput format: a table with columns Location, Current control (if any), Missing control, Owner -- followed by one paragraph naming the single highest-blast-radius gap.",
    why:
      "The handbook's architecture rule: a model may recommend a tool call, but the tool contract, identity, policy engine, network path, and target system determine whether it executes. Mapping the control to a named service and log source is what makes the architecture reviewable and testable — rather than dependent on prompt wording.",
    whatToDo:
      "Turn each row into a tracked follow-up: which existing service (an IAM role, a CI gate, a policy engine) should own that boundary, and who owns closing it.",
  },
  {
    day: 2,
    slug: "claude-code-workflow",
    title: "Write (or fix) your agent instructions file",
    track: "Discipline 2 of 10 — Persistent agent instructions",
    prompt:
      "Act as a staff engineer asked to write a persistent AI-agent instructions file (CLAUDE.md, AGENTS.md, a Cursor rules file, or your tool's equivalent) after a new hire's very first agent-assisted commit skipped the test suite entirely, simply because nothing in the repository ever told the agent that was off-limits.\n\nContext: I'll paste in my repository's current instructions file if one exists, plus a short description of the project (language, build tool, test command, deploy process). If no file exists, I'll say so and describe the project instead.\n\nDo the following, in order:\n1. Assess whether the current file (or the absence of one) tells an agent to discover the repo, read existing build instructions, inspect files before changing them, produce a plan, make the minimum change, run deterministic validation, and present a diff with evidence.\n2. Rewrite it so it does all of that, in the fewest words that still cover each point.\n3. Add one explicit line prohibiting the agent from disabling tests, scanners, or protected workflows to make its own change pass.\n\nConstraints:\n- Keep the whole file short enough that a human would actually read it end to end -- prefer terse, testable statements over prose.\n- Every instruction must be something a reviewer could verify happened or didn't, not a vague aspiration.\n- Don't invent project-specific commands I haven't told you; ask for them if they're missing.\n\nOutput format: the complete rewritten file, ready to save, followed by a 3-bullet list of what changed and why.",
    why:
      "The handbook's own CLAUDE.md contract: preserve existing security and CI workflows, reuse established patterns, run tests and validation before proposing a PR, never touch IAM or protected controls without approval, and summarize changed files, validation output, remaining risks, and rollback steps. A confident natural-language answer is not evidence that a build, policy check, or deployment is correct.",
    whatToDo:
      "Commit the rewritten instructions file as its own PR, and start requiring the same five things (diff, evidence, risks, rollback, validation output) in every agent-authored change from here on.",
  },
  {
    day: 3,
    slug: "repository-controls",
    title: "Protect the workflows the agent shouldn't be allowed to touch",
    track: "Discipline 3 of 10 — Repository controls",
    prompt:
      "Act as a repository administrator who just noticed an agent \"fixed\" a failing lint check by loosening the rule instead of touching the code -- a near-miss that means every protected workflow needs a second look before something bigger slips through the same way.\n\nContext: I'll paste in my repository's file tree (or a rough description of it) and my current CODEOWNERS / branch-protection config, if any.\n\nDo the following, in order:\n1. Identify the files and workflows an agent should never be allowed to rewrite just to make a build pass -- security workflows, deployment definitions, shared infrastructure modules, generated artifacts, sensitive configuration.\n2. For each one, propose a specific branch-protection rule or CODEOWNERS entry that enforces it.\n3. Flag any of those paths that are currently unprotected today, based on what I gave you.\n\nConstraints:\n- Only flag a path as unprotected if I actually showed you evidence of that -- don't assume based on typical setups.\n- Prefer the smallest rule that closes the gap over a blanket \"require review on everything\" rule that would create review fatigue.\n\nOutput format: a CODEOWNERS-file snippet plus a short table of Path → Rule → Reason.",
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
      "Act as a cloud identity reviewer pulled in ahead of a compliance audit to answer one uncomfortable question: exactly what credentials does the AI agent's runtime session actually inherit, and has anyone ever actually checked.\n\nContext: I'll paste in the IAM role, service account, or credential configuration my agent's environment currently runs under (or describe it if I don't have it in front of me -- e.g. \"it uses my own AWS CLI profile\").\n\nDo the following, in order:\n1. Trace exactly what cloud credentials the agent session can use right now.\n2. Determine whether this is a scoped, short-lived workload identity, or whether it inherits a developer's broad interactive permissions by default.\n3. If it's the latter, design a narrower replacement role: name the specific permissions it actually needs based on what I've described the agent doing, and nothing more.\n\nConstraints:\n- Assume the answer might be \"it inherits broad permissions\" -- don't soften that finding to avoid an awkward conclusion.\n- The narrower role proposal must be specific (named IAM actions/resources), not \"apply least privilege\" as an abstract instruction.\n\nOutput format: one paragraph stating the current inheritance model plainly, followed by a proposed least-privilege policy in whatever format matches my cloud provider (IAM JSON, an equivalent).",
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
      "Act as an API designer asked to replace the single broadest tool an agent has access to, after a scaling review flagged it as the one permission nobody in the room could actually explain the boundaries of.\n\nContext: I'll describe the single broadest tool or permission an agent has access to in my project right now -- a shell, an admin role, an unscoped API key, or similar.\n\nDo the following, in order:\n1. Design a narrow, typed replacement for it: state its single clear purpose, its constrained argument shape, its predictable output shape, a sensible timeout, and an auditable authorization path.\n2. Write the interface for it (a function signature, an OpenAPI-style spec, or pseudocode -- pick whatever fits what I described).\n3. List exactly what the old broad tool could do that the new narrow one deliberately can't, and confirm none of those are actually required.\n\nConstraints:\n- If step 3 turns up something the narrow tool genuinely can't cover, say so instead of quietly dropping the requirement -- that's a real gap to solve, not skip.\n- Don't design a second tool \"just in case\" beyond what I described needing.\n\nOutput format: the tool's interface definition, followed by a short table of Old capability → Still covered? → How.",
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
      "Act as a DevSecOps pipeline auditor called into a postmortem where the root cause turned out to be a validation step everyone had assumed was running, until it turned out nothing had ever actually wired it into CI.\n\nContext: I'll paste in (or describe) my CI/CD pipeline config -- what steps run on every pull request today.\n\nDo the following, in order:\n1. Enumerate which of these independent gates my pipeline actually runs: unit tests, integration tests, terraform fmt/validate/plan (or equivalent IaC checks), policy-as-code, SAST, SCA, container scanning, secrets scanning, artifact integrity.\n2. For each one that's missing, propose the smallest concrete addition that would close the gap -- a specific tool or GitHub Action, not \"add security scanning.\"\n3. Rank the missing gates by how likely they are to catch something an agent's own confident-sounding output would otherwise slip through.\n\nConstraints:\n- Base the \"already have\" list only on what I actually showed you in the config, not on assumption.\n- Prefer gates that fail the build outright over ones that only warn, unless I tell you warn-only is a deliberate choice.\n\nOutput format: a checklist (have / missing) followed by the top recommendation with the exact tool/action to add first.",
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
      "Act as a reviewer preparing for an internal audit that's asking a blunt question: what does a human actually see before approving an agent-proposed production change here, versus what everyone just takes on faith.\n\nContext: I'll describe (or paste the PR/diff for) the last real change shipped to my project, whether an agent or a human wrote it.\n\nDo the following, in order:\n1. Write out exactly what a careful reviewer would need to see before approving that specific change: the proposed action, the affected resources, the policy result (did anything get flagged and cleared), the validation evidence (what actually ran and passed), and the rollback plan.\n2. Compare that list against what my actual review process showed for this change -- was all five actually visible, or did the review just trust a written summary?\n3. Point out, specifically, any of the five that were missing or only implied rather than shown.\n\nConstraints:\n- Judge only against what I gave you -- don't assume a field existed if I didn't show it to you.\n- Be specific about *where* each missing piece should have appeared (a PR template field, a CI status check, a comment), not just that it was missing.\n\nOutput format: the five-item checklist with a ✅/❌/⚠️ for this change, followed by one sentence on the single most important gap to fix in the review template.",
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
      "Act as an incident investigator paged after an agent-assisted deployment went sideways overnight, tasked with reconstructing exactly what happened using nothing but whatever logs already exist.\n\nContext: I'll pick one real change from my project's recent history and describe what logs, dashboards, or history I actually have access to for it (CI logs, deploy logs, application logs, git history, whatever exists).\n\nDo the following, in order:\n1. Walk the complete path you'd need to reconstruct: model invocation (if an agent was involved), tool call, identity used, policy decision, tool result, deployment event, health signal.\n2. Based only on what I said I have access to, tell me exactly where that trail would go cold -- the first point where you (or a real investigator) couldn't answer \"what happened here and why.\"\n3. Propose the single cheapest instrumentation addition that would close that specific gap, not a general \"add more logging\" recommendation.\n\nConstraints:\n- Don't assume a data source exists unless I told you it does.\n- The instrumentation proposal has to name what to log, where, and in what format -- specific enough to hand to an engineer as a ticket.\n\nOutput format: a short numbered trace of the path with a clear \"⚠️ TRAIL GOES COLD HERE\" marker, followed by the one instrumentation fix to prioritize.",
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
      "Act as a reliability engineer assigned to fix this after an on-call page for a failed deployment revealed there was no defined rollback at all -- just whoever happened to be awake, improvising.\n\nContext: I'll describe my riskiest recent deployment and what I know about its current retry, timeout, circuit-breaker, idempotency, dead-letter, and rollback behavior -- including \"none of the above exist\" if that's true.\n\nDo the following, in order:\n1. State clearly which of retries, timeouts, circuit breakers, idempotency, dead-letter handling, and rollback actually exist today for this deployment, based only on what I told you.\n2. Design the single most important one that's missing, in enough detail to implement (not just name it) -- specify the trigger condition, the exact recovery action, and how success is confirmed.\n3. Describe one concrete way to test the design you just proposed without touching production.\n\nConstraints:\n- Design behavior independently of any AI agent's judgment at failure time -- these need to be deterministic operational mechanisms, not \"have the agent decide what to do if it fails.\"\n- Keep the design scoped to the one gap you identified as most important; don't try to design all six at once.\n\nOutput format: a short design doc (trigger → action → confirmation) for the one mechanism, plus the test plan.",
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
      "Act as an engineering director deciding, ahead of a proposal to expand an agent-assisted workflow to a second team, whether the first team's setup actually deserves to be the template everyone else copies.\n\nContext: I'll describe my current agent-assisted workflow -- what the agent is allowed to touch, what runs to validate its work, and what approval/observability exists, based on what I've worked through in the last nine days of this series (or describe it fresh if this is your first prompt from this archive).\n\nDo the following, in order:\n1. Score the workflow against six criteria: named owner and business outcome; documented trust boundary and data path; scoped workload identity and explicit tool inventory; independent validation and security gates; human approval for high-consequence actions; observable execution, rollback, and retained evidence.\n2. For each criterion, give a clear pass/fail/partial based only on what I described -- no benefit of the doubt.\n3. Name the single criterion that, if it stays unaddressed, poses the biggest risk to expanding this workflow's access further.\n\nConstraints:\n- Don't average the six into one vague overall score -- report each one distinctly, since a single failing criterion can undermine the rest.\n- If I didn't give you enough information to judge a criterion, say \"insufficient information\" rather than guessing pass or fail.\n\nOutput format: a six-row scorecard (Criterion, Status, Why), followed by one paragraph naming the top blocker.",
    why:
      "A workflow is production-ready only when permissions are bounded, validation is repeatable, rollback is tested, evidence is retained, and performance is measured against a human-only baseline — this is the handbook's own chapter checkpoint, applied to your own system instead of a hypothetical one.",
    whatToDo:
      "Treat any failing or partial score on this list as a blocker for expanding the agent's access further, not a note for later.",
  },
  {
    day: 11,
    slug: "platform-operating-model",
    title: "Draw your own three-concern split",
    track: "Domain 1 of 14 — Platform operating model",
    prompt:
      "Act as a platform architect asked by a new engineering lead a deceptively simple question -- who actually holds authority when an AI assistant proposes a change here -- and realizing the honest answer isn't written down anywhere yet.\n\nContext: I'll describe my current tools and process for AI-assisted engineering -- which AI assistant(s) I use, how code changes get made and reviewed, and what (if anything) enforces identity, policy, or deployment controls today.\n\nDo the following, in order:\n1. Draw the three-concern split for what I described: which part does reasoning (the model), which part does engineering execution (repository-centered work: branches, tests, PRs), and which part holds enterprise authority (identity, policy, logging, deployment).\n2. For each of the three, name the actual service, tool, or team currently filling that role -- or write \"none\" if nothing currently does.\n3. If any box is \"none,\" propose the smallest realistic first step to start filling it, given my described setup.\n\nConstraints:\n- Don't invent a team or tool I didn't mention -- if I only described using a chat-based AI assistant with no repo access, say the engineering-execution and enterprise-authority boxes are effectively unfilled and mean it.\n- Keep the first-step proposal genuinely small -- something achievable this week, not a platform initiative.\n\nOutput format: a three-row table (Concern, Current owner, First step if empty).",
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
      "Act as an internal communications lead preparing for an all-hands where engineers have already started asking, pointedly, whether this rollout is really about capability or a quieter way to cut headcount.\n\nContext: I'll describe the current scale of AI-assisted engineering adoption at my organization -- a pilot team, a broader rollout, or something in between -- and any concerns I've already heard from engineers, security, or leadership.\n\nDo the following, in order:\n1. Write a one-page framing of the rollout using AWS CAF's four phases -- Envision, Align, Launch, Scale -- adapted to what I described.\n2. Make it explicit throughout that this is a controlled capability uplift, not a replacement for existing architecture, security, operations, or engineering accountability.\n3. Directly address the specific concerns I mentioned, rather than generic reassurance.\n\nConstraints:\n- Don't promise timelines, headcount outcomes, or cost savings I didn't give you numbers for.\n- Keep the framing honest about what's still unproven at this stage, rather than overselling readiness.\n\nOutput format: the one-page document, headed by phase (Envision / Align / Launch / Scale), each with 2-4 sentences.",
    why:
      "The handbook is direct about the framing risk: introduce the platform as a controlled capability uplift, not as a replacement for architecture, security, operations, or engineering accountability — the same distinction that keeps a rollout from reading as a headcount threat.",
    whatToDo:
      "Share the one-pager with whoever owns security and platform architecture before the pilot starts, not after.",
  },
  {
    day: 13,
    slug: "claude-code-engineering",
    title: "Make your repository legible to an agent",
    track: "Domain 3 of 14 — Agentic-ready repository engineering",
    prompt:
      "Act as a developer-experience engineer investigating why every agent session on this repository keeps guessing at build and test steps a new human hire would find in five minutes.\n\nContext: I'll paste my repository's file tree, its README or setup docs, and its test/build commands (or describe them if I don't have them written down).\n\nDo the following, in order:\n1. Audit the repository for explicit instructions, deterministic validation commands, and a narrow, discoverable set of tools/scripts -- the things that make a repo legible to an agent rather than something it has to guess about.\n2. List, specifically, what's missing or stale that would make an agent guess instead of know -- a build command that isn't documented, a test suite that isn't obviously the one to run, an undocumented deploy step.\n3. Rewrite or draft the single most impactful missing piece of documentation.\n\nConstraints:\n- Only flag something as missing if I actually didn't provide it -- don't assume gaps in a repo you haven't fully seen.\n- The rewritten documentation should be something a human would also find useful, not agent-only boilerplate.\n\nOutput format: a bulleted gap list, followed by the one drafted fix in full.",
    why:
      "Claude Code, ChatGPT with repo access, and similar tools are most useful when given a well-structured repository, explicit instructions, deterministic validation commands, and a narrow set of tools — the repository becomes the operating context and a durable instructions file becomes the engineering contract.",
    whatToDo:
      "Fix the single biggest source of ambiguity you find (usually missing or stale build instructions) before adding more agent access.",
  },
  {
    day: 14,
    slug: "claude-on-bedrock",
    title: "Separate model access from tool authority",
    track: "Domain 4 of 14 — Governed model access",
    prompt:
      "Act as a platform engineer reviewing model-access architecture ahead of a migration off direct API keys onto a managed platform, specifically to confirm the switch actually changes who's in control and not just who gets billed.\n\nContext: I'll describe how my team currently accesses AI models (direct API keys, a managed platform like Bedrock or Azure OpenAI, a chat UI subscription) and what -- if anything -- sits between the model's output and an actual action being taken.\n\nDo the following, in order:\n1. Write out exactly what the model can decide vs. what identity, gateway, and policy systems actually decide on its behalf, based on what I described.\n2. Determine whether that split is currently enforced in code/infrastructure, or only exists as an assumption or a document somewhere.\n3. If it's only a document (or doesn't exist at all), propose the smallest concrete enforcement mechanism to add -- specific enough to be a ticket.\n\nConstraints:\n- Don't assume a managed platform automatically means the split is enforced -- ask what specifically enforces it if I haven't said.\n- The enforcement proposal must name an actual mechanism (an IAM boundary, a gateway policy, an approval step), not \"add governance.\"\n\nOutput format: two short columns (Model decides / Infrastructure decides) followed by the enforcement gap and fix.",
    why:
      "Managed model-access layers like Amazon Bedrock or Azure OpenAI keep model inference separate from tool authority in principle — but the model still only decides what it wants to do; identity, gateway, policy, and downstream systems decide whether the action is actually allowed.",
    whatToDo:
      "If the split only exists in a document, that's the gap — enforce it with an actual IAM or gateway boundary this week.",
  },
  {
    day: 15,
    slug: "bedrock-agentcore",
    title: "Map your stack onto AgentCore's modular services",
    track: "Domain 5 of 14 — Amazon Bedrock AgentCore",
    prompt:
      "Act as a solutions architect asked, ahead of a platform spending decision, to justify which parts of a proposed managed agent platform close a real gap versus quietly duplicating something already built in-house.\n\nContext: I'll describe my current agent infrastructure across whatever categories apply: how sessions run, how memory/context works, how tools are exposed, how identity is handled, how policy is enforced, what's built in vs. custom, what observability exists, and whether any evaluation process exists.\n\nDo the following, in order:\n1. Go through AgentCore's modular service categories -- Runtime, Memory, Gateway, Identity, Policy, built-in tools, Observability, Evaluations -- and for each, note whether my current setup has an equivalent, even an informal one.\n2. Separate the list into \"have an equivalent\" vs. \"genuinely missing.\"\n3. Prioritize the genuinely-missing list by which gap creates the most risk if left unaddressed.\n\nConstraints:\n- Don't assume AgentCore (or any specific vendor product) is the only way to fill a gap -- the point is identifying the gap, not prescribing the fix.\n- Base \"have an equivalent\" only on what I actually described, not on typical setups.\n\nOutput format: an 8-row table (Category, Have equivalent?, Notes), followed by the prioritized missing list.",
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
      "Act as a security reviewer who just discovered that a newly connected MCP tool had a clean, well-documented interface and, on closer look, no actual authorization check behind it at all -- which means every other tool on the list needs the same question asked before it's trusted again.\n\nContext: I'll list the MCP servers or tools my agent has access to, and describe what I know about how each one authenticates and authorizes requests, if anything.\n\nDo the following, in order:\n1. For each tool, confirm whether authentication (proving who's calling) and contextual authorization (deciding whether that caller can do this specific thing, right now) both actually exist -- these are two distinct checks, not one.\n2. Flag any tool where the interface is standardized (looks clean, documented, typed) but no policy check actually sits behind it.\n3. For the highest-risk flagged tool, propose the specific authorization check to add.\n\nConstraints:\n- A tool having a well-documented schema is not evidence of authorization -- don't credit it as \"secure\" on that basis alone.\n- If I didn't describe an authorization mechanism for a tool, treat it as absent, not \"probably fine.\"\n\nOutput format: a table (Tool, Authenticates?, Authorizes?, Risk) followed by the one fix to prioritize.",
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
      "Act as a release engineer reconstructing, after a bad change reached production, exactly which pipeline stage was supposed to catch it and whether that stage actually ran or was just assumed to.\n\nContext: I'll describe (or paste evidence for) my last agent-proposed change as it moved through my pipeline -- build, test, scan, package, approve, deploy, verify.\n\nDo the following, in order:\n1. Walk each stage the change passed through, and for each, name the independent system that actually built, tested, scanned, packaged, approved, deployed, or verified it.\n2. Flag any stage where the real answer is \"the agent asserted this was fine\" rather than an independent system confirming it.\n3. For the first flagged stage, describe the smallest concrete check that would turn it into a real gate.\n\nConstraints:\n- A coding agent's own summary of \"tests passed\" is not evidence unless a CI system actually ran them -- treat agent self-report as unverified by default.\n- Stay grounded in the specific change I described; don't generalize to \"pipelines in general.\"\n\nOutput format: a stage-by-stage trace (Stage → Verifier → Verified or asserted?) followed by the one fix to build next.",
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
      "Act as a security lead drawing the line that should have existed before an agent, working late under deadline pressure, came close to doing something it shouldn't have -- now every permission on the list needs an explicit answer instead of an assumed one.\n\nContext: I'll list every permission or capability my agent currently has, as completely as I can.\n\nDo the following, in order:\n1. Sort the list into two buckets: things that can reasonably be automated (repository reads, searches, test execution, infrastructure plans/dry-runs) and things that need stronger controls and explicit human authorization (IAM mutation, production deployment, secrets operations, destructive actions, policy exceptions).\n2. Check the sort against what I described the agent is actually allowed to do today, and flag anything currently in the wrong bucket.\n3. For each misplaced item, state the specific control that needs to be added before it can safely stay automated (or the specific approval step needed to keep it manual).\n\nConstraints:\n- When genuinely unsure which bucket something belongs in, put it in the stronger-control bucket and say why, rather than defaulting to automated.\n- Don't add hypothetical permissions I didn't list.\n\nOutput format: two labeled lists (Can automate / Needs explicit authorization), with misplaced items marked and their fix noted inline.",
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
      "Act as an observability engineer asked, after a teammate spent an afternoon unable to explain what a confusing agent session had actually done, to see how long a real trace reconstruction takes with the tooling that exists today.\n\nContext: I'll describe one recent agent session -- what I asked for, what tools it used if any, and what monitoring or logging tooling I currently have available (CloudWatch, Datadog, plain application logs, nothing yet).\n\nDo the following, in order:\n1. Produce (or sketch, if you don't have all the data) a single trace connecting the request to model activity, tool selection, policy decisions, tool results, latency, errors, and the final outcome for that session.\n2. Note how long this reconstruction actually took you, given only what I provided.\n3. Name the specific tooling gap that would need to close to make this a five-minute exercise instead of log archaeology, based on what I said I currently have.\n\nConstraints:\n- If a piece of the trace is unavailable from what I gave you, mark it as a gap rather than fabricating what it probably was.\n- Recommend tooling appropriate to what I described having (don't recommend a full observability platform if I said I have nothing yet -- start smaller).\n\nOutput format: the trace as a numbered sequence with gaps marked, followed by one paragraph on the tooling investment to make next.",
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
      "Act as an engineering-metrics analyst preparing for a leadership review where the question on the agenda is blunt: is agent adoption actually making delivery better, or just busier.\n\nContext: I'll give you whatever numbers I have -- deployment frequency, lead time for changes, change failure rate, and time to restore service, for periods before and after agent adoption, plus any agent-specific numbers I track (adoption rate, escalation rate, error rate, latency, cost). I'll say plainly which of these I don't have.\n\nDo the following, in order:\n1. Lay out the four DORA metrics before vs. after, based only on the numbers I gave you.\n2. Lay out the agent-specific numbers alongside them.\n3. Call out explicitly if any metric moved in a direction that looks good on its surface but might be masking a problem -- e.g. faster lead time alongside a rising change failure rate.\n\nConstraints:\n- Don't compute or estimate a number I didn't give you -- ask for it or mark it unknown.\n- Don't declare success or failure from partial data; say what's missing to reach a real conclusion if that's the case.\n\nOutput format: a before/after table for all metrics provided, followed by one paragraph flagging any concerning combination.",
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
      "Act as a compliance-aware cloud architect asked, ahead of an upcoming compliance audit, to confirm a regulated deployment's design still matches actual current service availability in its region rather than what was true when it was first built.\n\nContext: I'll tell you which regulated environment applies (GovCloud, FedRAMP, another regime), which region, and which AWS (or other cloud) services my agent stack depends on.\n\nDo the following, in order:\n1. For each service I listed, state clearly whether you can confirm its availability and authorization boundary in that region from what you know, or whether it needs to be verified against current official documentation before relying on it.\n2. For any service you can't confirm, say so explicitly rather than guessing based on general availability elsewhere.\n3. List the specific design elements (network paths, identities, logging, KMS keys, data residency, egress, evidence retention) that need to be verified before autonomous tool access is enabled.\n\nConstraints:\n- Never state a regulated-region service scope as fact from memory alone -- flag it as needing verification against current official documentation instead, since these boundaries change.\n- Don't skip a service just because it's commonly available elsewhere.\n\nOutput format: a table (Service, Can confirm from general knowledge?, Needs official verification?) followed by the design-element checklist.",
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
      "Act as a site-reliability engineer asked to finally write down a production agent workflow after the one person who understands it end to end announces they're moving to a different team next month.\n\nContext: I'll describe my single riskiest production agent workflow end to end, as completely as I can -- what triggers it, what it touches, who normally operates it.\n\nDo the following, in order:\n1. Write a complete runbook covering: prerequisites, repository/agent instructions, identity used, tools available, model access, validation steps, security checks, approval step, deployment step, observability, rollback procedure, and evidence collection.\n2. For any section where I didn't give you enough detail to write it concretely, write it as an explicit open question rather than inventing plausible-sounding detail.\n3. List the open questions separately at the end so they're easy to track down.\n\nConstraints:\n- A runbook section that just restates \"the agent handles this\" isn't acceptable -- every section needs a concrete, human-followable procedure.\n- Don't pad the runbook with generic boilerplate advice not specific to what I described.\n\nOutput format: the full runbook in the twelve sections listed, followed by a numbered list of open questions to resolve.",
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
      "Act as a program lead under pressure to expand an AI-agent pilot to more teams simply because people like it, and needing real criteria to decide whether that expansion is actually earned yet.\n\nContext: I'll describe the current bounded scope of my agent rollout (which team, which repos, which workflows) and any metrics I'm already tracking.\n\nDo the following, in order:\n1. Define the specific baseline metrics that matter for this rollout -- pulling from what I'm already tracking where possible, and naming what's missing where it isn't.\n2. Write concrete numeric or behavioral thresholds for what \"measurable delivery benefit without increased failure, security exceptions, or operational burden\" means for my team specifically -- not the abstract phrase, actual numbers or conditions.\n3. Write the criteria as a decision I could hand to someone else to evaluate objectively later, without me in the room to interpret it.\n\nConstraints:\n- Don't let \"the pilot went well\" or \"the team likes it\" count as a criterion on its own -- those are inputs, not the bar.\n- If I haven't given you enough to set a specific number for something, say what data needs to be collected first rather than inventing a threshold.\n\nOutput format: a short table (Metric, Baseline today, Expansion threshold) plus one paragraph on what to collect before the criteria can be finalized if gaps remain.",
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
      "Act as a platform documentation lead asked, during an access review, to produce a single reference showing which service in the agent stack owns which control -- because right now that answer lives in a few people's heads, and no two versions quite agree.\n\nContext: I'll list every service or capability my agent stack touches, as completely as I can -- cloud services, internal platforms, third-party tools.\n\nDo the following, in order:\n1. For each one, state its role in the platform and the specific control it's responsible for (identity, policy, logging, validation, deployment, or whatever applies).\n2. Where two services seem to overlap in responsibility, flag it explicitly and propose which one should be the single owner.\n3. Format the result as something durable enough to live in the repository's docs, not a one-off answer.\n\nConstraints:\n- Don't leave any listed service without an assigned control or an explicit \"no control currently, needs one\" -- no silent omissions.\n- Where you flag an overlap, give a reason for which owner you'd pick, not just \"pick one.\"\n\nOutput format: a markdown table (Service, Role, Control owned, Notes) ready to paste into a docs file.",
    why:
      "The handbook consolidates service roles, control mappings, example instructions, and acceptance criteria into one reference specifically so nothing is left as an assumption — the same discipline applied to your own stack turns tribal knowledge into a reviewable document.",
    whatToDo:
      "Put this table in your repository's docs, not a slide deck — it needs to be as durable and reviewable as your agent instructions file.",
  },
  {
    day: 25,
    slug: "capstone-foundation",
    title: "Build the foundation, before the agent gets write access",
    track: "Capstone 1 of 6 — Foundation",
    prompt:
      "Act as a platform engineer kicking off a governed agentic delivery project from a blank repository, deliberately determined not to repeat a past rollout where an agent got write access before any of the underlying controls existed.\n\nContext: I'm starting the /challenge capstone (or an equivalent project) from scratch. I'll tell you what cloud provider, language, and CI platform I'm using.\n\nDo the following, in order:\n1. Propose a repository structure that makes the control boundaries visible -- separating application code, infrastructure, policy, agent instructions, tests, and pipeline definitions into distinct top-level areas.\n2. Propose a scoped workload identity (not a broad developer role) for the sandbox environment, naming the specific minimal permissions it needs for this early no-write-access phase.\n3. Draft a starting logging setup and a first-draft persistent agent instructions file (CLAUDE.md/AGENTS.md/equivalent) that explicitly states the agent has no write access yet.\n\nConstraints:\n- Don't grant the agent any write access in this design -- this phase is read/plan-only by definition.\n- Keep the repository structure proportional to a solo or small-team project; don't over-engineer for a scale I haven't described.\n\nOutput format: an ASCII repo tree, the IAM policy sketch, and the draft instructions file, in that order.",
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
      "Act as a project lead running an AI agent through its very first planning exercise against a real (small) change, still withholding write access until the plan itself proves it deserves that trust.\n\nContext: I'll paste the repository structure from day 25 (or describe it), plus one small, real change I'd like to make -- something the agent should be able to analyze and plan for, without executing anything yet.\n\nDo the following, in order:\n1. As the agent would, analyze the repository and the requested change, and produce a concrete plan: what files would need to change, what the risk areas are, and what validation would need to run.\n2. Separately, as the reviewer, critique that plan -- is it actually grounded in what exists in the repo, or does it guess at structure it can't see? Would you trust it enough to grant write access for this specific change?\n3. State explicitly what would need to be true about the plan's quality before you'd move to controlled write access.\n\nConstraints:\n- Keep the two roles (planner and reviewer) clearly separated in your response so it's obvious which is which.\n- The critique has to be genuinely skeptical, not a rubber stamp -- look for places the plan overreaches what it could actually know without live repo access.\n\nOutput format: \"THE PLAN\" section, then \"REVIEWER CRITIQUE\" section, then a one-line go/no-go verdict for granting write access on this change.",
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
      "Act as a code reviewer opening the very first pull request an agent has generated against this project, aware that how carefully this one gets reviewed sets the tone for every one that follows it.\n\nContext: I'll paste the diff (or a description of the change) that resulted from enabling scoped file edits, local validation, branch creation, and PR generation for one bounded request.\n\nDo the following, in order:\n1. Review the diff as if it were a real PR: is the change actually scoped to what was requested, or did it touch more than necessary?\n2. Check whether deterministic validation evidence is actually attached (test output, lint results) or just claimed in the PR description.\n3. Decide, with reasoning, whether you'd approve this PR as-is, request changes, or reject it -- and if not approve, what specifically needs to happen first.\n\nConstraints:\n- Treat a PR description's claim of \"tests pass\" as unverified unless actual output is shown.\n- Review this the way you'd review a human's first PR to a codebase they're new to -- careful, not rubber-stamped, but not hostile either.\n\nOutput format: a standard code-review comment format (summary, specific line notes if applicable, verdict).",
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
      "Act as a red-team reviewer brought in before this pipeline is trusted with a wider rollout, actively trying to get a bad change past every gate that's supposed to stop it.\n\nContext: I'll describe my pipeline as it stands after adding tests, IaC validation, SAST, SCA, secrets and container scanning, policy checks, and artifact integrity checks.\n\nDo the following, in order:\n1. For each of these six attempted attacks, tell me specifically what should happen if my pipeline is working correctly: disabling a failing security workflow, inserting a secret into a commit, attempting an unregistered cloud operation through a tool gateway, using a developer's broad credentials from the agent workspace, proposing an IAM/protected-policy change, and forcing a failed sandbox health check.\n2. Based on what I described my pipeline actually does, assess which of the six it would genuinely catch versus which it would likely miss.\n3. For anything it would miss, propose the specific gate or rule to add.\n\nConstraints:\n- Judge \"would catch\" only against mechanisms I actually described, not against what a well-configured pipeline generally would do.\n- Be adversarial in the assessment -- assume an agent (or a person) is actively trying to get a bad change through, not making an honest mistake.\n\nOutput format: a six-row table (Attack, Should be blocked by, Would my pipeline catch it?, Fix if not).",
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
      "Act as an on-call engineer running a deliberate failure drill against the sandbox environment, because nobody wants rollback's first real test to happen during an actual incident.\n\nContext: I'll describe my approval state, sandbox deployment step, health checks, and rollback path as they currently exist.\n\nDo the following, in order:\n1. Walk through what should happen when a sandbox health check is forced to fail after a deployment: what records the failure, and what executes or presents the rollback path.\n2. Based on what I described, assess honestly whether that would actually happen today, or whether some part of it is aspirational (described in a doc but not actually wired up).\n3. If any part is aspirational, write the specific missing piece needed to make it real -- a script, a pipeline step, an alert rule.\n\nConstraints:\n- \"We'd roll back manually\" only counts as a real rollback path if I described who does it and how, with enough specificity that a different engineer could execute it under pressure.\n- Don't credit a rollback plan as tested unless I told you it's actually been exercised, even in a drill.\n\nOutput format: a pass/gap assessment for record-failure and execute/present-rollback separately, followed by the concrete fix for any gap found.",
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
      "Act as an operator handed a single correlation ID for an agent-assisted deployment they had no part in, and asked to reconstruct exactly what happened for an outside auditor who won't take anyone's word for it.\n\nContext: I'll describe (or paste) the evidence I have for one completed run through the capstone pipeline: execution ID, model/tool activity, policy decisions, CI results, approval record, deployment event, and health result -- as completely as I have it.\n\nDo the following, in order:\n1. As the outside operator, reconstruct the full story of what happened in this run, using only what I gave you -- who requested it, what changed, what was validated, who approved it, what deployed, and whether it's healthy.\n2. Flag any point in the story where you had to guess or where the evidence was incomplete.\n3. Compare this run against a stated human-only baseline if I gave you one, and note whether the comparison is actually possible from the evidence available.\n\nConstraints:\n- Write the reconstruction the way a real incident writeup would read, not a generic summary -- specific to what happened in this run.\n- Be honest about every gap; the exercise only has value if it's a genuine test of the evidence, not a generous reading of it.\n\nOutput format: a short incident-style writeup (What happened, Evidence gaps, Baseline comparison), followed by a one-line verdict on whether this evidence package would satisfy an outside auditor.",
    why:
      "Exit criterion: an operator can reconstruct a run and compare it with the baseline. This is also the capstone's evidence package and final-demonstration bar — the demo is successful only if the controls are visible, not merely if the code works.",
    whatToDo:
      "Hand the evidence package to someone who wasn't in the room for the run and ask them to explain what happened — if they can't, the observability isn't done yet.",
  },
];
