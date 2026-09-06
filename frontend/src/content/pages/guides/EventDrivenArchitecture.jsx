import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "guides/event-driven-architecture.html",
  title: "Event-Driven Architecture on the Cloud — Merit AC Guides",
  description:
    "How publish-subscribe actually changes a system's coupling and failure modes, the three event patterns that build on it, and the problems — schema evolution, dual writes, debugging fan-out — specific to this style.",
};

export default function EventDrivenArchitecture() {
  return (
    <ContentLayout active="guides" wide>
      <span className="kicker">Guide · cloud architecture</span>
      <h1>Event-driven architecture on the cloud</h1>
      <p className="lead">
        Event-driven architecture is often introduced as a technology choice — pick a broker, wire
        up some topics — when the actual decision underneath it is a shift in how services relate to
        each other: from one service telling another what to do, to one service announcing what
        happened and letting anyone interested react. That shift buys real benefits, and it also
        introduces a specific, learnable set of new problems that don't exist in a request-response
        system. This guide covers both halves.
      </p>

      <Toc
        items={[
          { href: "#core-shift", label: "1. The core shift: request-response to pub-sub" },
          { href: "#real-benefits", label: "2. The real benefits" },
          { href: "#patterns", label: "3. Three patterns built on the same idea" },
          { href: "#broker-choice", label: "4. Choosing a broker: what actually differs" },
          { href: "#hard-problems", label: "5. Problems specific to event-driven systems" },
          { href: "#worked-example", label: "6. A good fit and a bad one" },
        ]}
      />

      <h2 id="core-shift">1. The core shift: request-response to pub-sub</h2>
      <p>
        In a request-response call, the caller knows exactly who it's talking to, waits for that
        specific service to respond, and the two are coupled at the moment of the call — if the
        callee is down, slow, or has changed its contract, the caller feels it immediately and
        directly. The caller has to know the callee's address, its API shape, and generally has to
        be actively waiting for an answer before it can move on.
      </p>
      <p>
        In an event-driven system, a service that just did something — an order was placed, a user
        updated their address, a payment cleared — emits a fact describing that it happened, without
        addressing the message to anyone in particular. It publishes to a topic or channel and moves
        on; it does not know, and does not need to know, who is listening, how many consumers there
        are, or what any of them intend to do with the information. A consumer that cares about
        address changes subscribes to that topic and reacts whenever a matching event arrives. The
        producer's code never mentions the consumer. This is the entire shift: from "call this
        specific thing and wait" to "announce this fact and let interested parties find it."
      </p>
      <p>
        It's worth being precise about what did and didn't change. The underlying business fact —
        an order was placed — is the same regardless of architecture. What changed is who is
        responsible for knowing about the relationship between producer and consumer. In
        request-response, the producer's code has to name every consumer it needs to notify by
        calling each one; in the OrderService, that might mean explicit calls to InventoryService,
        EmailService, and AnalyticsService, and adding a fourth consumer means editing OrderService's
        code. In the event-driven version, OrderService publishes one event and never changes again
        no matter how many consumers get added, removed, or rewritten later — that responsibility has
        moved to a broker and to whichever services choose to subscribe.
      </p>

      <h2 id="real-benefits">2. The real benefits</h2>
      <p>
        <b>Loose coupling</b> is the headline benefit, and it's worth stating precisely what kind of
        coupling gets loosened: it's coupling in the producer's knowledge of its consumers, not
        coupling to the shape of the data itself — an event's schema is still a contract, and
        changing it carelessly still breaks consumers, a point Section 5 comes back to. What
        genuinely goes away is the producer needing to know how many consumers exist or what they do.
        A new team building a fraud-detection service that wants to react to every payment can
        subscribe to the existing <code>PaymentCleared</code> topic and start consuming immediately —
        no change to the payment service, no deploy of the payment service, no meeting with the
        payment team to add a new outbound call. This is the difference between a system that grows
        by adding subscribers and a system that grows by editing an increasingly long list of
        outbound calls inside the producer.
      </p>
      <p>
        <b>Natural buffering against load spikes</b> comes from the queue or log sitting between
        producer and consumer. In a synchronous system, if the consumer is slow or briefly
        overwhelmed, that slowness propagates backward immediately — the caller is blocked waiting,
        and a spike in inbound requests becomes a spike in outbound wait time across the whole call
        chain. With a queue in between, the producer publishes at whatever rate work arrives and
        moves on instantly; the events sit in the queue until the consumer is ready for them, and the
        consumer processes at its own sustainable rate. A traffic spike turns into a temporarily
        longer queue rather than a cascading timeout across services that had nothing to do with the
        spike. This doesn't make capacity problems disappear — a queue that grows faster than it
        drains is still a problem, just a visible, monitorable one (queue depth, consumer lag) instead
        of an invisible one (timeouts appearing in unrelated services).
      </p>
      <p>
        <b>Auditability</b> is a benefit that's easy to undervalue until you need it. The event log
        is, by construction, a chronological record of everything of significance that happened in
        the system — not a log statement someone remembered to add, but the actual mechanism by which
        the system operates. Reconstructing "what happened to this order, in what order, and why does
        current state look the way it does" is often just a matter of reading the event stream for
        that order's ID, in systems where the events are retained. This is qualitatively different
        from a request-response system's server logs, which record that a call was made but not
        necessarily the business-meaningful fact that resulted from it, scattered across whichever
        services happened to log at the right verbosity.
      </p>

      <h2 id="patterns">3. Three patterns built on the same idea</h2>
      <p>
        "Event-driven" isn't one pattern — it's a spectrum of how much information rides along in the
        event itself, and the right point on that spectrum depends on how much consumers need and how
        tightly you're willing to couple them to the producer's data shape.
      </p>
      <p>
        <b>Event notification</b> is the thinnest version: the event says only that something
        happened and carries an identifier, not the details. <code>{`{"event": "OrderUpdated", "orderId": "o-123"}`}</code>{" "}
        tells a consumer to go fetch the current order state from the order service if it needs to
        know more. This keeps events small and keeps the producer from having to decide up front what
        every possible consumer might need, but it reintroduces a synchronous dependency on the
        producer's API at the moment the consumer actually wants the details — if the order service
        is down, a consumer that received the notification still can't act on it. It's a good fit
        when most consumers only need the fact of the change, and the minority that need details are
        few enough that a follow-up call back to the source is an acceptable cost.
      </p>
      <p>
        <b>Event-carried state transfer</b> puts the actual data consumers need directly in the
        event: <code>{`{"event": "OrderUpdated", "orderId": "o-123", "status": "shipped", "items": [...], "total": 4230}`}</code>.
        Consumers no longer need to call back to the producer at all — everything they need arrived
        with the event, which means they keep working even if the producer is temporarily down, and
        they don't add load back onto the producer every time an event fires. The tradeoff is payload
        size and a wider, more committed contract: every field in the event is now something
        consumers may depend on, so the producer has to think about backward compatibility for the
        event schema the same way it would for a public API, and different consumers wanting
        different subsets of data can push events to grow large trying to satisfy all of them.
      </p>
      <p>
        <b>Event sourcing</b> is a much bigger commitment than either of the above, and it's worth
        being clear about the distinction: the first two patterns are ways of communicating that a
        change happened, using a normal database as the source of truth underneath. Event sourcing
        makes the sequence of events itself the source of truth — there is no "current state" stored
        directly; instead, current state is derived by replaying every event that ever happened to a
        given entity, in order, from the beginning (or from the last snapshot, if snapshots are used
        to avoid replaying from the dawn of time on every read). This gives you a complete audit
        history for free, the ability to derive new read models later from events that were captured
        long before anyone thought to ask that question, and the ability to fix a bug in projection
        logic by replaying history through the corrected logic. It also means every part of the
        system that reads current state now depends on the replay-and-projection machinery being
        correct, migrating an event schema is a much higher-stakes operation because old events
        can't be rewritten (they're the permanent history, not a mutable row), and the mental model
        for "what is the current value of this field" is meaningfully harder for a new engineer to
        pick up than "read the row." Reach for it when the audit trail and point-in-time
        reconstruction are themselves product requirements — a ledger, a claims history — not as a
        default way to persist data.
      </p>

      <h2 id="broker-choice">4. Choosing a broker: what actually differs</h2>
      <p>
        Broker feature lists tend to bury the two or three properties that actually change how you
        design consumers, so it's worth naming them directly rather than comparing product logos.
      </p>
      <p>
        <b>Delivery guarantees</b> come in a few flavors, and "exactly-once" is the one most
        frequently misunderstood. True exactly-once delivery across a network — where a message is
        guaranteed to arrive and be processed exactly one time, no matter what fails and retries
        along the way — is extremely difficult to guarantee end-to-end, because the acknowledgment
        that "I processed this" can itself be lost, which is indistinguishable from the processing
        never having happened. What most systems that advertise exactly-once semantics actually
        provide, and what you should design for regardless of the marketing term, is at-least-once
        delivery combined with idempotent consumers: the broker may redeliver a message after a
        network blip or a consumer crash before it acknowledged, and the consumer is written so that
        processing the same message twice produces the same result as processing it once — by
        keying off the event's unique ID and checking whether it's already been applied before acting
        on it again. Design every consumer this way regardless of what the broker's marketing page
        claims, because the failure mode that produces a duplicate delivery is a property of networks
        and process crashes, not of any particular broker's cleverness.
      </p>
      <p>
        <b>Ordering guarantees</b> are usually scoped, not global, and the scope matters a great
        deal. A typical streaming platform guarantees order within a partition (all events for the
        same key — say, the same order ID — arrive in the order they were published) but makes no
        promise about order across partitions (an event for order A and an event for order B can
        arrive in either relative order, even if A was published first). This is usually the right
        tradeoff, because it lets the broker parallelize across partitions for throughput while still
        giving you the ordering guarantee that actually matters for correctness — the sequence of
        events about one entity — but it means the partition key has to be chosen deliberately. Key
        by order ID if per-order ordering matters, and don't assume a topic gives you global ordering
        just because a demo running one partition on a laptop happened to show messages arriving in
        the order they were sent.
      </p>
      <p>
        <b>Queue versus event-streaming log</b> is a structural choice, not just a vendor choice. A
        traditional message queue typically removes a message from the queue once it's been
        successfully consumed and acknowledged — simple, and a good fit when there's exactly one
        logical consumer group and no need to look at history after the fact. An event-streaming log
        retains events for a configured retention period (or indefinitely) and lets multiple
        independent consumers each read the stream at their own pace and position, replaying from an
        earlier point if needed — a good fit when multiple, possibly future, consumers need to see
        the same events, or when reprocessing history (backfilling a new service, rebuilding a
        projection after fixing a bug) is a capability you want to keep available. The log is more
        operationally complex to run at retention and gives you replay; the queue is simpler and
        gives you neither. Choose based on whether "replay history" and "many independent consumer
        groups" are things this system will actually need, not by default toward whichever is more
        fashionable.
      </p>

      <h2 id="hard-problems">5. Problems specific to event-driven systems</h2>
      <p>
        <b>Debugging fan-out</b> is the first problem every team meets in production, usually during
        an incident. A request-response system under trouble gives you a single stack trace, or at
        worst a short synchronous call chain you can follow top to bottom. An event-driven request
        that fans out to a dozen asynchronous consumers has no single trace to follow by default —
        the producer published one event and returned immediately, and each of the twelve consumers
        processed it on its own schedule, on its own service, possibly minutes later. Reconstructing
        "what happened to this one order" after the fact requires a correlation ID generated at the
        point the flow started and threaded through every event and every consumer's logs, plus
        distributed tracing infrastructure that understands asynchronous hops, not just synchronous
        ones. Skipping this instrumentation is invisible until the first production incident that
        needs it, at which point reconstructing the timeline by hand across a dozen services' logs,
        with no shared ID to filter on, is exactly the kind of work nobody wants to be doing during
        an outage.
      </p>
      <p>
        <b>Schema evolution</b> is the second, and it's harder here than in a synchronous API because
        of a structural difference: an HTTP API can often version explicitly and reject an
        incompatible old client outright, and a deploy of the client and server can be coordinated.
        An event, once published, may sit in a queue or log and be consumed by a consumer that hasn't
        been deployed with knowledge of a new field yet — or, worse, by a consumer that was already
        running when the schema changed and has no way to know the shape changed mid-stream. The
        practical discipline is to treat every event schema as a public contract from the first
        publish: add fields as optional with sensible defaults rather than requiring them, avoid
        renaming or repurposing an existing field's meaning (add a new field and deprecate the old one
        on a timeline instead), and version the event type explicitly (<code>OrderPlaced.v2</code>) when
        a change genuinely can't be made backward compatible, running both versions in parallel until
        every consumer has migrated off the old one.
      </p>
      <p>
        <b>The dual-write problem</b> is the subtlest of the three, and it causes bugs that are easy
        to miss in testing and painful to track down in production. A service that needs to both
        update its own database and publish an event describing that update — the completely typical
        case — is making two separate writes to two separate systems, and those two writes are not
        atomic with respect to each other. If the database commit succeeds and the process crashes
        before the event publish goes out, the database has moved on but no one downstream ever finds
        out. If the event publish happens first and the database commit then fails, consumers react to
        something that, from the source of truth's perspective, never actually happened. Neither
        ordering is safe on its own.
      </p>
      <div className="card">
        <p style={{ marginBottom: "8px" }}>
          <b>The transactional outbox pattern</b> is the standard fix.
        </p>
        <p style={{ marginBottom: 0 }}>
          Instead of writing to the database and publishing to the broker as two separate operations,
          the service writes the business change <em>and</em> a row describing the event to an
          "outbox" table, in the same local database transaction — so both either commit together or
          neither does, using the database's own transactional guarantee rather than trying to
          coordinate two different systems. A separate process (a polling job, or a change-data-
          capture stream reading the database's write-ahead log) then picks up outbox rows and
          publishes them to the broker, retrying until it succeeds, and marks them published once
          confirmed. The event is now guaranteed to eventually be published if and only if the
          business change actually committed — the atomicity moved from "database write + network
          publish," which can't be made atomic, to "two writes in one local database transaction,"
          which can.
        </p>
      </div>

      <h2 id="worked-example">6. A good fit and a bad one</h2>
      <p>
        An order-processing pipeline is close to the canonical good fit for this style, because its
        downstream consumers are genuinely independent of each other and of the producer. When an
        order is placed, inventory needs to be decremented, a confirmation email needs to be sent,
        the warehouse system needs to be notified to begin fulfillment, and an analytics pipeline
        needs to record the sale — and critically, none of these four things needs to happen
        synchronously before the customer's "order placed" response returns, none of them needs to
        know about the others, and a failure in one (the email provider is briefly down) has no
        business blocking or breaking any of the others (fulfillment should still proceed). Publishing
        one <code>OrderPlaced</code> event and letting four independent consumers subscribe to it
        matches the actual shape of the problem: independent reactions to one fact, each with its own
        failure tolerance and its own retry logic, none of which the order service needs to know
        exists.
      </p>
      <Code wrap>{`# Good fit — independent downstream consumers, no consumer blocks the others
OrderService.placeOrder()
  -> commits order row + outbox row in one transaction
  -> outbox relay publishes OrderPlaced

subscribers to OrderPlaced (independent, no ordering dependency between them):
  - InventoryService: decrement stock
  - EmailService: send confirmation
  - WarehouseService: begin fulfillment
  - AnalyticsService: record sale

# a failure or delay in EmailService does not block WarehouseService,
# and OrderService never changes when a subscriber is added or removed`}</Code>
      <p>
        Now contrast that with a simple CRUD application with two tightly coupled services — say, a
        user-profile service and a settings service in a small internal tool, where settings can only
        ever be viewed and edited in the context of a specific user and the settings service has to
        read the current user record on essentially every request to validate the edit. There's no
        independent reaction happening here: there's one synchronous question ("is this a valid user,
        and what are they allowed to change") that needs an answer before the settings write can
        proceed at all. Introducing a broker, an event schema, and eventual consistency between these
        two services buys none of the benefits from Section 2 — there's no independent consumer to
        decouple from, no load spike to buffer against because the traffic pattern is uniform, and no
        audit trail need beyond a normal request log — while introducing every cost from Section 5:
        now a settings edit has to tolerate the possibility that the user event it depended on hasn't
        arrived yet, debugging a failed edit means checking whether an asynchronous hop landed instead
        of reading one straightforward call stack, and the team has taken on broker operations for a
        problem a direct synchronous call already solved completely.
      </p>
      <Code wrap>{`# Bad fit — tightly coupled, single synchronous question, no independent reactions
SettingsService.updateSetting(userId, key, value)
  needs: current user record, synchronously, to validate the edit
  no other service needs to react to this write
  no load-spike or audit-trail requirement beyond a normal request log

# a direct call:
#   settings.update(key, value) -> profile.validate(userId) -> commit
# does everything the event-driven version would, with none of its cost`}</Code>
      <p>
        The distinguishing question is the same one from Sections 2 and 3: are there genuinely
        independent parties who need to react to a fact without knowing about each other or the
        producer, and does the producer benefit from not knowing who or how many they are? When yes,
        publish-subscribe is doing real work. When the real shape of the problem is one caller asking
        one question and needing an answer before it can proceed, a direct call is not a primitive
        architecture waiting to be modernized — it's the correct tool, and wrapping it in a broker
        adds cost without adding a single benefit that broker was built to provide.
      </p>
    </ContentLayout>
  );
}
