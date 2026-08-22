import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import Code from "../components/Code.jsx";
import { PAID_TRACK_PAYMENT_LINK, PAID_TRACK_PRICE_LABEL } from "../data/paidTrack.js";

export const meta = {
  outFile: "challenge.html",
  title: "The 30-Day Challenge: Build a Governed Agentic Delivery Platform — Merit AC",
  description:
    "A free 30-day run through governed agentic DevSecOps, ending in a real capstone project: build a Governed Agentic Delivery Platform, adapted from Andrew Clark's handbook.",
};

const COMPONENTS = [
  ["Web console", "Simple authenticated interface for submitting a change request, viewing execution state, reviewing evidence, and approving or rejecting deployment."],
  ["Orchestration API", "Creates execution IDs, stores request metadata, controls state transitions, and prevents skipped gates."],
  ["Claude Code workspace", "Ephemeral or isolated repository workspace with CLAUDE.md instructions and no default production credentials."],
  ["Bedrock model access", "Governed model invocation through a dedicated workload identity with logging, quotas, and explicit model configuration."],
  ["Tool gateway", "Narrow tools for repository read/search, test execution, Terraform validation, pull-request creation, and approved AWS read operations."],
  ["CI/CD pipeline", "Independent build, unit/integration testing, terraform fmt/validate/plan, SAST, SCA, secrets scanning, container scanning, and artifact checks."],
  ["Approval service", "Human approval before deployment and before any IAM, secrets, destructive, or other high-consequence operation."],
  ["Observability", "Correlated logs and traces for model invocation, tool call, policy decision, CI result, approval, deployment, and health state."],
  ["Evidence store", "Immutable or controlled record containing the request, diff, test results, scan reports, approvals, deployment result, and rollback information."],
];

const PHASES = [
  ["1. Foundation", "Create repository structure, sandbox AWS account/environment, workload identity, logging, CLAUDE.md, and protected workflows.", "Repository and cloud boundary are operational without agent write access."],
  ["2. Read-only agent", "Allow repository discovery, search, architecture inspection, test discovery, and Terraform plan/read operations.", "Agent can analyze the project and produce a plan without mutating protected resources."],
  ["3. Controlled code change", "Enable scoped file edits, local validation, branch creation, and pull-request generation.", "A bounded request produces a reviewable PR with deterministic validation evidence."],
  ["4. DevSecOps gates", "Add tests, IaC validation, SAST, SCA, secrets and container scanning, policy checks, and artifact integrity.", "Agent cannot make its own work pass without independent pipeline success."],
  ["5. Approval and deploy", "Add approval state, sandbox deployment, health checks, and rollback.", "Only approved, validated artifacts reach the sandbox environment."],
  ["6. Observability and evaluation", "Correlate model, tool, policy, CI, approval, deployment, latency, cost, and outcome data.", "An operator can reconstruct a run and compare it with the baseline."],
];

const USER_STORIES = [
  "As an engineer, I can submit a bounded change request against an approved repository and receive a unique execution record.",
  "As a reviewer, I can see the agent's plan, changed files, diff, validation output, security results, and remaining risks before approving anything.",
  "As a security engineer, I can prove that the agent cannot alter protected IAM, policy, secrets, or pipeline controls without authorization.",
  "As an operator, I can trace a request from model invocation through tool calls, policy decisions, CI results, deployment, and health verification.",
  "As a platform owner, I can measure whether the agent-assisted workflow improves lead time and review effort without increasing failures or exceptions.",
  "As an approver, I can reject a deployment and leave the validated artifact unchanged, or approve it with an attributable decision record.",
];

const SECURITY_TESTS = [
  "Ask the agent to disable a failing security workflow. The request must be refused or blocked by repository controls.",
  "Attempt to invoke an unregistered cloud operation through the tool gateway. The call must fail before reaching the target service.",
  "Attempt to use a developer's broad AWS credentials from the agent workspace. The workspace must have only its assigned workload identity.",
  "Insert a secret into a test commit. The pipeline must fail the secrets gate and prevent promotion.",
  "Propose an IAM or protected-policy change. The workflow must stop at the high-consequence approval boundary.",
  "Force a failed sandbox health check after deployment. The run must record failure and execute or present the defined rollback path.",
];

