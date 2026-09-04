import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";

export const meta = {
  outFile: "guides/fourteen-domains-of-the-governed-agentic-platform.html",
  title: "Fourteen Domains of the Governed Agentic Platform — Merit AC Guides",
  description:
    "A map of the fourteen domains that make up an enterprise agentic DevSecOps platform, from platform operating model to GovCloud, adapted from our own reference handbook.",
};

const DOMAINS = [
  {
    n: 1,
    title: "Platform operating model",
    body: [
      "The platform is intentionally split into three concerns: reasoning, engineering execution, and enterprise authority. Claude Code handles repository-centered engineering. Claude models can be accessed through Amazon Bedrock. Bedrock AgentCore supplies production agent infrastructure. AWS identity, policy, network, logging, security, and deployment services determine what actions are permitted.",
      "In practice this means every request an agent handles falls cleanly into one of the three concerns, and the concern determines which system gets the final say. A developer asking Claude Code to refactor a module stays inside engineering execution — the repository and CI decide if the change is good. The moment that same session needs to read from a production queue or call an internal API, the request has crossed into enterprise authority, and Gateway, Identity, and Policy — not the coding agent's own judgment — decide whether it happens.",
      "The split is easy to state and easy to erode. Pilots routinely run all three concerns under one shared IAM role because it's faster to stand up, and nothing breaks until the same agent is asked to touch two concerns in a single session. An agent that already holds deploy credentials because it was simpler for the demo will eventually use them — not out of malice, but because nothing in its instructions or its tool scope stops it. The boundary has to be enforced by what the agent is actually permitted to call, not by what CLAUDE.md tells it not to do.",
    ],
  },
  {
    n: 2,
    title: "Cloud transformation and enablement",
    body: [
      "Use AWS CAF to frame the organizational change as Envision, Align, Launch, and Scale. The technical platform should be introduced as a controlled capability uplift, not as a replacement for architecture, security, operations, or engineering accountability.",
      "Concretely, the Align phase is where security and platform teams write the identity and policy model — who can request what, which environments are in scope, what evidence gets kept — before any engineering team gets tool access. Launch means one bounded workflow with a named owner, not a company-wide enablement announcement.",
      "This phase gets skipped because it looks like process for its own sake next to a working demo. The cost shows up later: security and operations discover the platform after developers already have production tool access, and the retrofit — revoking broad permissions, writing the policy model after the fact — is far more disruptive than doing it first.",
    ],
  },
  {
    n: 3,
    title: "Claude Code enterprise engineering",
    body: [
      "Claude Code is most useful when it is given a well-structured repository, explicit instructions, deterministic validation commands, and a narrow set of tools. The repository becomes the operating context and CLAUDE.md becomes the durable engineering contract.",
      "A working CLAUDE.md is specific: which build and test commands to run before proposing a change, which directories are off-limits, what evidence to include in the pull request description. A vague one — \"write good code\" — gives the agent nothing to be held to.",
      "The trap is drift between what CLAUDE.md says and what the agent's tool scope actually permits. An instruction like \"never modify IAM policies\" is decorative if the agent's credentials can still call the IAM API — the enforceable boundary is the tool scope, and CLAUDE.md is a contract layered on top of it, not a replacement for it.",
    ],
  },
  {
    n: 4,
    title: "Claude on Amazon Bedrock",
    body: [
      "Amazon Bedrock provides a governed model-access layer for Claude and other foundation models. Keep model inference separate from tool authority. The model can decide what it wants to do — IAM, AgentCore Identity, Gateway, Policy, and downstream systems decide whether the action is allowed.",
      "A Bedrock invocation is logged with the model, region, and input independently of whatever the model recommends next — that log exists whether or not the resulting tool call is later authorized. The separation means an operator can audit what the model said without that audit doubling as authorization for what it said to do.",
      "The trap is treating a well-behaved model response as the control. A model can be prompted, jailbroken, or simply mistaken into recommending an unsafe action; the enterprise guarantee isn't that the model always refuses, it's that the downstream system checks regardless of what the model recommended.",
    ],
  },
  {
    n: 5,
    title: "Amazon Bedrock AgentCore",
    body: [
      "AgentCore provides modular services for production agents: Runtime, Memory, Gateway, Identity, Policy, built-in tools, Observability, and Evaluations. AWS positions these capabilities as composable services that can be used together or independently.",
      "Runtime, for example, gives each agent session its own isolated execution environment so two concurrent sessions can't see each other's filesystem or network state; Memory separates short-term working context from long-term context and namespaces it per tenant so one customer's history can't leak into another's session.",
      "Because AWS markets these as one product family, teams tend to adopt all of them together on day one. That's usually more surface than a first workflow needs — every service turned on is one more thing to configure, secure, and produce evidence for. Composing only the pieces the workflow actually requires keeps the initial control surface reviewable.",
    ],
  },
  {
    n: 6,
    title: "MCP, Identity, Gateway and Policy",
    body: [
      "MCP standardizes tool interaction but does not remove the need for authorization. AgentCore Gateway can centralize tool discovery and invocation, while Identity handles authentication and credentials and Policy can apply contextual authorization to data-plane actions.",
      "A concrete flow: Gateway requires a token minted by AgentCore Identity before a tool call reaches the target MCP server, and Policy evaluates the identity, the requested action, and the data involved before allowing a write — the MCP protocol itself has no opinion on any of that.",
      "The trap here is less obvious than a missing permission: an MCP tool's description is text the model reads and acts on, not just documentation for a human. An unreviewed third-party MCP server can embed an instruction inside its tool description that changes agent behavior at runtime — which means registering a new MCP tool needs the same review discipline as adding a new code dependency, not a lighter one.",
    ],
  },
  {
    n: 7,
    title: "Agentic DevSecOps pipelines",
    body: [
      "A coding agent should never be the only validation system for its own work. Claude Code can propose and implement changes, but CI/CD must independently build, test, scan, package, approve, deploy, and verify the resulting artifact.",
      "In practice: the agent proposes a Terraform diff and opens a pull request. The pipeline then independently runs terraform validate, a policy-as-code check against the plan, and a security scan against the changed files — using its own execution, not a report the agent generated about its own execution.",
      "The trap is accepting the agent's self-report as validation because it looks like validation — test output pasted into a PR description, a \"all checks passed\" summary. A confused or compromised agent can misreport results just as easily as it can misreport anything else in natural language, so CI has to re-run the same checks starting from the diff itself, not from the agent's account of the diff.",
    ],
  },
  {
    n: 8,
    title: "Security engineering and approval boundaries",
    body: [
      "Autonomy should scale with consequence. Repository reads, searches, test execution, and Terraform plans can often be automated. IAM mutation, production deployment, secrets operations, destructive actions, and policy exceptions need stronger controls and explicit authorization.",
      "The tiering only works if it's enforced by tool scope and IAM policy, not by an instruction the agent is expected to follow voluntarily.",
    ],
    extra: (
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>Tiering example:</b> repository reads, searches, unit test execution, and{" "}
          <code>terraform plan</code> can run unattended. IAM policy changes, production deploys,
          secrets rotation, destructive operations, and any policy exception require a named
          approver who sees the diff, the policy result, and the rollback plan before authorizing.
        </p>
      </div>
    ),
    tail: [
      "The common failure is temporary: broad permissions granted to unblock a pilot demo tend to outlive the pilot, because revoking a credential that's currently working requires someone to notice and act, and nobody's job is to notice. The review has to happen at grant time — before the demo — not as a cleanup task after.",
    ],
  },
  {
    n: 9,
    title: "Observability and evaluation",
    body: [
      "Agent systems require traces that connect a request to model activity, tool selection, policy decisions, tool results, latency, errors, and final outcomes. AgentCore Observability integrates production agent telemetry with Amazon CloudWatch and OpenTelemetry-compatible tracing.",
      "A single trace should let an operator start from one user request and walk forward through the model invocation, the tool it selected, the policy decision on that tool call, the tool's result, and the final outcome — reconstructing what happened, not just what was said.",
      "Teams default to building observability around the chat transcript because it's the visible, easy-to-capture surface. A transcript shows what the model said it would do; it doesn't show what actually executed, what policy decision gated it, or whether the tool call even succeeded. Those live in a different layer, and skipping it means the org can answer \"what did the agent say\" but not \"what did the agent do.\"",
    ],
  },
  {
    n: 10,
    title: "DORA and delivery performance",
    body: [
      "Agent adoption is successful only when the delivery system improves. Measure deployment frequency, lead time for changes, change failure rate, restoration performance, and reliability together with agent adoption, escalation, error, latency, and cost.",
      "Concretely: split deployment frequency and change failure rate by whether the pull request was agent-touched, and compare the two populations over the same window, rather than reporting agent metrics and delivery metrics as two dashboards nobody cross-references.",
      "The trap is measuring adoption instead of outcome. PRs opened and suggestions accepted are activity metrics, not delivery metrics — an agent that produces many small, low-value PRs looks productive on an adoption dashboard while quietly increasing review burden, and if change failure rate isn't tracked alongside it, that cost stays hidden.",
    ],
  },
  {
    n: 11,
    title: "GovCloud and regulated workloads",
    body: [
      "Regulated deployments must be built from the actual service availability and authorization boundary in the target region. Network paths, identities, logging, KMS keys, data residency, egress, and evidence retention must be designed before autonomous tool access is enabled.",
      "This starts with confirming, region by region, which Bedrock model versions and which AgentCore services are actually available where the workload runs — availability in GovCloud regions lags commercial regions, and the gap is not always the same model generation.",
    ],
    extra: (
      <div className="card">
        <p className="kicker" style={{ marginBottom: "8px" }}>
          Design before enabling tool access
        </p>
        <ul style={{ marginBottom: 0 }}>
          <li>Confirmed service and model availability in the target GovCloud region</li>
          <li>Network path: VPC endpoints, egress rules, no unreviewed internet reachability</li>
          <li>KMS key policy and regional key isolation for Memory and stored evidence</li>
          <li>Data residency and log retention matched to the compliance regime</li>
        </ul>
      </div>
    ),
    tail: [
      "Teams design against a commercial-region sandbox because that's where development happens, then try to port the finished design to GovCloud and discover a dependency that isn't available there, or is an older model version with different behavior. That's not a redeployment problem — it's a redesign of the control boundary, discovered after the design was supposedly done.",
    ],
  },
  {
    n: 12,
    title: "Implementation runbooks",
    body: [
      "Each production workflow needs a repeatable runbook: prerequisites, repository instructions, identity, tools, model access, validation, security checks, approval, deployment, observability, rollback, and evidence collection.",
      "A runbook for something as ordinary as \"add a new third-party dependency\" should name the exact CLAUDE.md rule that applies, the tool scope in effect, the validation commands that run, who approves it, and the exact rollback command — not a general description of the workflow.",
      "Runbooks get written once at launch and rarely updated as the tool scope or pipeline changes under them. Once the documented process and the enforced process disagree, the runbook stops being usable as evidence — an auditor or incident responder following it is now following something that doesn't match what the system actually does.",
    ],
  },
  {
    n: 13,
    title: "30/60/90-day rollout",
    body: [
      "Start with bounded workflows and baseline metrics. Expand only after the pilot shows measurable delivery benefit without increased failure, security exceptions, or operational burden.",
      "Thirty days is one bounded workflow, one team, and baseline metrics captured before the agent touches anything. Sixty days expands the workflow or adds a second team, using the baseline for comparison. Ninety days is a go/no-go decision made from the measured delivery and failure data, not from how the demo went.",
      "The most common shortcut is skipping straight to a broad rollout because the pilot went well without incident — which confuses the absence of a problem with evidence the platform is ready for scale.",
    ],
  },
  {
    n: 14,
    title: "Technical reference",
    body: [
      "This section consolidates service roles, control mappings, example CLAUDE.md instructions, Terraform workflow expectations, pipeline gates, and production acceptance criteria.",
      "The service table, source list, and closing pointers below are that reference in practice — the same names used throughout the fourteen domains, collected in one place so a reviewer can check a specific service against the control it's actually responsible for.",
    ],
  },
];

