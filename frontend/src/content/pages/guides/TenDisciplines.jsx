import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "guides/ten-disciplines-of-governed-agentic-devsecops.html",
  title: "The Ten Disciplines of Governed Agentic DevSecOps — Merit AC Guides",
  description:
    "Ten recurring control disciplines for running a coding agent like Claude Code safely at enterprise scale, adapted from Andrew Clark's Enterprise Agentic DevSecOps Handbook.",
};

const CONTROL_TABLE = [
  ["Identity", "Dedicated IAM role or workload identity", "CloudTrail / auth logs"],
  ["Code change", "Claude Code through reviewed pull request", "Git diff + reviewer"],
  ["Validation", "CI tests, IaC and security scans", "Build reports"],
  ["Tool invocation", "AgentCore Gateway / MCP target", "Trace + policy result"],
  ["Production", "Approval-gated deployment", "Deployment + health events"],
];

function ControlTable() {
  return (
    <table>
      <thead>
        <tr><th>Control</th><th>Enterprise implementation</th><th>Evidence</th></tr>
      </thead>
      <tbody>
        {CONTROL_TABLE.map((row) => (
          <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TenDisciplines() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide · from the Enterprise Agentic DevSecOps Handbook</span>
      <span className="badge">
        <i /> Andrew Clark
      </span>
      <h1>The ten disciplines of governed agentic DevSecOps</h1>
      <p className="lead">
        Claude Code accelerates engineering work. It should never be the thing that decides whether
        its own work is safe to ship. These ten disciplines are the recurring control points that
        show up, in one form or another, in every part of an enterprise deployment of a coding
        agent — repository to production. Adapted from Andrew Clark's{" "}
        <em>Enterprise Agentic DevSecOps Handbook</em> (August 2026 edition).
      </p>

      <Toc
        items={[
          { href: "#architecture-rule", label: "1. Architecture rule" },
          { href: "#claude-code-workflow", label: "2. Claude Code workflow" },
          { href: "#repository-controls", label: "3. Repository controls" },
          { href: "#identity-boundary", label: "4. Identity boundary" },
          { href: "#tool-design", label: "5. Tool design" },
          { href: "#validation", label: "6. Validation" },
          { href: "#approval", label: "7. Approval" },
          { href: "#observability", label: "8. Observability" },
          { href: "#failure-handling", label: "9. Failure handling" },
          { href: "#production-criterion", label: "10. Production criterion" },
        ]}
      />

      <h2 id="architecture-rule">1. Architecture rule</h2>
      <p>
        Keep reasoning separate from authority. A language model may recommend a tool call, but the
        tool contract, identity, policy engine, network path, and target system determine whether
        that call can execute. For enterprise implementations, map the control to a named service, IAM
        principal, log source, and deployment gate. That makes the architecture reviewable and
        testable rather than dependent on prompt wording.
      </p>

      <h2 id="claude-code-workflow">2. Claude Code workflow</h2>
      <p>
        Start with repository discovery. Read <code>CLAUDE.md</code> and existing build instructions.
        Inspect the relevant files before changing them. Produce a plan. Make the minimum change. Run
        deterministic validation. Present the diff and evidence for review. Claude Code should return
        evidence from the repository and validation commands — a confident natural-language answer is
        not evidence that a build, policy check, or deployment is correct.
      </p>
      <Code>{`# CLAUDE.md
- Preserve existing enterprise security and CI workflows.
- Reuse established Terraform modules and repository patterns.
- Run tests and terraform validate before proposing a pull request.
- Do not modify IAM, production, or protected deployment controls without approval.
- Summarize changed files, validation output, remaining risks, and rollback steps.`}</Code>

      <h2 id="repository-controls">3. Repository controls</h2>
      <p>
        Protect security workflows, deployment definitions, shared modules, generated artifacts, and
        sensitive configuration. Do not allow the agent to rewrite enterprise guardrails simply to
        make a build pass.
      </p>
      <ControlTable />

      <h2 id="identity-boundary">4. Identity boundary</h2>
      <p>
        Use workload identities and short-lived credentials. Separate inbound user authentication
        from the agent's outbound authorization to tools and resources. Do not inherit a developer's
        broad interactive permissions by default.
      </p>

      <h2 id="tool-design">5. Tool design</h2>
      <p>
        Prefer narrow, typed tools over unrestricted administrative shells. A good tool has a clear
        purpose, constrained arguments, predictable output, timeout behavior, and auditable
        authorization.
      </p>
      <div className="card">
        <p>
          <b>Implementation note:</b> do not expose a generic shell or broad AWS administrator role
          just because it is convenient during a pilot. Convenience permissions tend to survive into
          production and defeat the entire control model.
        </p>
      </div>

      <h2 id="validation">6. Validation</h2>
      <p>
        Use unit tests, integration tests, <code>terraform fmt/validate/plan</code>, policy-as-code,
        SAST, SCA, container scanning, secrets scanning, and artifact integrity checks as independent
        gates. None of them defer to the agent's own assessment of its work.
      </p>

      <h2 id="approval">7. Approval</h2>
      <p>
        Human approval should occur at a meaningful boundary. Show the exact proposed action,
        affected resources, policy result, validation evidence, and rollback plan before requesting
        authorization.
      </p>

      <h2 id="observability">8. Observability</h2>
      <p>
        Capture model invocation, tool call, identity, policy decision, tool result, deployment
        event, and health signal. Operators should be able to reconstruct the complete execution
        path — not just read a chat transcript.
      </p>
      <ControlTable />

      <h2 id="failure-handling">9. Failure handling</h2>
      <p>
        Design retries, timeouts, circuit breakers, idempotency, dead-letter handling, and rollback
        independently of the model. Non-deterministic reasoning should sit inside deterministic
        operational boundaries.
      </p>

      <h2 id="production-criterion">10. Production criterion</h2>
      <p>
        A workflow is production-ready only when permissions are bounded, validation is repeatable,
        rollback is tested, evidence is retained, and performance is measured against a human-only
        baseline.
      </p>
      <div className="card">
        <p className="kicker" style={{ marginBottom: "8px" }}>Chapter checkpoint</p>
        <ul style={{ marginBottom: 0 }}>
          <li>Named owner and business outcome</li>
          <li>Documented trust boundary and data path</li>
          <li>Scoped workload identity and explicit tool inventory</li>
          <li>Independent validation and security gates</li>
          <li>Human approval for high-consequence actions</li>
          <li>Observable execution, rollback, and retained evidence</li>
        </ul>
      </div>

      <p>
        These ten disciplines repeat across every domain of a governed agentic platform — see{" "}
        <a href="/guides/fourteen-domains-of-the-governed-agentic-platform">
          Fourteen domains of the governed agentic platform
        </a>{" "}
        for where each one shows up, and the <a href="/challenge">30-day challenge</a> for a
        day-by-day way to apply them to your own repository.
      </p>
    </ContentLayout>
  );
}
