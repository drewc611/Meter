import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "guides/ten-disciplines-of-governed-agentic-devsecops.html",
  title: "The Ten Disciplines of Governed Agentic DevSecOps — Merit AC Guides",
  description:
    "Ten recurring control disciplines for running a coding agent like Claude Code safely at enterprise scale, adapted from our own Enterprise Agentic DevSecOps Handbook.",
};

const CONTROL_TABLE = [
  ["Identity", "Dedicated IAM role or workload identity", "CloudTrail / auth logs"],
  ["Code change", "Claude Code through reviewed pull request", "Git diff + reviewer"],
  ["Validation", "CI tests, IaC and security scans", "Build reports"],
  ["Tool invocation", "AgentCore Gateway / MCP target", "Trace + policy result"],
  ["Secrets", "Vaulted, injected at runtime — never in the repo or agent context", "Secrets-scanner alerts + vault access log"],
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
        <i /> From the Merit AC team
      </span>
      <h1>The ten disciplines of governed agentic DevSecOps</h1>
      <p className="lead">
        Claude Code accelerates engineering work. It should never be the thing that decides whether
        its own work is safe to ship. These ten disciplines are the recurring control points that
        show up, in one form or another, in every part of an enterprise deployment of a coding
        agent — repository to production. Adapted from our own{" "}
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
      <p>
        This distinction sounds obvious until you watch how the failure actually happens. A team
        builds a tool that lets Claude Code trigger a database migration, tests it against a scratch
        database, and ships it. Nobody separately restricts <em>when</em> the tool can target the
        production database — the tool trusts whatever connection string is in its own config, and
        the config gets promoted alongside the code. The model never did anything wrong; it called
        the tool it was given, with arguments that looked reasonable. The authority gap was upstream,
        in a tool that treated its own configuration as authorization.
      </p>
      <p>
        The reason this keeps happening is that natural-language output reads as more authoritative
        than it is. When an agent says "I've verified this is safe to deploy," it is tempting to
        treat that sentence as a control — a synonym for "a person or a policy engine checked it."
        It is not. It's a description of what the model concluded from the context it had, which may
        be incomplete, stale, or itself influenced by content the agent read along the way (a comment
        in a config file, a string returned by an untrusted dependency). Treat every such statement
        as a claim to be checked by an independent system, not as the check itself.
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
      <p>
        The order matters more than it looks. Skipping discovery — going straight from a task
        description to a diff — is the single most common way a session produces a plausible-looking
        change that quietly reintroduces a bug the codebase already fixed once, or reimplements a
        helper that already exists three files away, because the agent never read far enough to find
        it. A repository that has been running for years encodes a lot of institutional memory in
        code and comments that a prompt alone cannot reconstruct.
      </p>
      <p>
        The other common failure sits at the other end of the loop: a team runs the workflow
        correctly, gets a passing validation report, and stops there — CLAUDE.md's evidence
        requirements exist to make review possible, not to replace it. A green test suite and a green
        <code>terraform validate</code> mean the change didn't break anything the tests already check
        for; they don't mean the change is the right change. A reviewer still has to read the diff.
        Encoding the workflow into CLAUDE.md raises the floor on session quality — it doesn't raise
        the ceiling on how much review a change deserves.
      </p>

      <h2 id="repository-controls">3. Repository controls</h2>
      <p>
        Protect security workflows, deployment definitions, shared modules, generated artifacts, and
        sensitive configuration. Do not allow the agent to rewrite enterprise guardrails simply to
        make a build pass.
      </p>
      <ControlTable />
      <p>
        The failure mode here is subtler than "the agent deletes a security check." It's rarer for an
        agent to remove a gate outright than to route around one — asked to make a failing CI
        pipeline green, a session under time pressure will sometimes "fix" the pipeline definition
        itself: loosen a required check, add an exception path, bump a version pin that a security
        scan was flagging. Every one of those edits is, taken alone, a normal engineering change; a
        human reviewer approves changes like that regularly. What makes it a control failure is that
        the same actor proposed the change and needed the change to pass. Repository controls exist
        to make that combination structurally impossible, not just discouraged — protected paths that
        require a distinct human reviewer, branch rules that don't bend for a passing CI run alone,
        and a CODEOWNERS entry on anything that defines what "passing" means.
      </p>
      <p>
        Generated artifacts deserve a separate mention because teams forget they're in scope. A
        committed lockfile, a generated Terraform state cache, or a checked-in OpenAPI spec generated
        from code is often <em>more</em> sensitive to silent drift than the source it's generated
        from, because nothing regenerates it to catch an inconsistency — it just becomes the source of
        truth by default until someone notices it disagrees with reality.
      </p>

      <h2 id="identity-boundary">4. Identity boundary</h2>
      <p>
        Use workload identities and short-lived credentials. Separate inbound user authentication
        from the agent's outbound authorization to tools and resources. Do not inherit a developer's
        broad interactive permissions by default.
      </p>
      <p>
        The convenient path here is almost always the wrong one. It's faster, when standing up a
        pilot, to run Claude Code against a developer's own cloud credentials or a personal access
        token that already has broad org access — the pilot works on day one, nobody has to design a
        new IAM role, and the demo looks great. The cost shows up later: every action the agent takes
        is now indistinguishable, in the logs, from that developer's own actions, which means the
        audit trail that observability (discipline 8) depends on is worthless for anything the agent
        touched. Worse, the blast radius of a bad tool call — or a successful prompt injection — is
        now whatever that developer could reach, not what the workflow actually needs.
      </p>
      <p>
        The fix is a dedicated workload identity scoped to the specific actions the workflow
        performs, issued short-lived credentials rather than a long-lived key, and kept structurally
        separate from the identity a human uses to log in and approve the agent's requests. That
        separation is also what makes approval (discipline 7) meaningful — an approval only means
        something if the approver's authority and the agent's authority are provably different
        principals, not the same credential wearing two hats.
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
      <p>
        The design discipline is easiest to see by contrast. A generic "run this CLI command" tool
        that accepts an arbitrary command string is trivial to build and covers every use case —
        which is exactly the problem. Its authorization surface is "whatever the credential behind it
        can do," its output is unstructured text the calling model has to interpret, and its audit log
        records a shell command rather than a business action. Compare that to a purpose-built
        <code>rotate_database_credential(instance_id, reason)</code> tool: the argument shape rules
        out most misuse before the call is made, the policy engine can reason about "rotate a
        credential on this instance" as a distinct authorizable action, and the log entry is legible
        to a human reviewer without translation. The narrow tool is more work to build and covers one
        job instead of a hundred — that tradeoff is the point, not a limitation to design around.
      </p>
      <p>
        Timeout and idempotency behavior belong in the tool contract for the same reason. A
        customer-data export tool that isn't idempotent, called twice because a network retry fired
        after the first call actually succeeded, silently produces two exports instead of failing
        safely or returning the first result again. Decide and document what a second call does
        before the tool ships, not after an incident report asks why it happened.
      </p>

      <h2 id="validation">6. Validation</h2>
      <p>
        Use unit tests, integration tests, <code>terraform fmt/validate/plan</code>, policy-as-code,
        SAST, SCA, container scanning, secrets scanning, and artifact integrity checks as independent
        gates. None of them defer to the agent's own assessment of its work.
      </p>
      <p>
        "Independent" is the load-bearing word, and it's the part that erodes first. Each of these
        gates is useful individually, but the discipline only holds if the agent cannot influence
        whether a gate passes except by making the underlying change genuinely correct. That property
        degrades quietly: a session that's asked to "get CI green" has every incentive, explicit or
        not, to find the shortest path there, and the shortest path is sometimes to edit the test
        rather than the code — loosen an assertion, add a mock that hides the real failure, mark a
        flaky test as skipped instead of fixing the flakiness. None of that shows up as a violation in
        any single commit; it shows up as a test suite that quietly stops catching what it used to
        catch, discovered months later when something it should have caught reaches production.
      </p>
      <div className="card">
        <p style={{ marginBottom: "8px" }}>
          <b>Common mistake:</b> treating a green pipeline as proof, not evidence.
        </p>
        <p style={{ marginBottom: 0 }}>
          A pipeline that passes tells you the change didn't break anything the pipeline checks for.
          It doesn't tell you the pipeline still checks for the right things. Review agent-authored
          changes to test files and pipeline definitions themselves with at least the same scrutiny
          as changes to production code — that's usually where a shortcut hides.
        </p>
      </div>
      <p>
        Coverage of the gates matters as much as their independence. Policy-as-code and IaC validation
        catch a bad Terraform plan; they say nothing about a change to application logic that's
        syntactically fine but behaviorally wrong. SAST and SCA catch known vulnerability patterns and
        vulnerable dependencies; they say nothing about a new business-logic bug the agent introduced.
        Treat the gate list as a checklist of what's covered, and be explicit — in CLAUDE.md, in the
        pipeline definition — about what's still relying on human review, rather than assuming the
        list is exhaustive because it's long.
      </p>

      <h2 id="approval">7. Approval</h2>
      <p>
        Human approval should occur at a meaningful boundary. Show the exact proposed action,
        affected resources, policy result, validation evidence, and rollback plan before requesting
        authorization.
      </p>
      <p>
        "Meaningful boundary" is doing real work in that sentence, and picking the wrong boundary is
        the most common way approval gates fail without anyone noticing they've failed. Gate too
        early — approving a plan before the agent has produced a diff — and the approver is signing
        off on an intention, not an action; they have nothing concrete to evaluate and the approval
        becomes a formality. Gate too late, or gate everything at the same threshold, and the approver
        drowns in low-consequence requests until they start rubber-stamping, at which point the gate
        exists on paper but not in practice. A read-only query and an IAM policy change should not
        compete for the same reviewer's attention on the same terms.
      </p>
      <p>
        A worked example: an agent proposes an IAM policy change that widens a role's storage-bucket
        access from a specific prefix to the entire bucket, because the specific-prefix version failed
        a test. The approval request that actually helps a reviewer decide shows the diff of the
        policy document, which resources the wider grant newly exposes, the alternative the agent
        considered and rejected (a second scoped statement instead of widening the existing one), and
        what rolling the change back looks like if it's approved and later found to be wrong. An
        approval request that just says "update IAM policy for export-service — tests passing" gives
        the reviewer nothing to evaluate except the agent's own assurance, which is the exact thing
        the approval step exists to not rely on.
      </p>
      <p>
        Approval fatigue is the operational risk to design against from day one, not something to fix
        after it appears. If every agent action needs sign-off, approvers stop reading and start
        clicking approve — a well-designed gate makes review cheap for low-consequence actions and
        unavoidable for consequential ones, rather than uniform for both.
      </p>

      <h2 id="observability">8. Observability</h2>
      <p>
        Capture model invocation, tool call, identity, policy decision, tool result, deployment
        event, and health signal. Operators should be able to reconstruct the complete execution
        path — not just read a chat transcript.
      </p>
      <ControlTable />
      <p>
        A chat transcript is a record of what the model said; it is not a record of what actually
        happened in the systems the model touched, and conflating the two is the most common
        observability gap in early deployments. The transcript shows "I've updated the IAM policy and
        verified the change" — it doesn't show which IAM principal made the API call, what the policy
        diff actually was, whether a policy engine approved or denied it, or whether the resulting
        state matches what was claimed. Those facts live in separate systems — an audit log, the
        Gateway's tool-call log, the policy engine's decision log — that have to be correlated by a
        shared identifier (a trace ID, a request ID) threaded through every layer, or reconstructing
        "what happened" after an incident means manually cross-referencing timestamps across five
        dashboards under time pressure.
      </p>
      <p>
        The correlation identifier is worth calling out because it's easy to skip in a pilot and
        expensive to retrofit. Generate one ID at the point a request enters the system, and require
        every downstream log line — model call, tool call, policy decision, CI run, deployment
        event — to carry it. Without that thread, observability is a pile of logs that are
        individually complete and collectively useless for answering "show me everything that
        happened for this one request."
      </p>

      <h2 id="failure-handling">9. Failure handling</h2>
      <p>
        Design retries, timeouts, circuit breakers, idempotency, dead-letter handling, and rollback
        independently of the model. Non-deterministic reasoning should sit inside deterministic
        operational boundaries.
      </p>
      <p>
        This discipline is easy to state and consistently under-built, because failure handling has
        no visible payoff until the day it's the only thing standing between a bad tool call and a
        bad outcome — it's the kind of work that's simple to defer when a pilot is under deadline
        pressure and nothing has broken yet. The trap is designing failure handling for the failures
        you can imagine (the tool times out, the API returns a server error) and skipping the ones
        that only show up under agentic use specifically: a retry that resends a non-idempotent
        request because the agent's own retry logic doesn't know the first attempt actually
        succeeded, or a circuit breaker with a threshold tuned for human-driven traffic that never
        trips against an agent capable of issuing the same bad call a hundred times in a minute.
      </p>
      <div className="card">
        <p style={{ marginBottom: "8px" }}>
          <b>Worked example:</b> a migration tool that isn't idempotent.
        </p>
        <p style={{ marginBottom: 0 }}>
          A <code>run_migration(migration_id)</code> tool applies a schema change and returns
          success. A network timeout on the response makes the caller retry the same call — the
          migration already succeeded, but the tool has no record of that, so it runs again against a
          schema that no longer matches what the migration expects, and fails halfway through. The
          fix isn't a smarter retry — it's a tool that checks migration state before acting and
          returns "already applied" instead of attempting it twice.
        </p>
      </div>
      <p>
        Idempotency is the sharpest version of this problem generally, not just for migrations. Any
        tool that mutates state — a database migration, a customer-data export, a deployment
        trigger — has to define, explicitly, what a second identical call does: return the prior
        result, no-op, or fail loudly. Agentic callers retry more often and more mechanically than
        humans do, and a network blip that would prompt a person to check before re-clicking "submit"
        just prompts a retrying agent to call again immediately.
      </p>

      <h2 id="production-criterion">10. Production criterion</h2>
      <p>
        A workflow is production-ready only when permissions are bounded, validation is repeatable,
        rollback is tested, evidence is retained, and performance is measured against a human-only
        baseline.
      </p>
      <p>
        That last clause is the one teams skip, and it's the one that turns "this feels faster" into
        an actual decision. It's straightforward to measure that an agentic workflow completed a
        task; it's harder, and more useful, to know whether it completed the task faster, more
        accurately, and with less rework than the process it replaced — and without that comparison, a
        workflow can look successful by every metric that's easy to collect (tasks completed, pull
        requests opened) while quietly costing more in review time and rollback effort than it saves.
        "Tested" rollback means run, not documented — a rollback plan nobody has executed since it was
        written is a plan with an unknown failure rate, discovered at the worst possible time.
      </p>
      <p>
        None of the five conditions substitutes for the others. Bounded permissions without retained
        evidence means an incident is unauditable even though it was contained; tested rollback
        without repeatable validation means you can undo a bad change but can't reliably tell whether
        the next one is bad before it ships. Treat the list as a conjunction, not a menu — a workflow
        that satisfies four of five isn't 80% production-ready, it has one open failure mode away from
        an incident.
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
