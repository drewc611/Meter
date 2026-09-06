import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "cloud-architecture/serverless-architecture-patterns.html",
  title: "Serverless Architecture Patterns — Merit AC Guides",
  description:
    "What serverless actually buys you, the cold-start and state tradeoffs that come with it, and how to tell whether a workload belongs on it or on something steadier.",
};

export default function ServerlessArchitecturePatterns() {
  return (
    <ContentLayout active="cloud-architecture" wide>
      <span className="kicker">Guide · infrastructure architecture</span>
      <h1>Serverless architecture patterns</h1>
      <p className="lead">
        "Serverless" is a name for what you stop managing, not a claim that servers don't exist. Someone
        still runs a machine, patches its kernel, and schedules your code onto it — the point of the
        model is that it isn't you. That reframing matters because it explains both why serverless is
        genuinely good at some things and why it's a poor fit for others: every property of a serverless
        system follows from the fact that the provider owns the runtime and you own the code and the
        events that trigger it.
      </p>

      <Toc
        items={[
          { href: "#what-it-means", label: "1. What serverless actually means" },
          { href: "#core-patterns", label: "2. The core patterns" },
          { href: "#cold-starts", label: "3. Cold-start latency" },
          { href: "#state-problem", label: "4. The state problem" },
          { href: "#cost-model", label: "5. Cost model tradeoffs" },
          { href: "#orchestration", label: "6. Orchestrating multi-step workflows" },
          { href: "#lock-in", label: "7. Vendor lock-in, specifically" },
          { href: "#worked-example", label: "8. Good fit versus bad fit" },
        ]}
      />

      <h2 id="what-it-means">1. What serverless actually means</h2>
      <p>
        Strip away the marketing and serverless computing is a specific division of responsibility:
        the provider owns provisioning, patching, scaling, and the underlying operating system; you own
        a function's code and the configuration that says what event triggers it. You don't choose an
        instance size, you don't SSH into anything, and you generally don't keep a process running
        between invocations. What you get in exchange is that scaling from zero requests to a large
        burst and back to zero happens without you writing a line of autoscaling logic, and that you
        pay for none of it while nothing is running.
      </p>
      <p>
        This is a genuine shift in where operational effort goes, not an elimination of it. A team that
        moves from a fleet of servers to a set of functions stops worrying about OS patching, capacity
        planning, and load-balancer configuration, and starts worrying about a different set of
        problems that are specific to this model: cold-start latency, the fact that functions can't hold
        state between calls, how to wire together a multi-step process out of independently-scaling
        pieces, and a cost curve that behaves differently than a fixed fleet's. None of what follows in
        this guide is a criticism of serverless — it's a description of the problems that replace the
        ones it removes, so they can be planned for instead of discovered mid-incident.
      </p>

      <h2 id="core-patterns">2. The core patterns</h2>
      <p>
        <b>Function-as-a-service (FaaS)</b> is the core primitive: a unit of code that runs in response
        to an event and stops running when it's done. The event can be an HTTP request, a message
        arriving on a queue, a file landing in object storage, a scheduled timer, or a change in a
        database's write-ahead log. The function has no identity beyond that one invocation — it starts,
        reads its event, does its work, returns a result or writes a side effect, and its execution
        environment may or may not still exist by the time the next request for the same function
        arrives. Treating that uncertainty as a first-class fact, not an edge case, is the single most
        important habit in designing anything serverless.
      </p>
      <p>
        <b>Managed API gateways</b> sit in front of functions to give them the parts of a traditional
        web server that FaaS deliberately doesn't provide on its own: routing by path and method,
        request validation, authentication and authorization, rate limiting, and response caching. The
        gateway is what turns a collection of independently-triggered functions into something that
        looks, from the outside, like a coherent HTTP API — each route typically maps to one function,
        and the gateway handles the concerns that would otherwise require a shared, always-running
        process to enforce consistently.
      </p>
      <p>
        <b>Serverless databases and queues</b> complete the picture, and they matter for a reason that's
        easy to miss: a stateless function calling a database that requires a fixed pool of persistent
        connections defeats much of the point of going serverless, because now you're capacity-planning
        the database's connection limit against a compute layer that can scale to hundreds of concurrent
        invocations in seconds. A database or queue designed for this model — one that scales its own
        capacity to zero when idle, bills per request or per unit of data processed rather than per
        provisioned hour, and handles connection multiplexing so thousands of short-lived function
        invocations don't each need their own persistent connection — is what makes the rest of the
        stack scale the way FaaS promises to. Pairing serverless compute with a traditional
        fixed-capacity database is a common way teams end up with a system that scales on one side and
        falls over on the other.
      </p>

      <h2 id="cold-starts">3. Cold-start latency</h2>
      <p>
        A cold start happens when a request arrives for a function that has no warm execution
        environment already running, so the provider has to provision one — start a container or
        micro-VM, load the runtime, initialize the language environment, and run the function's
        top-level initialization code — before the function can process the actual event. This adds
        latency on top of the function's own execution time, and unlike almost everything else about
        serverless, it's not something you can architect away entirely. It's an unavoidable property of
        a model that doesn't keep infrastructure running when nothing is happening; the price of paying
        nothing at zero traffic is paying a latency penalty on the transition from zero to one.
      </p>
      <p>
        The magnitude of the penalty depends heavily on runtime choice, and this is one of the few
        serverless decisions where the tradeoff is concrete enough to reason about directly. Runtimes
        with lightweight, fast-initializing runtimes — compiled languages with small binaries, or
        interpreted languages with minimal startup work — tend to cold-start faster than runtimes that
        have to load a large managed runtime and JIT-compile before running a line of user code.
        Initialization code matters just as much as the runtime: a function that establishes a database
        connection, loads a large configuration file, or initializes a heavyweight SDK client in its
        top-level code pays that cost on every cold start, while a function that defers that work until
        it's actually needed, or does as little top-level work as possible, cold-starts faster
        regardless of language.
      </p>
      <p>
        Three mitigations show up repeatedly, and they trade cost or complexity for reduced latency
        rather than eliminating the phenomenon:
      </p>
      <p>
        <b>Provisioned concurrency</b> asks the provider to keep a specified number of execution
        environments warm and ready, sidestepping the cold start for traffic within that provisioned
        capacity at the cost of paying for that capacity continuously, whether or not it's used —
        which reintroduces a shape of the always-on cost that serverless is usually chosen to avoid, just
        scoped to exactly the concurrency level you've measured you need.
      </p>
      <p>
        <b>Keeping functions warm</b> with a scheduled trigger that periodically invokes a function to
        keep at least one instance alive is a cheaper, blunter version of the same idea — it doesn't
        guarantee a warm instance handles any specific real request, especially under concurrent load
        where the provider spins up additional cold instances anyway, but it reduces the frequency of
        cold starts for low-traffic functions at negligible cost.
      </p>
      <p>
        <b>Choosing a faster-starting runtime</b>, or restructuring initialization to do less work
        before the function is ready to handle its first event, is the option with no ongoing cost,
        which is also why it's the first one worth exhausting before reaching for provisioned
        concurrency. It has a ceiling, though — no amount of runtime choice removes the fact that a
        cold environment has to be created before anything runs.
      </p>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>The tradeoff, stated plainly:</b> cold starts are the cost of paying nothing at zero
          traffic. Every mitigation either pays some of that cost back (provisioned concurrency, warm
          pings) or reduces how large the cost is per occurrence (runtime and initialization choices).
          None of them make the phenomenon disappear, and a latency-critical path that can't tolerate
          an occasional multi-hundred-millisecond spike needs to plan for that up front, not discover it
          under production traffic.
        </p>
      </div>

      <h2 id="state-problem">4. The state problem</h2>
      <p>
        Functions are stateless by design — the execution environment that handles one invocation may
        be reused for the next one, reused after being idle for an arbitrary period, or never reused at
        all, and none of that is something the function's code controls or can safely assume either way.
        Anything that needs to persist across invocations — a user's session, a partially completed
        multi-step process, an in-progress computation, a counter, a lock — has to live somewhere the
        function can reach on every invocation: a database, a cache, a queue, or a workflow
        orchestrator's own state store. This single constraint does more to shape a serverless
        architecture's overall design than any other property of the model.
      </p>
      <p>
        The consequence that surprises teams coming from a traditional server model is how much of the
        architecture ends up being about that external state, rather than about the function code
        itself. A traditional server can hold a user's session in memory and rely on sticky routing to
        send that user's next request back to the same process; a serverless function can't make that
        assumption, so the session has to move to a shared cache from day one. A traditional
        long-running worker can keep a job's progress in a local variable while it works through a
        multi-hour task; a serverless function, which typically has an execution time limit measured in
        minutes, has to checkpoint progress externally and be able to resume from that checkpoint,
        because it may be a completely different execution environment that picks up where the last
        invocation left off.
      </p>
      <p>
        This is why serverless architectures cluster so heavily around managed, external stateful
        services — not because those services are independently fashionable, but because the compute
        layer's statelessness makes them structurally necessary. A serverless system without a
        well-designed state layer isn't a leaner version of a stateful system; it's a stateful system
        that lost track of its state, which shows up as bugs that are hard to reproduce because they
        depend on whether a given request happened to land on a warm or cold instance, or on which of
        several concurrently running instances a piece of in-memory state ended up on.
      </p>

      <h2 id="cost-model">5. Cost model tradeoffs</h2>
      <p>
        Pay-per-invocation pricing is genuinely cheap at low or spiky volume, and this is the case where
        the "serverless is cheaper" claim is straightforwardly true: a function that handles a few
        thousand requests a day, or a workload with sharp, unpredictable bursts separated by long idle
        periods, costs close to nothing to run on serverless and would cost real, continuous money to
        run on a fleet of servers sized to handle the burst but idle most of the time. This is the
        strongest, least controversial argument for serverless, and it's the scenario the model was
        built around.
      </p>
      <p>
        The claim stops being universally true at sustained high volume, and the crossover point is
        real and calculable rather than a matter of opinion. Pay-per-invocation pricing charges for
        every single execution; reserved or provisioned compute charges a comparatively flat rate for
        continuous capacity regardless of how fully that capacity is used. At low utilization, the flat
        rate is wasted money sitting idle. At high, steady utilization, the flat rate is being used
        efficiently while the per-invocation model keeps charging linearly for every request — and past
        some volume, a set of reserved instances running the same workload continuously costs less than
        the same request volume billed per invocation. Where that crossover sits depends on the specific
        provider's pricing, the function's memory and duration profile, and how continuously the traffic
        actually runs — but the shape of the curve, invocation cost rising linearly against a flat
        reserved-capacity cost, is consistent enough that it's worth modeling explicitly for any workload
        with steady, predictable, high-volume traffic rather than assuming serverless is the cheaper
        option by default.
      </p>
      <Code wrap>{`Rough shape of the tradeoff (illustrative, not a pricing quote):

  cost
   |                                    ,·'  pay-per-invocation
   |                               ,·'´
   |                          ,·'´
   |                     ,·'´
   |  ─────────────────────────────────  reserved/provisioned capacity
   |
   +----------------------------------------- request volume
                        ^
                 the crossover point —
              where reserved capacity starts
              costing less than per-invocation`}</Code>
      <p>
        The honest way to use this isn't to memorize a rule of thumb, since the exact crossover shifts
        with pricing changes and workload shape — it's to actually run the numbers for a specific
        function once its traffic pattern is known: take its real or projected invocation count,
        duration, and memory allocation, compute the per-invocation cost at that volume, and compare it
        against what the equivalent steady-state compute would cost reserved. Do that periodically as
        traffic grows, because a function that started as a low-volume, bursty workload — the case
        serverless is built for — can grow into a steady, high-volume one without anyone revisiting
        whether it's still on the right side of the crossover.
      </p>

      <h2 id="orchestration">6. Orchestrating multi-step workflows</h2>
      <p>
        A single function handling a single event is the easy case. Most real workloads aren't that —
        they're a sequence: validate an input, call one function to process it, call another to enrich
        it, write a result, notify a downstream system, and handle the case where any one of those steps
        fails partway through. The question of how to wire that sequence together is where serverless
        architectures most often go wrong, because the naive answer works fine for two or three steps
        and becomes unmaintainable well before ten.
      </p>
      <p>
        <b>Direct chaining</b> — having function A invoke function B directly, or drop a message on a
        queue that function B picks up, which in turn invokes function C — is the naive answer, and it's
        the right answer for genuinely simple, linear, two-or-three-step sequences. Past that, it
        accumulates problems that compound with each additional step: the overall workflow's state
        exists nowhere as a single artifact — to know how far a given execution got, you have to
        reconstruct it from logs scattered across every function it touched. Error handling has to be
        duplicated in every function, because there's no central place to say "if step three fails,
        retry it twice and then roll back steps one and two." And the failure behavior of the whole
        workflow is only as good as the least carefully written function in the chain, because there's
        no orchestrator holding the overall process to a single, consistent standard.
      </p>
      <p>
        <b>A managed workflow or state-machine service</b> — a step-function or workflow-orchestration
        product that lets you declare the sequence, its branches, its retry policy, and its error
        handling as an explicit definition rather than as code scattered across the functions
        themselves — is the answer that scales past a handful of steps. The workflow's current state
        becomes a queryable artifact in its own right: at any point you can ask "which step is
        execution X on, and what did each prior step return," which direct chaining simply cannot answer
        without reconstructing it from logs after the fact. Retry and error-handling policy is defined
        once, centrally, rather than reimplemented — sometimes inconsistently — in every function that
        happens to call another one.
      </p>
      <p>
        The tradeoff for adopting an orchestrator is added indirection and a dependency on the
        orchestration product's own execution model and pricing, which is a real cost, not a free
        upgrade — but it's a cost that buys back exactly the visibility and centralized error handling
        that direct chaining loses as soon as a workflow grows past the size where a person can hold its
        entire failure surface in their head. The practical rule most teams converge on: direct chaining
        for two or three steps where the failure modes are simple and well understood, an orchestrator
        the moment a workflow needs branching logic, meaningful retry semantics, or the ability to
        answer "what state is this specific execution in" without grepping logs.
      </p>

      <h2 id="lock-in">7. Vendor lock-in, specifically</h2>
      <p>
        Serverless code is, in practice, often less portable between providers than a containerized
        application is, and this surprises people who expect "just code" to be inherently more portable
        than "code plus infrastructure." The reason is that a serverless function isn't just code — it's
        code written against a specific function signature, triggered by events in a specific,
        provider-defined format, running under a specific identity and permissions model, none of which
        is standardized across providers the way a container's interface (accept a request on a port,
        respond) is standardized by the container itself.
      </p>
      <p>
        The function signature is the most visible difference — the shape of the object a function
        receives on invocation and the shape of what it's expected to return differs across providers,
        which means a function's entry point, even for equivalent logic, needs at least a translation
        layer to run on a different provider's FaaS product. The event format is the less visible but
        often larger difference: the JSON structure describing an HTTP request, a queue message, or a
        storage-change event is provider-specific, so any code that reads fields directly off the
        incoming event — which is the natural, low-friction way to write a handler — is reading a
        shape that doesn't exist on another provider's equivalent trigger. And the IAM model each
        provider uses to grant a function permission to call other services is its own system entirely,
        with no cross-provider equivalent to translate against; moving a function to another provider
        means re-deriving its entire permission set from scratch in a different model, not porting a
        policy file.
      </p>
      <p>
        A containerized application sidesteps most of this because the interface a container exposes —
        listen on a port, handle a request, produce a response — is defined by the container and the
        application inside it, not by the infrastructure running it; the same image runs the same way on
        any container orchestrator, because the orchestrator's job is just to run the image, not to
        shape the code inside it. This is a genuine, structural reason serverless code tends to be
        stickier to its provider than an equivalent containerized service, and it's worth weighing
        explicitly against serverless's operational benefits rather than assuming code is inherently
        as portable as the language it's written in suggests it should be.
      </p>
      <p>
        The practical response isn't to avoid serverless for lock-in reasons — for the workloads it
        fits, the operational savings are usually worth more than the portability given up — but to keep
        the function's own logic thin and separable from the provider's event and invocation format:
        parse the provider-specific event into a plain internal representation at the top of the
        function, do the actual business logic against that internal representation, and keep the
        provider-specific glue small enough that porting to another provider means rewriting a thin
        adapter, not the function's actual logic.
      </p>

      <h2 id="worked-example">8. Good fit versus bad fit</h2>
      <p>
        A good serverless candidate: an image-processing pipeline that resizes and transcodes files as
        they're uploaded to object storage. Traffic is inherently spiky and driven entirely by user
        behavior — some hours see no uploads at all, others see a burst — which plays directly to
        pay-per-invocation economics against section 5's crossover point sitting far away for this
        workload. Each unit of work is naturally stateless: read one file, transform it, write the
        result, done, with no need to remember anything about the previous file when processing the
        next one. The work is event-driven in the most literal sense, triggered directly by the storage
        event that FaaS is built to consume without any polling or scheduling logic of its own. And any
        individual invocation's cold start, on the order of the delay before a resized thumbnail becomes
        available, is a delay users tolerate far better than a delay in an interactive request path,
        because nobody is watching a spinner waiting for it synchronously.
      </p>
      <p>
        A bad serverless candidate: a real-time bidding system that has to evaluate a bid and respond
        within a tight latency budget, continuously, at high and fairly steady volume throughout the
        trading day. This inverts every property that made the image pipeline a good fit. Volume is
        steady and high rather than spiky, which is exactly the regime where section 5's crossover
        point favors reserved capacity over per-invocation billing. Latency has a hard budget that a
        cold start can blow through entirely, and no mitigation in section 3 eliminates the cold-start
        risk, only reduces its frequency or cost — a risk that's tolerable for a background thumbnail
        job is not tolerable for a bid that has to respond within a fixed window or lose the auction.
        And the workload likely wants to hold state — recent bidding history, a model's warm in-memory
        state, a connection to a specialized data feed — in memory across requests for performance
        reasons that section 4's externalize-everything constraint works directly against.
      </p>
      <p>
        The pattern the two examples share is the actual lesson: serverless fits work that's naturally
        spiky, naturally stateless, and naturally tolerant of a latency floor above zero. It fits poorly
        against work that's steady, stateful by nature, or latency-critical enough that a cold start is
        a correctness problem rather than a minor delay. Most real systems are a mix of both kinds of
        workload, which is exactly why the right architecture is usually not "serverless" or "not
        serverless" as a single choice for the whole system, but a per-component decision made against
        each component's actual traffic shape, state needs, and latency budget.
      </p>

      <p>
        Serverless removes a real category of operational work — patching, capacity planning, idle-
        fleet cost — and replaces it with a different set of design constraints that have to be
        engineered around deliberately: cold starts, externalized state, an orchestration layer once
        workflows grow past a few steps, and a cost curve that isn't uniformly cheaper at every volume.
        None of that makes it the wrong choice; it makes it a choice with a specific shape, worth fitting
        to workloads whose own shape matches it, rather than a default to reach for everywhere.
      </p>
    </ContentLayout>
  );
}
