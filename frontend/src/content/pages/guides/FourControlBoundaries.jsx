import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";

export const meta = {
  outFile: "guides/four-control-boundaries.html",
  title: "Four Control Boundaries for Agentic DevSecOps — Merit AC Guides",
  description:
    "Code generation is the easy part. The enterprise problem is controlling what happens after the model decides what it wants to do — adapted from our own Agentic DevSecOps reference deck.",
};

export default function FourControlBoundaries() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide · from the Agentic DevSecOps reference deck</span>
      <span className="badge">
        <i /> From the Merit AC team
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
      <p>
        Collapsing them is tempting because it looks like fewer moving parts: one fewer service to
        wire up, one fewer handoff to explain, a demo that feels faster because nothing stops the
        model between deciding and doing. What goes wrong in practice is that a single actor ends up
        holding both judgment and authority at once — a model reasons that a stale branch should be
        deleted, or that a failing deployment should be rolled back by force-pushing over it, and
        because there is no separate gate to cross, the same call that proposed the action also has
        the credential to execute it. Nothing sits between "I think this is a good idea" and "this
        just happened."
      </p>

      <h2 id="boundaries">The four boundaries</h2>
      <p>The platform has four control boundaries. Every action crosses a boundary that can be logged, denied, reviewed, tested, or rolled back.</p>
      <ol>
        <li>
          <b>Request</b> — engineer / application. A prompt, ticket, or triggered workflow enters
          the platform here; a denial at this boundary means the request never reaches the model at
          all — blocked by rate limit, scope, or request type before any reasoning happens.
        </li>
        <li>
          <b>Reason</b> — Claude Code + Bedrock. The model inspects context and proposes a specific
          tool call plus its rationale, nothing more; a "denial" here has no rollback to perform,
          because the proposal was never authority to act — it's discarded and the loop continues.
        </li>
        <li>
          <b>Authorize</b> — Gateway + identity + policy. A proposed tool call becomes (or doesn't
          become) a permitted action, checked against identity, scope, and target; a denial here is
          logged with a specific policy reason, not silently dropped, so it becomes part of the
          evidence trail rather than a dead end.
        </li>
        <li>
          <b>Verify</b> — CI/CD + sandbox. The resulting artifact is checked independently of
          whatever the model claims about it; a rollback here reverts a deployment or blocks a merge
          through the same deterministic pipeline that would catch a human engineer's mistake.
        </li>
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
      <p>
        It's tempting to treat <code>CLAUDE.md</code> as if it were a control, since it names the
        workflows to preserve and the changes that are out of bounds. It isn't one — a markdown file
        is a strongly worded instruction to a model, and nothing stops the model from reasoning its
        way around it under pressure to make a task succeed. The actual boundary sits downstream, in
        CI and branch protection and review: those are what turn "the agent was told not to touch
        this" into "the agent structurally cannot merge a change to this without a human looking at
        it."
      </p>
      <p>Repository rules that matter:</p>
      <ul>
        <li>Preserve protected security and deployment workflows</li>
        <li>Make the smallest viable change</li>
        <li>Run deterministic validation before proposing the PR</li>
        <li>Return the diff, evidence, remaining risk, and rollback steps</li>
        <li>Ask before widening a tool's scope or a credential's permissions — don't proceed and mention it in the PR description</li>
      </ul>

      <h2 id="tools">MCP + tools: narrow tools beat an unrestricted shell</h2>
      <p>
        Claude Code requests an operation → the Tool Gateway enforces a typed contract and policy →
        AWS/Git authorizes the target.
      </p>
      <p>
        The common mistake is scoping tools around what's convenient to build rather than what the
        task actually needs — handing the agent the same broad, long-lived credential an engineer
        would use interactively, because minting a narrow one per tool takes extra setup. That
        shortcut quietly collapses Authorize back into Reason: if the credential can already do
        anything, the Gateway's policy check becomes a formality instead of a real constraint. A
        well-scoped tool fails loudly and specifically when asked for something outside its
        contract, instead of falling back to a broader permission it happened to inherit.
      </p>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>Blocked by design:</b> arbitrary admin shell · broad inherited credentials ·
          long-lived static credentials · unregistered cloud actions
        </p>
      </div>

      <h2 id="devsecops">DevSecOps: the agent does not grade its own work</h2>
      <p>
        Build → unit + integration → IaC validation → SAST / SCA → secrets → approval → deploy.
        Independent gates decide whether the artifact moves forward. A model assertion never
        replaces a test result, scan result, policy decision, or deployment health signal.
      </p>
      <p>
        The failure mode to watch for is treating a green pipeline as proof when the agent authored
        both the change and the tests validating it — a model that writes a bug can just as easily
        write a test that doesn't catch it. Gates only stay independent if their configuration,
        thresholds, and test suites move through the same review process as everything else, rather
        than getting quietly loosened by the same agent that's trying to get a build to pass.
      </p>

      <h2 id="observability">Observability: an evidence chain, not a chat transcript</h2>
      <p>
        A chat transcript records what the model said it was doing, not what actually happened
        downstream — it's narration, not evidence. The common mistake is treating a clean-looking
        conversation log as an audit trail; it can't answer whether the tool call it describes was
        actually authorized, what the policy engine decided, or whether the deployment it claims
        succeeded actually passed a health check. The six-stage chain below is what makes a single
        action traceable end to end, from request to rollback, regardless of what the model said
        about it.
      </p>
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
