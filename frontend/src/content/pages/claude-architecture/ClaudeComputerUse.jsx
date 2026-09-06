import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "claude-architecture/claude-computer-use-architecture.html",
  title: "Claude Computer Use: Architecture and Safety Boundaries — Merit AC Guides",
  description:
    "When letting a model see a screen and drive a mouse and keyboard is the right architecture, and the containment, logging, and approval gates it needs that ordinary tool use doesn't.",
};

export default function ClaudeComputerUse() {
  return (
    <ContentLayout active="claude-architecture" wide>
      <span className="kicker">Guide · agent architecture</span>
      <h1>Claude computer use: architecture and safety boundaries</h1>
      <p className="lead">
        Most of the time, giving a model a capability means giving it a tool: a named function with a
        typed input, a typed output, and a narrow, specific job. Computer use is a different shape of
        capability entirely. Instead of calling a function that does one thing, the model looks at a
        screenshot of a real screen, decides what a person would do next, and issues a mouse click, a
        keystroke, or a scroll — the same primitives a human operator has, aimed at the same interface a
        human operator would see. That's a genuinely useful capability for a specific class of problem,
        and a meaningfully different architectural commitment than adding another tool to an agent's
        toolbox. This guide is about when that trade is worth making, and what has to be built around it
        so the trade doesn't turn into an incident.
      </p>

      <Toc
        items={[
          { href: "#what-it-is", label: "1. What computer use actually is" },
          { href: "#when-right-tool", label: "2. When it's the right tool" },
          { href: "#last-resort", label: "3. Why it should be a last resort, not a default" },
          { href: "#reach-problem", label: "4. The reach problem: scoping what it can touch" },
          { href: "#brittleness", label: "5. Brittleness: misread pixels, moved buttons" },
          { href: "#containment", label: "6. Constrain the environment, not just the model" },
          { href: "#observability", label: "7. The observability requirement" },
          { href: "#oversight", label: "8. Human oversight and checkpoints" },
          { href: "#worked-example", label: "9. Worked example: a good use and a bad one" },
        ]}
      />

      <h2 id="what-it-is">1. What computer use actually is</h2>
      <p>
        In an ordinary tool-use architecture, the model's action space is exactly the set of functions
        it's been given, each with a schema that constrains what a valid call looks like. The model
        can't do anything a tool wasn't built to let it do. Computer use replaces that constrained
        action space with something much closer to unconstrained: the model receives a screenshot,
        reasons about what's visible in it — a button, a text field, a menu, an error dialog — and
        responds with a low-level action: move the pointer here, click, type this string, press this
        key, scroll. The harness executes that action against a real, running application, takes a new
        screenshot, and hands it back. The loop repeats until the task is done or the model gives up.
      </p>
      <p>
        The important architectural fact is that nothing about the target application had to be built
        or adapted for this. There's no API to integrate against, no schema to write, no endpoint to
        authenticate to. The model operates the same interface — the same pixels, the same widgets, the
        same click targets — that a human user would operate, through the same input primitives a human
        would use. That's the entire value proposition: it turns "can this be automated?" from a
        question about whether the target system exposes a programmatic interface into a question about
        whether the task can be described and executed visually, which is a much larger set of tasks.
      </p>
      <p>
        It's also the entire source of the risk this guide spends most of its length on. A typed tool's
        action space is exactly as large as its schema. Computer use's action space is, in principle,
        everything a mouse and keyboard can do to whatever is on screen — which is also, not
        coincidentally, exactly as much reach as the human account the session is running under. Building
        with computer use means building with that fact in mind from the start, not discovering it after
        an agent clicks something it shouldn't have.
      </p>

      <h2 id="when-right-tool">2. When it's the right tool</h2>
      <p>
        Computer use earns its place in an architecture under a fairly narrow set of conditions, and
        it's worth naming them precisely rather than reaching for computer use whenever a task involves
        a graphical application. The first and clearest case: no API exists for the task at all. Plenty
        of software — much of it older, internal, vendor-managed, or simply never built with automation
        in mind — has no programmatic surface whatsoever. If the only way to interact with a system is
        its UI, and the task genuinely needs to interact with that system, computer use is doing
        something a typed tool structurally cannot: acting where nothing else can act.
      </p>
      <p>
        The second case is a task that's inherently visual — one where the actual judgment required is
        about what something looks like, not just what data it returns. Verifying that a page rendered
        correctly, checking that a design matches a mock, confirming a dialog shows the right warning
        message in the right place: these are questions about the visual and spatial arrangement of an
        interface, which is exactly what a screenshot captures and an API response typically doesn't.
      </p>
      <p>
        The third case is a closed system that exposes a UI and nothing else on purpose — a third-party
        vendor's admin console with no public API, a legacy system a company doesn't control and can't
        modify, a piece of software whose only supported integration point, by design or by neglect, is
        a human sitting in front of it. In all three cases, the common thread is the same: computer use
        is the right choice specifically when it's filling a gap that nothing better can fill, not when
        it's a more entertaining way to do something a typed tool already does well.
      </p>

      <h2 id="last-resort">3. Why it should be a last resort, not a default</h2>
      <p>
        It's worth stating the ordering explicitly, because the failure mode here isn't misusing
        computer use on a task it can't handle — it's reaching for it on a task a narrow tool would
        handle better. See{" "}
        <a href="/claude-architecture/claude-tool-use-and-function-calling">
          Claude tool use and function calling
        </a>{" "}
        for the fuller case for typed tools generally; the short version that matters here is this: if a
        narrow, typed, purpose-built tool or API exists for a task, prefer it. Computer use is slower,
        because every step round-trips through a screenshot and a fresh interpretation of it rather than
        a single structured call. It's more brittle, because a UI is free to change — a redesigned
        button, a relocated menu, a new onboarding dialog that appears once — in ways a stable API
        contract explicitly promises not to. It's harder to constrain precisely, for the reasons the next
        section covers in depth. And it's harder to audit, because "the model clicked at these
        coordinates after interpreting this screenshot" is a much less legible log entry than "the model
        called <code>update_customer_address(customer_id, new_address)</code> and the API returned
        success."
      </p>
      <p>
        None of that makes computer use a bad capability — it makes it an expensive one, in exactly the
        senses that matter for a production system: latency, reliability, precision, and reviewability.
        A well-designed API call spends less of all four than a UI-driving action sequence doing the
        same job. The architectural discipline is to treat computer use as the fallback for tasks
        nothing else can reach, not the default starting point because it feels more general or more
        impressive to demo. A system that reaches for computer use first and asks "is there an API for
        this?" second has the ordering backwards.
      </p>

      <h2 id="reach-problem">4. The reach problem: scoping what it can touch</h2>
      <p>
        Ordinary tool use has a clean answer to "what can this agent do?": exactly what its tools let it
        do, and nothing else. A tool that only exposes <code>read_ticket(ticket_id)</code> cannot delete
        a ticket, no matter what the model decides to attempt, because the capability to delete simply
        doesn't exist in its action space. That's the whole point of a narrow tool contract — the
        authorization boundary is enforced by what was built, not by what the model chooses to do.
      </p>
      <p>
        Computer use doesn't have that property, and this is the risk that's genuinely specific to it
        rather than a more severe version of an ordinary tool-use risk. An agent driving a UI has, in
        principle, the same reach as a human sitting at that computer: whatever is visible on screen and
        clickable is, mechanically, within its action space. If the session is logged into an account
        that can also see billing settings, or a file browser that can also reach unrelated directories,
        or an admin panel with a delete button two clicks away from the task at hand, that reach exists
        whether or not the task was ever supposed to touch it. Scoping "what is this agent actually
        allowed to touch" is not a matter of writing a narrower function signature, the way it would be
        for an API tool — there's no function signature to narrow. It has to be enforced by constraining
        what the agent can even see and reach in the first place, which is a fundamentally different
        kind of control, covered in the next two sections.
      </p>

      <h2 id="brittleness">5. Brittleness: misread pixels, moved buttons</h2>
      <p>
        The second risk specific to computer use is precision, and it fails in a way ordinary tool calls
        mostly don't. A typed tool call either matches its schema or it's rejected before it executes —
        there's a hard, mechanical check between "the model wants to do this" and "this actually
        happens." A computer-use action has no equivalent check: the model interprets a screenshot,
        decides a set of pixel coordinates corresponds to the button it means to click, and the harness
        clicks there. If the model's interpretation is slightly wrong — it misreads a label, confuses two
        visually similar buttons, or acts on a stale screenshot taken half a second before something on
        screen changed — the click still happens. It just happens on the wrong thing.
      </p>
      <p>
        The same failure shows up over time even when the model's interpretation is perfect at the
        moment it acts: software changes. A button that moves three pixels in a redesign, a confirmation
        dialog that a new software version inserts before an action that used to be one click, a renamed
        menu item — any of these can silently invalidate an interaction pattern that worked reliably
        until the day the UI shipped a change nobody told the agent about. An API integration breaks
        loudly, with a version mismatch or a 404, at the moment the contract changes. A UI-driving agent
        can fail quietly and confidently instead, clicking the thing that used to be at those coordinates
        and proceeding as though it succeeded.
      </p>
      <p>
        Neither of these is a reason to avoid computer use for tasks that genuinely need it. It's a
        reason to design around the fact that a single misread click or a single UI change can produce a
        real, executed action with real consequences, in a way a rejected malformed API call cannot —
        and that shifts the weight onto containment, logging, and approval, which is exactly what the
        rest of this guide covers.
      </p>

      <h2 id="containment">6. Constrain the environment, not just the model's judgment</h2>
      <div className="card">
        <p>
          <b>The core architectural move:</b> don't rely on the model to correctly judge what it should
          and shouldn't touch on a full production desktop. Instead, build an environment where the only
          things reachable are the things the task actually needs — so a mistake, if one happens, has a
          contained blast radius instead of the same reach a human user of that machine would have.
        </p>
      </div>
      <p>
        This follows directly from the reach problem in section 4: if scoping "what can this agent
        touch" can't be enforced through a tool contract, it has to be enforced through the environment
        the agent is given. Run a computer-use agent inside a sandboxed, disposable session — a
        fresh, isolated virtual machine or container built for the task, not a general-purpose desktop
        with a browser logged into everything an employee happens to use — with only the specific
        applications and data the task genuinely requires present at all. If the task is "renew this one
        vendor's subscription through their admin console," the environment should have that console
        open, logged in with an account scoped to that purpose, and essentially nothing else reachable
        from it. A stray click has nowhere consequential to land.
      </p>
      <p>
        Disposability matters as much as isolation. An environment that's torn down and rebuilt fresh
        for each task, rather than a persistent desktop the agent reuses across sessions, means a mistake
        in one run doesn't accumulate state that affects the next one, and a compromised or confused
        session can't leave something behind for a future session to inherit. Treat the environment the
        same way a well-designed API tool treats its own scope: as small as the task allows, not as
        large as convenience allows. The instinct to just hand the agent a full desktop because it's
        faster to set up is the same instinct, in a different form, that discipline 4 of{" "}
        <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">
          The ten disciplines of governed agentic DevSecOps
        </a>{" "}
        warns against for ordinary agents — inheriting broad access because scoping it down takes more
        upfront work.
      </p>

      <h2 id="observability">7. The observability requirement, specific to computer use</h2>
      <p>
        Ordinary tool use leaves a naturally legible trace: a function name, its arguments, and its
        return value, each of which is already structured data a person or a policy engine can read
        directly. Computer use doesn't produce that kind of trace by default — a sequence of screen
        coordinates and keystrokes is not, by itself, a meaningful record of what happened from a
        reviewer's point of view. What makes computer use auditable is a screenshot-and-action log: the
        actual image the model was looking at at each step, paired with the actual action it took in
        response, retained in sequence for the whole run.
      </p>
      <p>
        This isn't a nice-to-have layered on afterward — it's the only real record of what a computer-use
        agent actually did, and without it, reconstructing an incident means guessing backward from the
        task's final state. If a task that was supposed to update one field in a form instead left a
        system in an unexpected state, a screenshot log lets a reviewer see exactly which screen the
        agent was looking at, exactly what it clicked, and exactly where that click landed — the same way
        a flight recorder lets an investigator see what a pilot saw and did, rather than only what the
        aircraft ended up doing. Without that log, the honest answer to "what happened" is "we don't
        know — we can only see where it ended up," which is a materially worse position to investigate
        an incident from than having the actual sequence of screens and actions to walk through.
      </p>
      <p>
        Store the log somewhere it survives the disposable environment it was generated in — the whole
        point of the containment strategy in the previous section is that the environment itself gets
        torn down, so the record of what happened inside it has to be shipped out before that happens,
        not kept only on the machine that no longer exists once the task is done.
      </p>

      <h2 id="oversight">8. Human oversight and checkpoints</h2>
      <p>
        Given the combination the previous sections describe — reach that's hard to scope precisely, and
        precision that degrades in ways that fail quietly rather than loudly — computer-use workflows
        need more human oversight than an equivalent ordinary tool-use agent loop, not less. It's
        tempting to reach for the opposite instinct, because computer use often gets built for tasks that
        feel repetitive and low-stakes on the surface — clicking through a familiar set of screens the
        same way every time looks like exactly the kind of thing that shouldn't need a human in the
        loop. The risk that argues against that instinct isn't in the common case where the screens look
        the way they always do; it's in the much harder to predict case where they don't, and the agent
        proceeds anyway because nothing forced it to check.
      </p>
      <p>
        Put approval gates before consequential actions specifically — a purchase, a data deletion, an
        account change, anything that's expensive or hard to reverse — and let the gate show the actual
        screenshot the agent is about to act on, not just a natural-language description of what it
        intends to do. A reviewer looking at "I'm going to click submit on this form" has nothing
        concrete to evaluate; a reviewer looking at the actual screenshot, with the actual filled-in
        fields visible, can catch the case where the form doesn't say what the agent thinks it says. This
        is the same principle the approval discipline in{" "}
        <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">
          The ten disciplines of governed agentic DevSecOps
        </a>{" "}
        applies to ordinary agents, carried through to what "the exact proposed action" means when the
        action is a click on a screen rather than a typed function call: the reviewer needs to see what
        the model saw, not just what it concluded.
      </p>

      <h2 id="worked-example">9. Worked example: a good use and a bad one</h2>
      <p>
        <b>The bad use.</b> A team wants to automate renewing a set of internal software licenses. The
        vendor's admin portal has a documented REST API that supports exactly this — an authenticated
        endpoint that extends a license by a given period and returns a confirmation. The team builds a
        computer-use agent instead, because it looks more impressive in a demo to show the agent
        navigating the portal's actual login screen, clicking through its actual menus, and filling in
        its actual renewal form the way a person would. The task gets done, but the resulting system is
        slower than an API call, more exposed to breaking the next time the vendor redesigns their
        portal, and harder to review than a single logged function call with a typed argument and a
        typed response would have been. Nothing about the task required operating a UI — an API existed
        the whole time, and computer use was chosen for how it looks, not for what it uniquely does.
      </p>
      <p>
        <b>The legitimate use.</b> The same team also needs to renew a license with a smaller vendor
        whose only administration surface is a web portal with no API, no webhook, and no support for
        programmatic access of any kind — confirmed by checking their documentation and, when that comes
        up empty, asking their support team directly. The task is exactly what a person would otherwise
        do by hand each renewal cycle: log in, navigate to the billing section, confirm the renewal,
        screenshot the confirmation for the record. Here computer use is filling a real gap: the UI is
        genuinely the only integration point that exists. Built inside a disposable, scoped environment
        — logged in with an account that can only see that vendor's billing section, nothing else — with
        a full screenshot log kept for the run and a human approval step before the final confirmation
        click, this is computer use doing the job only it can do, with the containment and oversight the
        earlier sections describe wrapped around it.
      </p>
      <Code wrap>{`A quick test before reaching for computer use on a task:

1. Does a documented API or SDK exist for this system? If yes, use it —
   stop here.
2. Does the task require judging what something visually looks like,
   not just what data it returns? If yes, computer use may be warranted.
3. Is the UI genuinely the only integration point — no API, no webhook,
   no export, confirmed rather than assumed? If yes, computer use may
   be warranted.
4. If neither 2 nor 3 holds, the task probably doesn't need computer
   use yet, even if it's technically possible to do it that way.`}</Code>
      <p>
        Computer use is a real and useful pattern for the class of task nothing else can reach — but the
        architecture around it, not just the capability itself, is what determines whether it's a
        contained, auditable part of a system or an unscoped one. Pair it with the tool-design principles
        in{" "}
        <a href="/claude-architecture/claude-tool-use-and-function-calling">
          Claude tool use and function calling
        </a>{" "}
        to decide when it's actually warranted, and with the containment, logging, and approval patterns
        above whenever it is.
      </p>
    </ContentLayout>
  );
}
