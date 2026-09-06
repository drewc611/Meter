import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "claude-architecture/building-agents-with-claude-the-agentic-loop.html",
  title: "Building Agents with Claude: The Agentic Loop — Merit AC Guides",
  description:
    "What actually makes a system agentic, the anatomy of one loop iteration with Claude, and the stopping conditions, approval gates, and observability a real agent loop needs.",
};

export default function AgenticLoopWithClaude() {
  return (
    <ContentLayout active="claude-architecture" wide>
      <span className="kicker">Guide · architecture</span>
      <h1>Building agents with Claude: the agentic loop</h1>
      <p className="lead">
        Almost every architecture question about building an agent with Claude — or any tool-using
        model — collapses into the same underlying object: a loop. Not a metaphorical loop, a literal
        one, with a real stopping condition, a real execution boundary, and real failure modes if you
        get either wrong. This guide walks through that loop from the inside — what's actually in it,
        what decisions it forces you to make, and where it tends to break in practice.
      </p>

      <Toc
        items={[
          { href: "#what-makes-it-agentic", label: "1. What makes it agentic" },
          { href: "#anatomy", label: "2. Anatomy of one iteration" },
          { href: "#stopping-conditions", label: "3. Stopping conditions" },
          { href: "#tool-design", label: "4. Tool design inside the loop" },
          { href: "#approval-gates", label: "5. Human-in-the-loop gates" },
          { href: "#observability", label: "6. Observability inside the loop" },
          { href: "#worked-example", label: "7. Worked example" },
        ]}
      />

      <h2 id="what-makes-it-agentic">1. What makes it agentic</h2>
      <p>
        A single API call to Claude — send a prompt, get a completion back — isn't an agent, no matter
        how good the completion is. It's a function call: input in, text out, nothing in the world
        changed as a result except whatever the caller decides to do with the string it got back. The
        word "agentic" describes a different shape entirely: the model's output can trigger a real
        action — a tool call, a file edit, a web request, a database write — and the <em>result</em> of
        that action is fed back into the next call to the model, forming a loop that continues until
        some condition says stop.
      </p>
      <p>
        That feedback path is the entire distinction. A chatbot that calls a search tool once, then
        writes a final answer using whatever came back, is barely more agentic than a single-shot call
        — there's one action and no chance for the model to react to how it went. An agent, by
        contrast, might search, notice the results don't answer the question, reformulate the query,
        search again, find a promising page, fetch it, discover it 404s, try a cached version instead,
        and only then write the answer. Nothing about any individual step is exotic; what makes the
        whole thing agentic is that each step's outcome is visible to the model before it decides the
        next one.
      </p>
      <p>
        This matters architecturally because it changes what you're building. A single-shot integration
        is a prompt template and a response parser. An agentic system is a loop with state, a set of
        actions it's allowed to take, a way to detect when it's finished, and a way to stop it when it
        isn't finishing on its own. Most of the engineering effort in a production agent goes into that
        last set of concerns — not into getting the model to produce a good tool call, which the model
        is generally reliable at, but into the harness around it.
      </p>

      <h2 id="anatomy">2. Anatomy of one loop iteration</h2>
      <p>
        Strip away every framework's specific vocabulary and one iteration of an agentic loop does the
        same four things, in the same order, every time:
      </p>
      <ol>
        <li>
          <b>Assemble context.</b> The model receives the conversation so far — the original task, every
          prior tool call and its result, any intermediate reasoning — plus the definitions of the tools
          it's currently allowed to use.
        </li>
        <li>
          <b>The model decides.</b> Given that context, Claude either responds directly (it has enough
          information to answer, or the task is done) or requests one or more tool calls, each naming a
          specific tool and the argument values it wants to call it with.
        </li>
        <li>
          <b>The harness executes.</b> Your code — not the model — actually runs the requested tool
          against the real system: it hits the API, queries the database, writes the file, whatever the
          tool does. The model never touches the outside world directly; it only ever requests that
          your code do so.
        </li>
        <li>
          <b>The result rejoins the context.</b> The tool's output is appended to the conversation as a
          tool result, and the loop returns to step 1 with that new information now part of what the
          model sees.
        </li>
      </ol>
      <p>
        The general shape of the message format across tool-using APIs follows this same structure:
        the model's turn includes a tool-use request naming a tool and its input parameters, and the
        next turn in the conversation is a tool-result message carrying whatever your code got back,
        correlated to that specific request. The exact field names vary by API and version, but the
        pattern — name, arguments, matching result — is the stable part worth designing around.
      </p>
      <Code wrap>{`# pseudocode — illustrative shape, not a specific SDK's exact syntax
loop:
  response = call_model(conversation, tools=available_tools)
  if response.stop_reason == "end_turn":
      return response.text   # model chose to respond directly — done
  for each tool_use in response.tool_calls:
      result = execute_tool(tool_use.name, tool_use.input)   # your code, not the model
      conversation.append(tool_result(tool_use.id, result))
  # loop continues with the new tool results now in context`}</Code>
      <p>
        Two things about this shape are easy to get wrong the first time. First, the model can request
        several tool calls in the same turn — see the discussion of parallel versus sequential
        execution in the companion guide on tool use — and the harness has to return a result for
        every one of them before the next model call, not just the first. Second, "the model decided
        to respond directly" and "the task is actually finished" are not the same fact, which is the
        whole subject of the next section.
      </p>

      <h2 id="stopping-conditions">3. Stopping conditions</h2>
      <p>
        The model saying, in effect, "I'm done" is a necessary signal but not a sufficient one to end
        the loop. It's necessary because you do want the model to be able to conclude a task and hand
        back a final answer — you don't want a loop that only stops on an external timeout. But relying
        on it alone means the only thing standing between a working agent and a runaway one is the
        model's own judgment about its own progress, and that judgment can be wrong in ways that are
        specific to agentic execution rather than to single-shot generation.
      </p>
      <p>
        The failure that shows up in practice most often isn't the model refusing to stop — it's the
        model getting stuck retrying a variation of the same failing action. A tool call fails with an
        error, the model reasonably tries again with slightly different arguments, that fails too, and
        without an external check there's nothing structurally preventing a dozen more attempts at
        essentially the same broken call. Nothing about that trajectory triggers the model's own
        "I'm done" logic — from its perspective it's still making progress, one more plausible attempt
        at a time.
      </p>
      <p>A real stopping condition is a small set of checks layered on top of the model's own signal:</p>
      <ul>
        <li>
          <b>A hard iteration cap.</b> The loop stops after N iterations regardless of what the model
          says, full stop. This is the backstop that makes every other failure mode bounded instead of
          open-ended.
        </li>
        <li>
          <b>A wall-clock timeout.</b> Independent of iteration count, because some tool calls are slow
          individually — a handful of long-running calls can exhaust a time budget well before they
          exhaust an iteration budget.
        </li>
        <li>
          <b>Repetition detection.</b> Comparing the current tool call (name plus arguments, or a
          normalized form of them) against recent calls in the same session, and treating a near-exact
          repeat — especially one that already failed once — as a signal to stop and escalate rather
          than try again.
        </li>
        <li>
          <b>A resource or cost ceiling.</b> Total tokens spent, total tool calls made, or total dollars
          of API and downstream-tool cost, whichever the deployment actually cares about bounding.
        </li>
      </ul>
      <div className="card">
        <p>
          <b>Design note:</b> put these checks in the harness, not in the prompt. Asking the model to
          "stop after a few tries if something keeps failing" is a request the model will generally
          try to honor, but it's advisory — the model has no privileged access to a real iteration
          counter unless your code hands it one, and a check that only exists as an instruction is a
          check that a long enough or unusual enough trajectory can still slip past. The hard cap should
          be a loop condition in code that the model's own output cannot override.
        </p>
      </div>
      <p>
        What happens when a stopping condition fires — as opposed to the model's own end-turn signal —
        also deserves a deliberate answer. Hitting the iteration cap isn't the same outcome as the model
        finishing the task, and a caller (a user, a downstream system) needs to be able to tell those
        two apart: one is a completed result, the other is an incomplete one that needs a human to look
        at the transcript and decide what to do next.
      </p>

      <h2 id="tool-design">4. Tool design inside the loop</h2>
      <p>
        The loop's behavior is only as good as the tools it's choosing between at each iteration, and
        this site's guide on{" "}
        <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">
          the ten disciplines of governed agentic DevSecOps
        </a>{" "}
        covers the tool-design question in depth for coding agents specifically — its discipline 5,{" "}
        <a href="/guides/ten-disciplines-of-governed-agentic-devsecops#tool-design">tool design</a>, is
        directly relevant here even though this guide's frame is general-purpose agent loops rather than
        coding agents in particular. The short version carries over unchanged: narrow, well-typed tools
        with predictable output beat a single do-anything tool, for the same reasons in a loop as
        outside one. A tool with a clear purpose and constrained arguments is easier for the model to
        select correctly among alternatives, easier for a reviewer to audit after the fact from the
        execution log, and easier to constrain with authorization logic that doesn't have to reason
        about an unbounded space of things the tool might be asked to do.
      </p>
      <p>
        Inside a loop specifically, narrow tools also make the stopping-condition logic from the
        previous section tractable. Detecting "the model is retrying the same failing action" is a
        well-defined comparison — same tool name, same or near-identical arguments — when tools are
        narrow and typed. It's a much fuzzier judgment call when the tool is a generic command executor
        and "the same action" might be expressed as superficially different command strings that do the
        same thing, or superficially similar ones that don't.
      </p>

      <h2 id="approval-gates">5. Human-in-the-loop gates</h2>
      <p>
        Not every tool call in a loop should execute the moment the model requests it, and not every
        tool call needs a human to sign off first either — the interesting design work is deciding
        which is which, deliberately, rather than defaulting to one extreme or the other.
      </p>
      <p>
        A loop with no approval gates at all is fast and, for genuinely low-consequence actions —
        reading a file, querying a read-only API, searching a knowledge base — that speed is exactly
        the point; gating a read has no safety benefit and a real cost in how usable the agent is. A
        loop that gates <em>everything</em> uniformly produces the opposite failure: an approver facing
        a steady stream of low-stakes requests learns to click approve without reading them, at which
        point the gate exists on paper but has stopped doing anything in practice.
      </p>
      <p>
        The boundary that actually holds is based on consequence and reversibility, not on which system
        the tool happens to touch. A tool call that's easy to undo if it turns out to be wrong — most
        reads, most staging-environment writes, anything with a working rollback — can reasonably run
        without a pause. A tool call that's expensive or impossible to reverse — a production deploy, an
        irreversible delete, sending an external communication, a financial transaction — is exactly
        where a pause for approval earns its cost, because the value of catching a mistake before it
        happens is highest precisely where undoing it afterward is hardest or most expensive.
      </p>
      <p>
        Where the gate sits in the loop matters as much as which actions it covers. The useful place to
        pause is after the model has decided on a specific action with specific arguments — the
        harness intercepts the tool call before executing it and shows a reviewer the actual proposed
        call, not a vague plan — and before that action's result rejoins the context. Approving too
        early, before there's a concrete action to look at, gives a reviewer nothing to evaluate; the
        loop should have already done the work of narrowing "what should happen" down to one specific,
        inspectable call by the time a human is asked to weigh in.
      </p>

      <h2 id="observability">6. Observability inside the loop</h2>
      <p>
        A transcript of what the model said — its reasoning, its final answer, even the text form of
        its tool requests — is not the same record as what actually happened when those tool calls
        executed. Conflating the two is one of the most common gaps in early agent deployments, and it
        surfaces at exactly the wrong moment: when something has gone wrong and someone needs to
        reconstruct what the agent actually did.
      </p>
      <p>
        The transcript can show the model saying it looked something up and got a particular answer.
        What it doesn't show, on its own, is which tool actually ran, with which exact argument values,
        against which system, returning which raw result, at what time, inside which loop iteration.
        Those facts live in the tool execution itself, not in the model's description of it — and a
        model's description, however accurate it usually is, is not something an incident review should
        have to take on faith.
      </p>
      <p>
        A real agent loop needs its own execution log, separate from and parallel to the conversational
        transcript: one row per tool call, recording the tool name, the exact arguments the model
        requested, the exact result the harness got back, the timestamp, the loop iteration number, and
        — where a stopping condition or approval gate fired — which one and why. That log is what lets
        you answer "what did the agent actually do" without re-deriving it from the model's own account
        of itself, and it's the raw material any repetition-detection or cost-ceiling check from{" "}
        <a href="#stopping-conditions">section 3</a> is built on in the first place.
      </p>

      <h2 id="worked-example">7. Worked example</h2>
      <p>
        Take a concrete multi-step task: "Find last month's AWS spend for the staging account, compare
        it to the prior month, and if it's up more than 15%, open a ticket summarizing the likely
        cause." Tracing it through the loop makes the abstractions above concrete.
      </p>
      <p>
        <b>Iteration 1.</b> Context: the task description, and definitions for a small set of tools —
        <code>get_cost_report(account, month)</code>, <code>list_recent_resources(account, month)</code>,
        and <code>create_ticket(title, body)</code>. The model has no data yet, so it requests
        <code>get_cost_report(account="staging", month="2026-08")</code>. The harness executes it against
        the real billing API and appends the result — a total dollar figure — to the conversation.
      </p>
      <p>
        <b>Iteration 2.</b> Context now includes August's total. The model requests the same call for
        July to get a comparison point:{" "}
        <code>get_cost_report(account="staging", month="2026-07")</code>. This is a case where two calls
        are independent of each other — August's number in no way depends on July's — so a harness
        capable of parallel tool execution could have issued both in iteration 1 instead of serializing
        them; whether that optimization is worth the added complexity is a real design tradeoff, not a
        must-do.
      </p>
      <p>
        <b>Iteration 3.</b> Context now includes both totals. The model computes the percentage
        increase itself (a 22% jump, say) and, since it crosses the 15% threshold stated in the task,
        requests <code>list_recent_resources(account="staging", month="2026-08")</code> to find a likely
        cause before writing the ticket. This is exactly the kind of exploratory step a single-shot call
        could never take — the decision to look for a cause only exists because the model saw the
        comparison result first.
      </p>
      <p>
        <b>Iteration 4.</b> The resource list comes back showing a new, unusually large instance type
        that appeared mid-month. The model now has what it needs and requests{" "}
        <code>create_ticket(title="Staging AWS spend up 22% — new instance type detected", body=...)</code>
        . This is precisely the kind of action from <a href="#approval-gates">section 5</a> worth
        gating — it's a real side effect visible to other people, not easily invisible if wrong, and
        cheap to review — so a well-designed version of this loop pauses here, shows a reviewer the
        exact ticket text and the data behind it, and only executes the tool call after approval rather
        than automatically.
      </p>
      <p>
        <b>Iteration 5.</b> Once approved (or, in an ungated version, immediately), the harness runs the
        ticket-creation call, appends the resulting ticket ID, and the model responds with a final
        summary. Its own end-turn signal now aligns with what actually happened — the task is genuinely
        done, not just declared done — because every fact in its summary traces back to a tool result
        that's independently recorded in the execution log, not to something the model merely asserted.
      </p>
      <p>
        Notice where the hard iteration cap from <a href="#stopping-conditions">section 3</a> would
        have mattered if something had gone differently: if <code>get_cost_report</code> had failed
        with a transient error at iteration 1, a naive retry loop could plausibly spend five or six
        iterations re-requesting the same call before ever reaching the comparison step — exactly the
        pattern a repetition check exists to catch, well before a cap tuned for a five-iteration task
        would need to fire on its own.
      </p>

      <p>
        For the tool-level design decisions this example glosses over — how to write the tool
        descriptions that shape which call the model picks, and how to handle a tool call that fails —
        see{" "}
        <a href="/claude-architecture/claude-tool-use-and-function-calling">
          Claude tool use and function calling architecture
        </a>
        .
      </p>
    </ContentLayout>
  );
}