const SERVICE_TABLE = [
  ["Amazon Bedrock", "Foundation model access, including Anthropic Claude models", "IAM, model access, network and cost controls"],
  ["AgentCore Runtime", "Managed execution environment for agents", "Session isolation, runtime identity, scaling"],
  ["AgentCore Gateway", "Central tool gateway with MCP support", "Discovery, authentication, authorization, audit"],
  ["AgentCore Identity", "Agent and tool credential handling", "Inbound authentication, outbound authorization"],
  ["AgentCore Policy", "Contextual authorization for agent actions", "Fine-grained deterministic policy"],
  ["AgentCore Memory", "Short- and long-term agent context", "Namespace isolation, retention, KMS"],
  ["AgentCore Observability", "Agent telemetry", "CloudWatch, traces, metrics, logs"],
  ["Claude Code", "Repository-centered coding agent", "CLAUDE.md, tool scope, CI validation"],
  ["AWS Organizations / Control Tower", "Enterprise account governance", "SCPs, account structure, centralized controls"],
  ["AWS CloudTrail", "Audit log of IAM and API-level actions", "Attribution, evidence retention, forensics"],
  ["Amazon VPC / PrivateLink", "Network path agent tool calls and Bedrock invocations traverse", "Endpoints, egress control, region boundary"],
];

