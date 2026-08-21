import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";

export const meta = {
  outFile: "guides/fourteen-domains-of-the-governed-agentic-platform.html",
  title: "Fourteen Domains of the Governed Agentic Platform — Merit AC Guides",
  description:
    "A map of the fourteen domains that make up an enterprise agentic DevSecOps platform, from platform operating model to GovCloud, adapted from Andrew Clark's handbook.",
};

const DOMAINS = [
  {
    n: 1,
    title: "Platform operating model",
    body: "The platform is intentionally split into three concerns: reasoning, engineering execution, and enterprise authority. Claude Code handles repository-centered engineering. Claude models can be accessed through Amazon Bedrock. Bedrock AgentCore supplies production agent infrastructure. AWS identity, policy, network, logging, security, and deployment services determine what actions are permitted.",
  },
  {
    n: 2,
    title: "Cloud transformation and enablement",
    body: "Use AWS CAF to frame the organizational change as Envision, Align, Launch, and Scale. The technical platform should be introduced as a controlled capability uplift, not as a replacement for architecture, security, operations, or engineering accountability.",
  },
  {
    n: 3,
    title: "Claude Code enterprise engineering",
    body: "Claude Code is most useful when it is given a well-structured repository, explicit instructions, deterministic validation commands, and a narrow set of tools. The repository becomes the operating context and CLAUDE.md becomes the durable engineering contract.",
  },
  {
    n: 4,
    title: "Claude on Amazon Bedrock",
    body: "Amazon Bedrock provides a governed model-access layer for Claude and other foundation models. Keep model inference separate from tool authority. The model can decide what it wants to do — IAM, AgentCore Identity, Gateway, Policy, and downstream systems decide whether the action is allowed.",
  },
  {
    n: 5,
    title: "Amazon Bedrock AgentCore",
    body: "AgentCore provides modular services for production agents: Runtime, Memory, Gateway, Identity, Policy, built-in tools, Observability, and Evaluations. AWS positions these capabilities as composable services that can be used together or independently.",
  },
  {
    n: 6,
    title: "MCP, Identity, Gateway and Policy",
    body: "MCP standardizes tool interaction but does not remove the need for authorization. AgentCore Gateway can centralize tool discovery and invocation, while Identity handles authentication and credentials and Policy can apply contextual authorization to data-plane actions.",
  },
  {
    n: 7,
    title: "Agentic DevSecOps pipelines",
    body: "A coding agent should never be the only validation system for its own work. Claude Code can propose and implement changes, but CI/CD must independently build, test, scan, package, approve, deploy, and verify the resulting artifact.",
  },
  {
    n: 8,
    title: "Security engineering and approval boundaries",
    body: "Autonomy should scale with consequence. Repository reads, searches, test execution, and Terraform plans can often be automated. IAM mutation, production deployment, secrets operations, destructive actions, and policy exceptions need stronger controls and explicit authorization.",
  },
  {
    n: 9,
    title: "Observability and evaluation",
    body: "Agent systems require traces that connect a request to model activity, tool selection, policy decisions, tool results, latency, errors, and final outcomes. AgentCore Observability integrates production agent telemetry with Amazon CloudWatch and OpenTelemetry-compatible tracing.",
  },
  {
    n: 10,
    title: "DORA and delivery performance",
    body: "Agent adoption is successful only when the delivery system improves. Measure deployment frequency, lead time for changes, change failure rate, restoration performance, and reliability together with agent adoption, escalation, error, latency, and cost.",
  },
  {
    n: 11,
    title: "GovCloud and regulated workloads",
    body: "Regulated deployments must be built from the actual service availability and authorization boundary in the target region. Network paths, identities, logging, KMS keys, data residency, egress, and evidence retention must be designed before autonomous tool access is enabled.",
  },
  {
    n: 12,
    title: "Implementation runbooks",
    body: "Each production workflow needs a repeatable runbook: prerequisites, repository instructions, identity, tools, model access, validation, security checks, approval, deployment, observability, rollback, and evidence collection.",
  },
  {
    n: 13,
    title: "30/60/90-day rollout",
    body: "Start with bounded workflows and baseline metrics. Expand only after the pilot shows measurable delivery benefit without increased failure, security exceptions, or operational burden.",
  },
  {
    n: 14,
    title: "Technical reference",
    body: "This section consolidates service roles, control mappings, example CLAUDE.md instructions, Terraform workflow expectations, pipeline gates, and production acceptance criteria.",
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
];

export default function FourteenDomains() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide · from the Enterprise Agentic DevSecOps Handbook</span>
      <span className="badge">
        <i /> Andrew Clark
      </span>
      <h1>Fourteen domains of the governed agentic platform</h1>
      <p className="lead">
        The <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">ten control disciplines</a>{" "}
        repeat throughout an enterprise deployment — this is the map of where. Fourteen domains, each
        a real chapter of Andrew Clark's <em>Enterprise Agentic DevSecOps Handbook</em>, from the
        platform's operating model down to the technical reference at the back.
      </p>

      <Toc
        items={DOMAINS.map((d) => ({ href: `#domain-${d.n}`, label: `${d.n}. ${d.title}` }))}
      />

      {DOMAINS.map((d) => (
        <div key={d.n}>
          <h2 id={`domain-${d.n}`}>{d.n}. {d.title}</h2>
          <p>{d.body}</p>
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
