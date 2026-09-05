import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "guides/context-engineering.html",
  title: "Context Engineering: What Actually Goes Into the Context Window — Merit AC Guides",
  description:
    "Why managing what fills an LLM's context window is a design discipline in its own right, not an afterthought to prompting — especially in long-running agentic loops.",
};

export default function ContextEngineering() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide · context management</span>
      <h1>Context engineering: what actually goes into the context window</h1>
      <p className="lead">
        A context window is not a scratchpad with infinite room and a hard wall at the end. It is a
        fixed, shared, competitive resource, and every token an agent loop puts into it — a tool
        definition, a retrieved document, a five-thousand-line JSON dump from an API call three turns
        ago — has to earn its place against everything else that could occupy that same space. Most of
        the practical failures people describe as "the model got dumber," "it forgot what I told it,"
        or "it stopped following instructions" in a long agent session are not model failures at all.
        They are context management failures: the window filled with the wrong things, in the wrong
        order, and the model did a reasonable job attending to what it was actually given.
      </p>

      <Toc
        items={[
          { href: "#whats-competing", label: "1. What's actually competing for space" },
          { href: "#context-rot", label: "2. Context rot: degradation before the ceiling" },
          { href: "#tool-result-bloat", label: "3. Tool-result bloat in agentic sessions" },
          { href: "#compaction", label: "4. Compaction and summarization strategies" },
          { href: "#fit-vs-use", label: "5. What fits vs. what gets used" },
          { href: "#relevance-framing", label: "6. A practical framing: relevance to the next action" },
        ]}
      />

      <h2 id="whats-competing">1. What's actually competing for space</h2>
      <p>
        Open up any real agent loop — a coding agent, a customer-support assistant with tools, a
        research agent that reads documents and writes a report — and the context window at any given
        turn is made up of several distinct kinds of content, all sharing one token budget. The system
        prompt or instructions come first: the agent's persona, its operating rules, the shape of the
        task it's meant to do. Then the tool definitions — the names, descriptions, and parameter
        schemas of every function the model is allowed to call, all of which have to be present on
        every single turn regardless of whether that turn uses them, because the model has to see the
        full menu to decide what to order from it. Then the conversation history — every prior user
        message, every prior assistant message, every prior tool call and its result, stretching back
        to the start of the session. Then, often, retrieved content — documents pulled in by a search
        or retrieval step because they seemed relevant to the current question. And then whatever the
        current turn actually adds: the new user message, or the result of the tool call the model just
        issued.
      </p>
      <p>
        None of these categories is free, and treating any one of them as free is where budgets quietly
        blow up. A tool inventory of thirty well-documented functions, each with a name, a description,
        and a JSON schema for its arguments, can easily run to several thousand tokens before the
        conversation has said a single word — and that cost repeats on every turn, because the full
        tool inventory has to be resent (or referenced by the harness in a way that has the same
        effective cost) for the model to keep considering it a legal action space. A retrieved document
        included "just in case it's useful" competes directly with the room available for the tool
        result the model is about to receive two turns from now. This is the opportunity-cost framing
        that's easy to lose sight of: it is not that a bloated system prompt is bad in isolation, it's
        bad because every token it occupies is a token that isn't available for the conversation
        history, the retrieved evidence, or the tool output the model actually needs to reason over
        later in the same session.
      </p>
      <p>
        Agentic loops make this worse than single-turn chat in a specific, structural way: the loop
        accumulates. A single question-answering exchange has one round of context to manage. An agent
        that runs for forty tool calls to complete a task carries the sum of all forty rounds — every
        tool call it issued, every result it got back, every intermediate piece of reasoning it wrote —
        into every subsequent turn, because the model has no memory outside the context window itself.
        The context window is the agent's only working memory, and unlike a system prompt or a schema,
        the size of the accumulated history is not something anyone decided on purpose. It's a byproduct
        of how many turns the task happened to take. That's exactly the part of the budget that needs
        active management, because it's the part nobody is deliberately sizing.
      </p>

      <h2 id="context-rot">2. Context rot: degradation before the ceiling</h2>
      <p>
        It's tempting to think of a context window purely in terms of its stated limit — a model rated
        for a large context window can "hold" that much, so as long as the running total stays under
        the ceiling, everything in it should be equally available to the model. That is not how
        transformer attention behaves in practice. As the amount of content in context grows, a model's
        ability to locate, weigh, and correctly use any single piece of it measurably degrades — not
        because the content fell off the end and got truncated, but because attention is spread across
        more competing signal, and the mechanism that lets a model relate any one token to any other
        gets diluted the more tokens there are to relate it to. Some practitioners call this "context
        rot": performance quietly declining as context fills, well before the token count reaches
        anything close to the model's advertised limit.
      </p>
      <p>
        This matters for a specific practical reason: it means the fix for "the agent is losing track
        of things" is not always "give it a bigger context window." A larger window raises the ceiling,
        which helps when the actual constraint is truncation — content that didn't fit at all. But if
        the problem is degradation within a window that was already well under its limit, a bigger
        window just gives the same degradation more room to happen before anyone notices, and it
        doesn't fix the underlying issue: too much of what's in context is irrelevant to the step the
        model is on right now, diluting its attention on the parts that matter. Model providers keep
        extending maximum context lengths, and that's a real capability increase for tasks that
        genuinely need to relate distant pieces of a large document. It's a different thing from a
        license to stop curating what an agent loop puts in context, and conflating the two is one of
        the most common context-engineering mistakes: "we have a million-token window now" gets read
        as "we no longer need to think about what goes in it," when the more accurate reading is "we
        have more room to make the same curation mistakes before we run into the hard ceiling."
      </p>
      <p>
        The practical implication is that a context budget has two failure regions, not one. There's
        the hard ceiling, where content is truncated or the request is rejected outright — an easy
        failure to detect, because it usually throws an error or visibly drops content. And there's the
        soft-degradation region below the ceiling, where everything technically fits and nothing errors,
        but the model's effective performance on the task is already worse than it would be with a
        smaller, better-curated context. That second region is the one context engineering as a
        discipline is actually about managing, because it doesn't announce itself — a session that's
        degrading from context rot just looks like the model is "having an off session" or "not as
        sharp today," when the more useful diagnosis is that it's attending across too much accumulated
        material to reliably find the part that matters for the current step.
      </p>

      <h2 id="tool-result-bloat">3. Tool-result bloat in long agentic sessions</h2>
      <p>
        The single most common way a real agent session fills its context window with low-value tokens
        is tool-result bloat: a tool call returns far more than the agent needs, and that entire result
        gets appended to the conversation history verbatim, where it sits for every subsequent turn
        whether anything ever references it again or not. A file-read tool that returns a whole
        thousand-line log file when the agent needed to check one error message near the bottom. An API
        call that returns a full JSON response with forty fields when three were relevant. A search tool
        that returns ten full documents when the agent will only ever quote two sentences from one of
        them. Each of these looks harmless in the turn where it happens — the agent got the information
        it needed, buried in the noise, and moved on. The cost shows up later: five, ten, twenty turns
        further into the session, that same thousand-line dump is still sitting in context, still
        costing tokens on every subsequent model call, and now competing for attention with everything
        that's happened since — including the parts of the conversation the model actually needs to
        remember to finish the task well.
      </p>
      <p>
        This is worth naming as its own problem, distinct from context rot generally, because it has a
        specific shape and specific fixes. The shape: a small number of oversized tool results,
        typically the raw, unprocessed output of a call that was designed to be complete rather than
        designed to be read by a model with a limited budget. The fix is not "call the tool less" — the
        agent often does need to read that file or hit that endpoint. The fix is intervening on what
        happens to the result <em>before it re-enters context</em>, at the boundary between the tool and
        the model, rather than after the fact:
      </p>
      <div className="card">
        <p style={{ marginBottom: "8px" }}>
          <b>Three ways to keep a tool result from bloating context, roughly in order of how much
          information they preserve:</b>
        </p>
        <p style={{ marginBottom: "8px" }}>
          <b>Structured extraction.</b> Instead of a tool that returns everything and lets the model
          find the relevant piece, design the tool to return only the fields the calling step actually
          needs — a database query that selects three columns instead of <code>SELECT *</code>, a log
          tool that returns matched lines around an error instead of the whole file, an API wrapper that
          projects the response down to the handful of fields the workflow cares about. This is the
          strongest fix because it prevents the bloat at the source rather than cleaning it up
          afterward, but it requires knowing ahead of time what a step needs — it works best for
          well-understood, repeated tool calls, not exploratory ones.
        </p>
        <p style={{ marginBottom: "8px" }}>
          <b>Summarizing or truncating before the result re-enters context.</b> When a tool's output
          can't be narrowed at the source — a genuinely open-ended file read, a search whose relevant
          part isn't knowable in advance — have the harness (or a small, cheap model call) summarize or
          truncate the result before it's appended to the conversation, rather than appending the raw
          output and trusting the model to skim past what it doesn't need on every future turn. This
          loses some information relative to the raw dump, and that's the real tradeoff: it's a bet that
          the summary captures what later turns will actually need, which is not guaranteed.
        </p>
        <p style={{ marginBottom: 0 }}>
          <b>Offloading to a file the agent can re-read on demand.</b> Write the full result to disk (or
          another addressable store) and put only a short reference — a file path, a row count, a one-
          line description — into context. The agent's context stays small, but nothing is lost: if a
          later step genuinely needs the full content, the agent can issue a targeted read against the
          file rather than carrying the whole thing forward on every turn in between. This is the
          closest thing to "no tradeoff" of the three, at the cost of an extra tool call on the turns
          that do need the detail back.
        </p>
      </div>
      <p>
        The offload-to-file pattern deserves particular attention because it maps directly onto how
        production coding agents already work: a build log or a test-run's full output gets written to
        a file, and the agent is told the file path and a short summary of the outcome rather than
        being handed every line inline. If the agent needs to inspect a specific failure later, it reads
        that file directly, at the point where it actually needs the detail — which is also the point
        where that detail is most relevant to the model's attention, rather than sitting stale in
        history from many turns earlier. The general principle behind all three techniques is the same:
        a tool's result and what the model needs to carry forward in context are two different things,
        and conflating them — treating "what the tool returned" as identical to "what belongs in
        context from now on" — is the default that produces bloat.
      </p>

      <h2 id="compaction">4. Compaction and summarization strategies</h2>
      <p>
        Tool-result bloat is one source of context growth; the other is simply conversational length —
        a session that runs long enough accumulates a large history of user turns, assistant turns, and
        intermediate reasoning even if every individual tool call was kept lean. At some point in a
        long-running agent session, that accumulated history has to be dealt with, and there are really
        only three strategies, each with a real and different cost.
      </p>
      <p>
        <b>Keep everything.</b> The simplest strategy: never remove anything from history, let the
        window grow until it hits the model's limit. This preserves all information with perfect
        fidelity — nothing is ever lost to a bad summary or a truncation cut in the wrong place — but it
        pays for that in both directions discipline 2 already described: rising per-turn cost, since
        every token in the growing history is resent on every subsequent call, and rising context rot,
        since the model's attention is spread across an ever-larger, increasingly stale history. It also
        eventually just fails outright once the hard ceiling is reached, which for a genuinely
        long-running agent (hours of tool calls, not minutes) is not a hypothetical edge case.
      </p>
      <p>
        <b>Hard-truncate.</b> Drop old turns once the history passes some length — typically a
        sliding window that keeps only the most recent N turns, or the most recent N tokens. This is
        cheap to implement and keeps cost and context rot bounded, but it is a blunt instrument: it
        discards information based on how old it is, not based on whether the agent still needs it. A
        decision made in turn three that constrains what's valid in turn fifty — a constraint the user
        stated once and never repeated, an error the agent already diagnosed and shouldn't reintroduce —
        gets silently dropped the moment it ages out of the window, and the agent has no way to know
        it's lost something, because from its perspective the truncated turns simply never happened.
      </p>
      <p>
        <b>Summarize (compact) periodically.</b> Rather than dropping old turns outright, periodically
        replace a block of older conversation with a condensed summary that preserves the decisions,
        constraints, and open threads that matter, while discarding the verbatim back-and-forth that
        produced them. This is the strategy most production agent harnesses converge on for long
        sessions, because it targets the actual goal — keep what's still needed, drop what isn't —
        rather than a proxy for it like recency. Its cost is real, though, and worth stating plainly:
        summarization is lossy and it is itself a judgment call, typically made by another model
        call, about what "matters." A summary that drops a constraint the agent still needed, because
        the summarization step didn't recognize it as load-bearing, produces exactly the same failure as
        hard truncation — the agent proceeds as if that constraint doesn't exist — except it's harder to
        debug, because the information looks like it should have been preserved by a strategy that's
        supposed to be smarter than a sliding window.
      </p>
      <div className="card">
        <p>
          <b>The tradeoff in one line:</b> keep-everything trades cost and degradation for fidelity;
          hard-truncation trades fidelity for a cheap, predictable bound; summarization tries to buy
          back fidelity at the price of a second point of possible failure — the summarizer's own
          judgment about what was safe to compress. None of the three is free, and picking one is a
          decision about which failure mode is more acceptable for the task at hand, not a decision
          about which one is "best" in general.
        </p>
      </div>
      <p>
        A practical middle path many agent harnesses use is to apply these strategies unevenly across
        content types rather than uniformly across the whole history: summarize or discard the verbose,
        low-density material first — the tool-result bloat from section 3, exploratory back-and-forth
        that ended in a dead end — while preserving verbatim the small number of turns that carry actual
        decisions: what the user explicitly asked for, constraints stated once, and conclusions the
        agent reached that later steps depend on. Compaction that treats a thousand-line log dump and a
        one-sentence user requirement as equally compressible is throwing away the wrong things just
        as often as it's saving the right ones.
      </p>

      <h2 id="fit-vs-use">5. What fits vs. what gets used well</h2>
      <p>
        It's worth separating two questions that get collapsed into one far too often: what can
        technically fit in a context window, and what a model will actually use well once it's there.
        A million-token context window can technically hold an entire codebase, a full support-ticket
        history, and every product document a company has ever written. Whether the model reasons well
        with all of that present at once, on the specific question a user just asked, is a completely
        separate matter — and the evidence from how attention mechanisms behave says no, not reliably,
        for the reasons context rot already covers. Fitting is a token-counting exercise. Using well is
        an attention-allocation problem, and the two get less correlated, not more, as the amount of
        content grows.
      </p>
      <p>
        Position matters here in a way that's easy to underestimate: content near the end of the
        context — closest to the point where the model has to produce its next output — tends to
        receive more effective attention than content buried in the middle of a long window, a pattern
        sometimes described informally as a "lost in the middle" effect. This isn't a quirk to route
        around with a trick; it's a structural consequence of how attention weighs recency and how
        instructions closest to the generation point have the most direct influence on it. The practical
        upshot is that <em>where</em> a piece of information sits in the window is not a neutral
        detail — a critical constraint stated once near the very start of a long session and never
        repeated is genuinely at higher risk of being under-weighted by the time the model acts on turn
        eighty than the same constraint would be if it were restated, or freshly summarized, closer to
        the current turn.
      </p>
      <p>
        This is the direct argument against the "just in case" instinct — the temptation to pull in
        every document that might conceivably be relevant, on the theory that more information can only
        help and the model will sort out what matters. It doesn't work that way in practice, for two
        compounding reasons. First, every irrelevant document dilutes attention away from the relevant
        ones — it's not a neutral addition, it's a competing signal. Second, an irrelevant document
        doesn't just sit there passively; a model asked to synthesize an answer from ten retrieved
        documents when only two are actually relevant has to do the work of implicitly filtering out
        the other eight, and that filtering is itself a task it can get wrong — attributing a claim to
        the wrong source, blending an irrelevant document's framing into an answer that should have come
        from the relevant one, or simply producing a vaguer answer because it's hedging across sources
        that don't actually agree because they weren't actually about the same thing. A smaller, more
        precisely retrieved context routinely outperforms a larger, loosely-relevant one on the same
        question — not despite containing less information, but because of it.
      </p>

      <h2 id="relevance-framing">6. A practical framing: relevance to the next action</h2>
      <p>
        Put the previous five sections together and a single operational rule falls out, and it's worth
        stating precisely because it's easy to state loosely and get wrong: the right test for whether
        something belongs in context is its relevance to the immediate next action the agent is going to
        take, not its relevance to the task in general. Those sound similar and are not. "Relevant to
        the task in general" is nearly everything — the original request, background on the domain,
        related documents, prior attempts, the full tool inventory, adjacent context that could plausibly
        matter at some point before the task is done. Almost any piece of information can be justified
        under that standard, which is exactly why it's a bad filter — it doesn't actually filter
        anything out.
      </p>
      <p>
        "Relevant to the immediate next action" is a much narrower and much more useful question,
        because it's answerable concretely at each step: if the agent's next action is to write a fix
        for a specific failing test, the full contents of an unrelated module in the same repository are
        not relevant to that action, even though they're clearly relevant to the task of "improve this
        codebase" in general — they can be retrieved on demand later, if a later action actually needs
        them. If the agent's next action is to summarize a customer's support history for a human agent,
        the raw API response for their billing account is not relevant to that action unless the
        summary specifically concerns billing — a structured extract of the two or three fields that are
        relevant serves the action better than the full object. Applying this test at every step is
        exactly what the earlier sections' techniques are mechanisms <em>for</em>: structured extraction
        narrows a tool result to what the next action needs; offloading to a file defers everything else
        until an action actually needs it; compaction keeps the decisions and constraints later actions
        will need while dropping the verbatim exchanges that produced them.
      </p>
      <p>
        The framing also explains why this can't be solved once, upfront, by writing a sufficiently
        thorough system prompt or retrieving a sufficiently comprehensive document set at the start of a
        session. Relevance to the next action changes turn by turn, because the next action itself
        changes turn by turn — an agent debugging a test failure needs different context than the same
        agent, three turns later, writing the fix, than the same agent five turns after that, verifying
        the fix didn't break something else. A context strategy that's fixed at the start of a session
        is optimizing for the task-in-general standard by construction, because the immediate next
        action hasn't happened yet. Effective context engineering in an agent loop is therefore
        continuous, not a setup step: at each turn, actively deciding what the model needs to see to take
        the next action well, rather than accumulating everything the session has touched and hoping the
        model finds the right part of it.
      </p>
      <Code wrap>{`A useful question to ask at each step of an agent loop, before appending anything new to context:

"Does the agent need this to take its next action well — or does it need this
 to have completed the task in general?"

If the answer is the second one, the information probably belongs somewhere
retrievable on demand (a file, a follow-up tool call, a compacted summary
restated when it becomes relevant again) rather than sitting inline in every
subsequent turn's context.`}</Code>
      <p>
        None of this is an argument against large context windows, retrieval, or long-running agent
        sessions — all three are genuinely useful and getting more capable. It's an argument against
        treating window size as a substitute for the discipline of deciding, deliberately and per turn,
        what belongs in the window. The two ideas covered in{" "}
        <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">
          The ten disciplines of governed agentic DevSecOps
        </a>{" "}
        that this pairs most directly with are tool design and observability: a narrow, well-designed
        tool is also, not coincidentally, one that returns a lean result instead of a raw dump, and an
        observable execution trace is what makes it possible to see exactly what a model actually had in
        context when it made a given decision — which is usually the fastest way to diagnose why a long
        session went wrong. For the retrieval side of this problem specifically — what happens when the
        documents being pulled into context are themselves the source of a failure — see{" "}
        <a href="/guides/rag-failure-modes">RAG failure modes</a>.
      </p>
    </ContentLayout>
  );
}