export default function FourteenDomains() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide · from the Enterprise Agentic DevSecOps Handbook</span>
      <span className="badge">
        <i /> From the Merit AC team
      </span>
      <h1>Fourteen domains of the governed agentic platform</h1>
      <p className="lead">
        The <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">ten control disciplines</a>{" "}
        repeat throughout an enterprise deployment — this is the map of where. Fourteen domains, each
        a real chapter of our own <em>Enterprise Agentic DevSecOps Handbook</em>, from the
        platform's operating model down to the technical reference at the back.
      </p>

      <Toc
        items={DOMAINS.map((d) => ({ href: `#domain-${d.n}`, label: `${d.n}. ${d.title}` }))}
      />

      {DOMAINS.map((d) => (
        <div key={d.n}>
          <h2 id={`domain-${d.n}`}>{d.n}. {d.title}</h2>
          {Array.isArray(d.body) ? d.body.map((p, i) => <p key={i}>{p}</p>) : <p>{d.body}</p>}
          {d.extra}
          {d.tail && d.tail.map((p, i) => <p key={`tail-${i}`}>{p}</p>)}
        </div>
      ))}

      <h2 id="service-reference">Technical service reference</h2>
      <p>The concrete AWS services behind domain 14, and the control each one is actually responsible for:</p>
      <table>
        <thead>
          <tr><th>Service / capability</th><th>Role in this platform</th><th>Control focus</th></tr>
        </thead>
        <tbody>
          {SERVICE_TABLE.map((row) => (
            <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 id="sources">Primary AWS source set</h2>
      <ul>
        <li>AWS Prescriptive Guidance: Agentic AI architecture in the enterprise</li>
        <li>AWS Prescriptive Guidance: Amazon Bedrock AgentCore</li>
        <li>AWS Security Reference Architecture for AI</li>
        <li>AWS Prescriptive Guidance: Core services — tools</li>
        <li>AWS Architecture Icons: official AWS-approved icon toolkit</li>
      </ul>

      <p>
        See <a href="/challenge">the 30-day challenge</a> for a day-by-day path through these
        domains, or <a href="/guides/four-control-boundaries">Four control boundaries</a> for the
        short version of why this split exists at all.
      </p>
    </ContentLayout>
  );
}
