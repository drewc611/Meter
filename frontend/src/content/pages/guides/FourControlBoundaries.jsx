import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";

export const meta = {
  outFile: "guides/four-control-boundaries.html",
  title: "Four Control Boundaries for Agentic DevSecOps — Merit Guides",
  description:
    "Code generation is the easy part. The enterprise problem is controlling what happens after the model decides what it wants to do — adapted from Andrew Clark's Agentic DevSecOps carousel.",
};

export default function FourControlBoundaries() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide · from the Agentic DevSecOps reference deck</span>
      <span className="badge">
        <i /> Andrew Clark
      </span>
      <h1>Four control boundaries for agentic DevSecOps</h1>
      <p className="lead">
        Code generation is the easy part. The enterprise problem is controlling what happens after
        the model decides what it wants to do.
      </p>

      <Toc
        items={[
          { href: "#problem", label: "The problem" },
          { href: "#boundaries", label: "The four boundaries" },
          { href: "#claude-code", label: "Claude Code: treat the repo as the operating context" },
          { href: "#tools", label: "MCP + tools: narrow beats unrestricted" },
          { href: "#devsecops", label: "DevSecOps: the agent doesn't grade its own work" },
          { href: "#observability", label: "Observability: an evidence chain, not a chat transcript" },
          { href: "#operating-model", label: "The operating model" },
        ]}
      />

      <h2 id="problem">The problem</h2>
      <div className="card">
        <p style={{ marginBottom: "4px" }}><b>Model reasoning</b> — inspect repository, propose a change, select a tool, explain intent.</p>
        <p style={{ marginBottom: 0 }}><b>Enterprise authority</b> — identity, policy, CI/security gates, approval + deployment.</p>
      </div>
      <p>Do not collapse these two layers.</p>

      <h2 id="boundaries">The four boundaries</h2>
      <p>The platform has four control boundaries. Every action crosses a boundary that can be logged, denied, reviewed, tested, or rolled back.</p>
      <ol>
        <li><b>Request</b> — engineer / application</li>
        <li><b>Reason</b> — Claude Code + Bedrock</li>
        <li><b>Authorize</b> — Gateway + identity + policy</li>
        <li><b>Verify</b> — CI/CD + sandbox</li>
      </ol>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>Evidence rail:</b> model call · tool call · policy result · CI result · approval ·
          deployment · health
        </p>
      </div>

      <h2 id="claude-code">Claude Code: treat the repository as the operating context</h2>
      <p>
        <code>CLAUDE.md</code> is the engineering contract, not a substitute for security
        enforcement. The workflow: <b>Discover → Plan → Change → Validate → Pull request.</b>
      </p>
      <p>Repository rules that matter:</p>
      <ul>
        <li>Preserve protected security and deployment workflows</li>
        <li>Make the smallest viable change</li>
        <li>Run deterministic validation before proposing the PR</li>
        <li>Return the diff, evidence, remaining risk, and rollback steps</li>
      </ul>

      <h2 id="tools">MCP + tools: narrow tools beat an unrestricted shell</h2>
      <p>
        Claude Code requests an operation → the Tool Gateway enforces a typed contract and policy →
        AWS/Git authorizes the target.
      </p>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>Blocked by design:</b> arbitrary admin shell · broad inherited credentials ·
          unregistered cloud actions
        </p>
      </div>

      <h2 id="devsecops">DevSecOps: the agent does not grade its own work</h2>
      <p>
        Build → unit + integration → IaC validation → SAST / SCA → secrets → approval → deploy.
        Independent gates decide whether the artifact moves forward. A model assertion never
        replaces a test result, scan result, policy decision, or deployment health signal.
      </p>

      <h2 id="observability">Observability: an evidence chain, not a chat transcript</h2>
      <ol>
        <li><b>Request</b> — who asked + what changed</li>
        <li><b>Model</b> — invocation + reasoning context</li>
        <li><b>Tool</b> — operation + identity + policy</li>
        <li><b>Pipeline</b> — tests + scans + artifact</li>
        <li><b>Decision</b> — review + approval</li>
        <li><b>Runtime</b> — deploy + health + rollback</li>
      </ol>

      <h2 id="operating-model">The operating model: start bounded, scale on evidence</h2>
      <p>
        Agentic engineering becomes useful at enterprise scale when the controls are visible,
        independent, attributable, and measurable.
      </p>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>Claude Code + AWS controls + independent evidence = trust.</b>
        </p>
      </div>

      <p>
        This is the short version of{" "}
        <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">
          the ten control disciplines
        </a>{" "}
        — see <a href="/challenge">the 30-day challenge</a> to build the reference project these
        four boundaries describe.
      </p>
    </ContentLayout>
  );
}