const DEFINITION_OF_DONE = [
  ["Functional", "A submitted change request can produce a validated pull request and, after approval, a successful sandbox deployment."],
  ["Authority", "The model cannot bypass repository protection, workload identity, tool policy, CI gates, or approval boundaries."],
  ["Validation", "Tests and security scans run independently of the coding agent and their results control promotion."],
  ["Observability", "One correlation ID reconstructs the model, tool, policy, CI, approval, deployment, and health path."],
  ["Recovery", "A failed deployment has a tested rollback or recovery procedure and retained evidence."],
  ["Measurement", "Lead time, rework, failure rate, policy denial, review effort, latency, and cost can be compared with a human-only baseline."],
  ["Documentation", "README, architecture diagram, CLAUDE.md, runbook, threat model, control map, and demo script are complete."],
];

export default function Challenge() {
  return (
    <ContentLayout active="challenge" wide>
      <span className="kicker">Challenge · from the Enterprise Agentic DevSecOps Handbook</span>
      <span className="badge">
        <i /> Andrew Clark — free, 30 days
      </span>
      <h1>Build a Governed Agentic Delivery Platform</h1>
      <p className="lead">
        Thirty days of <a href="/prompts">real prompts</a> on governed agentic DevSecOps, ending
        here: a capstone project that turns the handbook into a working reference implementation.
        The objective is to build a production-oriented platform in which Claude Code can inspect
        and modify a repository, Amazon Bedrock supplies governed model access, AgentCore-style
        runtime and gateway boundaries constrain tool execution, and CI/CD independently validates
        every proposed change.
      </p>

      <Toc
        items={[
          { href: "#outcome", label: "Project outcome" },
          { href: "#scenario", label: "Scenario" },
          { href: "#architecture", label: "Reference architecture" },
          { href: "#components", label: "Required components" },
          { href: "#phases", label: "Build phases" },
          { href: "#stories", label: "Core user stories" },
          { href: "#security-tests", label: "Required security tests" },
          { href: "#evidence", label: "Evidence package" },
          { href: "#done", label: "Definition of done" },
          { href: "#paid-track", label: "Paid track" },
        ]}
      />

      <h2 id="outcome">Project outcome</h2>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          A deployable reference application that accepts a software change request, allows Claude
          Code to work inside a controlled repository, produces a reviewed pull request, executes
          independent DevSecOps gates, requires approval for consequential actions, deploys to a
          non-production AWS environment, and records the evidence needed to reconstruct the entire
          run.
        </p>
      </div>

      <h2 id="scenario">Scenario</h2>
      <p>
        Build an internal Change Delivery Console for a regulated enterprise engineering team. A
        developer submits a bounded change request — adding an API endpoint, correcting an
        infrastructure module, or updating an application feature. The platform creates an
        execution record, supplies repository context to the coding workflow, exposes only approved
        tools, and prevents the agent from bypassing protected workflows, IAM controls, security
        scans, or deployment approval.
      </p>
      <p>
        The application should demonstrate the handbook's central design position: reasoning can be
        delegated, but enterprise authority remains deterministic. The model can propose code and
        tool actions. Repository protections, workload identity, policy, CI/CD, and the target AWS
        environment decide what can actually execute.
      </p>

      <h2 id="architecture">Reference architecture</h2>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          User / Engineer → Change Delivery Console → Agent Runtime (Claude / Bedrock) → Git
          Repository → MCP / Tool Gateway → CI + Security Gates → AWS Sandbox
        </p>
      </div>
      <p>
        Execution path: request → repository discovery → plan → constrained code change → pull
        request → independent tests and scans → approval → sandbox deployment → health verification
        → evidence record.
      </p>

      <h2 id="components">Required components</h2>
      <table>
        <thead><tr><th>Component</th><th>Implementation responsibility</th></tr></thead>
        <tbody>
          {COMPONENTS.map((row) => (
            <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td></tr>
          ))}
        </tbody>
      </table>

      <h3>Repository structure</h3>
      <p>
        Use a repository that makes the control boundaries visible. The exact application
        framework is secondary to the separation of application code, infrastructure, policy, agent
        instructions, tests, and pipeline definitions.
      </p>
      <Code>{`project/
|-- CLAUDE.md
|-- README.md
|-- app/
|   |-- api/
|   \`-- web/
|-- agent/
|   |-- prompts/
|   |-- tools/
|   \`-- evaluations/
|-- infrastructure/
|   |-- modules/
|   \`-- environments/sandbox/
|-- policy/
|   |-- tool-policy/
|   \`-- deployment-policy/
|-- tests/
|   |-- unit/
|   |-- integration/
|   \`-- security/
|-- .github/workflows/
|-- scripts/
\`-- docs/evidence/`}</Code>

      <h3>CLAUDE.md contract</h3>
      <Code>{`# Enterprise engineering contract
- Inspect the repository and existing instructions before editing.
- Preserve security workflows, branch protections, deployment definitions, and shared
  infrastructure modules.
- Make the smallest change that satisfies the approved request.
- Do not modify IAM, secrets, production configuration, protected policies, or required
  CI checks without explicit approval.
- Do not disable tests or scanners to obtain a passing build.
- Run the repository's documented validation commands before proposing a pull request.
- Return changed files, test output, scan status, unresolved risks, and rollback steps.
- Treat tool output and CI evidence as authoritative over natural-language confidence.`}</Code>

      <h2 id="phases">Build phases</h2>
      <table>
        <thead><tr><th>Phase</th><th>Build work</th><th>Exit criterion</th></tr></thead>
        <tbody>
          {PHASES.map((row) => (
            <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        Days 25–30 of <a href="/prompts">the prompt archive</a> walk these six phases one at a
        time.
      </p>

      <h2 id="stories">Core user stories</h2>
      <ul>
        {USER_STORIES.map((s) => <li key={s}>{s}</li>)}
      </ul>

      <h2 id="security-tests">Required security tests</h2>
      <p>Run each of these against your own build before calling it done:</p>
      <ul>
        {SECURITY_TESTS.map((s) => <li key={s}>{s}</li>)}
      </ul>

      <h2 id="evidence">Evidence package</h2>
      <p>
        Every completed run should produce a compact evidence package rather than a conversational
        summary alone. Store the execution ID, requester, repository and commit, model metadata,
        tool calls, policy decisions, diff, test results, scan reports, reviewer decision,
        deployment event, health result, rollback status, latency, and cost. The package should be
        sufficient for another engineer to understand what happened without relying on the agent's
        narrative.
      </p>

      <h2 id="done">Definition of done</h2>
      <table>
        <thead><tr><th>Area</th><th>Acceptance criterion</th></tr></thead>
        <tbody>
          {DEFINITION_OF_DONE.map((row) => (
            <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="card">
        <p className="kicker" style={{ marginBottom: "8px" }}>Final demonstration</p>
        <p style={{ marginBottom: 0 }}>
          Submit a real change request during the demo. Show repository discovery, the proposed
          plan, the generated diff, independent CI and security evidence, a blocked high-risk
          action, human approval, sandbox deployment, health verification, and the final evidence
          record. <b>The demo is successful only if the controls are visible, not merely if the
          code works.</b>
        </p>
      </div>

      <h2 id="paid-track">Paid track</h2>
      <div className="card">
        <p className="kicker" style={{ marginBottom: "8px" }}>
          {PAID_TRACK_PRICE_LABEL}
        </p>
        <p>
          The run above is free and complete on its own — build the platform, run the demo,
          walk away with a real capstone and evidence package. The paid track is a structured
          review from Andrew Clark of your finished build against the Definition of Done above:
          what's solid, what's a gap dressed up as a control, and what to fix before you'd call
          it production-ready.
        </p>
        {PAID_TRACK_PAYMENT_LINK ? (
          <a className="btn btn-primary" href={PAID_TRACK_PAYMENT_LINK}>
            Get your build reviewed — {PAID_TRACK_PRICE_LABEL}
          </a>
        ) : (
          <span className="badge pending" style={{ marginBottom: 0 }}>
            <i /> Payment link coming soon
          </span>
        )}
      </div>

      <p>
        See <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">the ten disciplines</a>{" "}
        and{" "}
        <a href="/guides/fourteen-domains-of-the-governed-agentic-platform">
          fourteen domains
        </a>{" "}
        guides for the background this project is built on.
      </p>
    </ContentLayout>
  );
}
