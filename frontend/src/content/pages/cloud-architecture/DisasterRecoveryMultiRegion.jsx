import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";

export const meta = {
  outFile: "cloud-architecture/disaster-recovery-and-multi-region-architecture.html",
  title: "Disaster Recovery and Multi-Region Architecture — Merit AC Guides",
  description:
    "Why 'we need multi-region' isn't a requirement until you've set an RTO and RPO — and how those two numbers determine which DR tier, replication strategy, and failover design actually fit.",
};

export default function DisasterRecoveryMultiRegion() {
  return (
    <ContentLayout active="cloud-architecture" wide>
      <span className="kicker">Guide · infrastructure fundamentals</span>
      <h1>Disaster recovery and multi-region architecture</h1>
      <p className="lead">
        "We need multi-region for disaster recovery" is usually said before anyone has answered
        the two questions that actually determine what's needed: how long can this system be
        down, and how much data can it afford to lose. Skip those questions and you end up either
        over-building — paying continuously for a second full production environment a system
        never needed — or under-building — discovering during an actual outage that the DR plan
        everyone assumed was in place doesn't meet the recovery time the business actually
        required. Everything in this guide follows from getting those two numbers right first.
      </p>

      <Toc
        items={[
          { href: "#rto-rpo", label: "1. RTO and RPO: the two numbers" },
          { href: "#dr-spectrum", label: "2. The DR strategy spectrum" },
          { href: "#replication", label: "3. The data replication problem" },
          { href: "#failover", label: "4. Failover mechanics and failure modes" },
          { href: "#cost", label: "5. The cost reality" },
          { href: "#testing", label: "6. Testing disaster recovery" },
          { href: "#worked-example", label: "7. Worked example: matching workload to tier" },
        ]}
      />

      <h2 id="rto-rpo">1. RTO and RPO: the two numbers</h2>
      <p>
        Recovery Time Objective is how long the system can be unavailable before the outage
        itself becomes the primary problem, worse than whatever caused it. Recovery Point
        Objective is how much data, measured in time, the system can afford to lose — if the
        database is restored from a copy that's fifteen minutes stale, RPO is fifteen minutes;
        if it's restored from last night's backup, RPO is however many hours passed since that
        backup ran. These are business questions before they're engineering questions, and they
        have to be answered by someone who understands the actual cost of downtime and data
        loss for that specific system — not defaulted to "as close to zero as possible" because
        that sounds like the safe answer.
      </p>
      <p>
        Treating "zero" as the default answer for both numbers is exactly how a DR conversation
        skips straight to "we need multi-region" without earning it. An RTO of zero and an RPO of
        zero describe a system that never goes down and never loses a single write, which is an
        extraordinarily expensive property to build and rarely one every system in an
        organization's portfolio actually needs. The real work of this first step is forcing a
        specific number out of a specific owner for a specific system: not "fast" but "four
        hours"; not "minimal loss" but "five minutes of writes." Vague answers produce
        architectures that don't match what anyone actually needed, discovered only once a real
        outage tests them.
      </p>
      <p>
        It's worth being explicit that RTO and RPO are independent axes, not two names for the
        same idea. A system can have a generous RTO and a strict RPO — a batch reporting pipeline
        that can be down for hours but can't silently drop any of the transactions it was
        supposed to process — or the reverse — a live chat feature where losing the last few
        seconds of messages during a failover is tolerable, but being down for more than a minute
        visibly breaks the product. Naming both numbers separately, for each system, is what lets
        the rest of this guide's decisions — which DR tier, which replication mode, which failover
        design — follow as a fairly mechanical consequence rather than a judgment call made fresh
        each time.
      </p>

      <h2 id="dr-spectrum">2. The DR strategy spectrum</h2>
      <p>
        Once RTO and RPO are set, the DR strategy is mostly a lookup, not a design exercise. The
        four common tiers sit on a single spectrum from cheapest-and-slowest to
        most-expensive-and-fastest, and each one buys a specific, boundable improvement in
        recovery time and recovery point over the one before it.
      </p>
      <p>
        <b>Backup-and-restore</b> is the floor: data is backed up, typically to object storage,
        on some schedule, and recovering from a disaster means provisioning infrastructure from
        scratch and restoring the most recent backup into it. It's the cheapest tier by a wide
        margin — steady-state cost is close to just the price of storing the backups — and it's
        also the slowest, with an RTO measured in hours and an RPO bounded by the backup interval.
        A system backed up every six hours has an RPO of up to six hours, no better, by
        construction.
      </p>
      <p>
        <b>Pilot light</b> keeps a minimal version of the environment always running in the
        recovery region — typically just the data tier, replicating continuously, with the
        compute layer either not provisioned at all or scaled to near-zero. During a failover,
        the compute layer is scaled up around the already-current data. The name is apt: the pilot
        light is a small flame that's always lit, ready to ignite the full system quickly rather
        than starting a fire from nothing. RTO drops to the time it takes to scale up
        infrastructure — typically minutes rather than hours — because the slowest part of
        backup-and-restore, waiting for a large data restore to complete, is eliminated; the data
        was already there.
      </p>
      <p>
        <b>Warm standby</b> goes further: a scaled-down but fully functional copy of the
        production environment runs continuously in the recovery region, capable of serving real
        traffic at reduced capacity. Failover means redirecting traffic and scaling the standby
        up to full capacity, not building the application layer from nothing. RTO drops further
        still — often to the time it takes DNS or a load balancer to redirect traffic plus
        however long autoscaling takes to catch up with real load — at the cost of running and
        paying for a second environment continuously, even though most of the time it's serving
        little or no traffic.
      </p>
      <p>
        <b>Active-active</b> is the top of the spectrum: full production capacity running in two
        or more regions simultaneously, all of it serving live traffic all the time, with no
        distinction between a "primary" and a "standby" region at all. A regional failure means
        traffic simply stops routing to the failed region while the others continue serving,
        which can push RTO down to seconds — essentially just the time for traffic routing to
        notice and react. It is also the most expensive tier by a wide margin, the most complex
        to operate correctly, and the hardest to get right, because every layer of the system —
        not just infrastructure but the data layer's replication and conflict resolution — has to
        be designed for multiple regions writing concurrently from day one, not bolted on later.
      </p>
      <div className="card">
        <p style={{ marginBottom: "8px" }}>
          <b>The pattern across all four tiers:</b> each step up the spectrum trades a fixed,
          predictable increase in ongoing cost for a bounded improvement in RTO and RPO. None of
          them is intrinsically the "right" tier — the right tier is whichever one is the cheapest
          option that still meets the RTO and RPO a system's owner actually committed to in step
          one.
        </p>
      </div>

      <h2 id="replication">3. The data replication problem</h2>
      <p>
        Every tier above backup-and-restore depends on getting data into the recovery region
        continuously rather than periodically, and how that replication happens is really the
        RPO conversation in disguise. There are two fundamental modes, and the choice between them
        is a real tradeoff, not a solved problem with one correct answer.
      </p>
      <p>
        <b>Synchronous replication</b> doesn't acknowledge a write as committed until it has been
        confirmed in both locations. This guarantees the two copies are always identical — an RPO
        of zero, by construction, because there is never a window where one copy has data the
        other lacks. The cost is that every single write now waits on a round trip to the second
        location, and that round trip has a floor set by the speed of light: two regions a
        continent apart impose a physical latency on every write that no amount of engineering or
        budget removes, because it isn't a bandwidth or processing constraint — it's the time
        light takes to cross the distance, twice, for the round trip. Past a certain distance,
        synchronous replication isn't slow, it's genuinely infeasible for a system that needs
        low-latency writes.
      </p>
      <p>
        <b>Asynchronous replication</b> acknowledges a write as soon as it's committed locally and
        propagates it to the second location afterward, on its own schedule. Writes stay fast
        regardless of distance between regions, but there's now a real window — the replication
        lag — during which the primary has data the secondary doesn't. If the primary fails during
        that window, whatever hadn't replicated yet is gone. This is, concretely, what an RPO
        greater than zero actually means in practice: it's not an abstract tolerance for loss, it's
        an explicit acceptance of however much asynchronous lag is normal for that system, under
        both ordinary and degraded conditions.
      </p>
      <p>
        This is why "what's our RPO" and "how much async replication lag can we tolerate" are the
        same question asked two different ways, and why an RPO conversation that skips straight
        to a number without discussing replication mode is skipping the part that determines
        whether that number is achievable at all. A five-minute RPO across two regions on the same
        continent, replicating asynchronously, is a straightforward engineering target. A
        five-second RPO across two continents effectively forces synchronous replication, which
        then forces every write in the system to eat the cross-region latency penalty — a
        tradeoff that has to be made explicitly, with the business, not discovered by an
        application team after the fact when write latency triples.
      </p>

      <h2 id="failover">4. Failover mechanics and failure modes</h2>
      <p>
        Deciding to fail over is only half the problem; actually redirecting traffic and data
        writes to the surviving region is a mechanism with its own failure modes, and those
        failure modes eat directly into the RTO the rest of the architecture was built to hit.
      </p>
      <p>
        The most common failover mechanism is DNS-based: change a DNS record to point at the
        recovery region's endpoint instead of the failed primary's. It's simple and it works with
        virtually any client, but it has a structural weakness — DNS records carry a time-to-live,
        and clients, resolvers, and caches across the internet respect that TTL on their own
        schedule, not instantly. A DNS record with a one-hour TTL means some fraction of clients
        are still resolving to the dead primary up to an hour after the record changes, no matter
        how fast the operational decision to fail over was made. If a system's RTO is five
        minutes, a DNS TTL that wasn't deliberately set low well before the incident silently
        makes that RTO unachievable — the TTL has to be set with the RTO in mind long before
        there's ever a disaster to fail over from, not adjusted during one.
      </p>
      <p>
        The failure mode that does the most damage when it happens is split-brain: a network
        partition separates the two regions from each other without actually taking either one
        down, and each region — unable to see the other and each believing it's now alone —
        decides it should become primary and starts accepting writes independently. Once that
        happens, the two copies of the data diverge in ways that can be genuinely difficult or
        impossible to reconcile automatically, because both sets of writes are individually valid
        and there's no way to know afterward which one should have won. This is a partition
        problem specifically, not a "one region went fully down" problem — a clean failure where
        the primary region disappears entirely is comparatively easy to handle, because there's
        no ambiguity about which region is still alive.
      </p>
      <div className="card">
        <p style={{ marginBottom: "8px" }}>
          <b>Why split-brain needs a neutral tiebreaker.</b> If each region decides "am I primary?"
          using only its own view of the network, a partition guarantees both will answer yes.
          The fix is a single source of truth for that question that both regions defer to rather
          than deciding independently — a consensus mechanism that requires a majority of
          participants to agree before anyone becomes primary, or a third region, uninvolved in
          serving traffic, that acts purely as a neutral arbiter. Either way, the property being
          bought is the same: "who is primary" has exactly one authoritative answer at any given
          moment, reachable by both sides, rather than two regions each answering the question
          for themselves.
        </p>
      </div>
      <p>
        Both of these mechanisms — DNS propagation delay and split-brain risk — are reasons that
        the failover mechanism itself deserves as much design attention as the replication
        strategy behind it. A perfectly replicated warm standby with a failover process nobody
        has thought through carefully can still miss its RTO on propagation delay, or actively
        corrupt data during a partition it wasn't designed to detect.
      </p>

      <h2 id="cost">5. The cost reality</h2>
      <p>
        Every DR tier past backup-and-restore means paying, continuously, for capacity that is
        mostly idle — a pilot light's standing data replication, a warm standby's running-but-
        underused compute fleet, an active-active deployment's full duplicate capacity in a
        second region serving only half the traffic it could handle alone. That's not a
        side effect to minimize away; it's the literal thing being purchased. A faster RTO and a
        tighter RPO cost more precisely because they require infrastructure sitting ready that,
        on any given ordinary day when nothing is failing over, does nothing but wait.
      </p>
      <p>
        This is why the RTO/RPO conversation in step one has to happen with someone who controls
        budget, not only with engineering. It's easy for a stakeholder to say "we need this system
        to survive a regional outage" in the abstract; it's a different conversation once that
        requirement is translated into "this means running a second full production environment
        around the clock." An RTO/RPO target that isn't paired with a matching budget commitment
        isn't a real requirement — it's a wish that will either get quietly downgraded during
        implementation or get built anyway and become the line item someone questions during the
        next budget review, at which point the temptation is to cut the DR capacity rather than
        the requirement, leaving the business exposed without anyone having decided that on
        purpose.
      </p>
      <p>
        The honest framing to bring to that conversation is a direct tradeoff, not a technical
        recommendation: this system can have an RTO of four hours for roughly the cost of backups
        and storage, or an RTO of minutes for the cost of a second standing environment run
        continuously — which of those does the business actually want to pay for, given what an
        outage of each length would actually cost it. Framed that way, a lot of internal-tooling
        and reporting systems turn out to genuinely want the cheap tier once someone prices out
        what a few hours of downtime would actually cost against what a warm standby costs every
        single month regardless of whether it's ever used.
      </p>

      <h2 id="testing">6. Testing disaster recovery</h2>
      <p>
        A DR plan that has never actually been exercised is not a plan with a known RTO and RPO —
        it's a plan with an assumed RTO and RPO, and the two are not the same thing. Every DR
        design in this guide rests on assumptions that only hold if they've been verified:
        that the failover automation actually triggers correctly, that the runbook's steps still
        match the infrastructure as it exists today rather than as it existed when the runbook was
        written, that the recovery region actually has enough spare capacity to absorb full
        production load rather than the capacity someone estimated during a design review two
        years ago, that whoever's on call at 3 a.m. actually knows the procedure exists and where
        to find it.
      </p>
      <p>
        None of those assumptions get tested by architecture review or by reading the runbook out
        loud in a meeting. They get tested by actually failing over — cutting traffic to the
        recovery region, or at minimum simulating the failure convincingly enough that the real
        automation and the real on-call process both have to fire for real, not in a tabletop
        exercise where a human quietly skips over the step nobody's sure still works. The
        uncomfortable truth about disaster recovery testing is that the choice isn't between
        testing it and not testing it — it's between testing it on your own schedule, during
        business hours, with rollback ready, or testing it for the first time during an actual
        disaster, when the stakes are highest and nobody has the luxury of aborting halfway
        through if something doesn't work.
      </p>
      <p>
        This also means a DR test's most valuable outcome is usually not "it worked," but the list
        of things that didn't — a runbook step referencing infrastructure that was decommissioned
        eight months ago, a scaling policy that undershoots real production load, an alert that
        never actually paged anyone. Treat a DR test that surfaces problems as the system working
        as intended, not as a failed test; the alternative is finding those same problems during
        an incident that was already going to be measured in the RTO everyone was counting on.
      </p>

      <h2 id="worked-example">7. Worked example: matching workload to tier</h2>
      <p>
        Put the whole chain together — RTO/RPO, tier, replication mode, failover mechanism, cost,
        testing cadence — against two workloads that land in genuinely different places on the
        spectrum, and the reasoning that gets each one to its answer.
      </p>
      <p>
        <b>An internal analytics dashboard.</b> If it's down for half a day, employees check
        numbers later than they'd like; nobody's revenue is affected in real time, and yesterday's
        data is a completely acceptable recovery point since the dashboard mostly reports on
        activity that already happened. That maps to a generous RTO (hours) and a generous RPO
        (up to a day), which in turn maps cleanly to backup-and-restore: nightly backups of the
        underlying data, and a documented, tested procedure to stand the application back up from
        those backups in a recovery region if the primary region is unavailable. Paying for a
        continuously running standby environment for this workload would be spending real,
        ongoing money to buy an RTO and RPO improvement nobody asked for and no one is prepared to
        justify against what downtime here actually costs.
      </p>
      <p>
        <b>A payment-processing system.</b> Extended downtime means the business cannot take
        payments at all, which is a direct and immediate revenue impact, not an inconvenience; and
        losing even a handful of already-confirmed transactions during a failover creates
        reconciliation problems and customer-facing errors that are expensive and embarrassing to
        untangle after the fact. That maps to a tight RTO (minutes, possibly less) and a very
        tight RPO (seconds, possibly zero for confirmed transactions) — which pushes the design
        toward warm standby at minimum, quite plausibly active-active, with synchronous or
        near-synchronous replication for the transaction data specifically, even knowing that
        means eating real write latency and real ongoing infrastructure cost for a second region
        running continuously. The failover mechanism here also needs the split-brain protection
        described earlier, because a payment system that briefly has two regions both accepting
        writes as primary can create duplicate charges or double-spent balances — a failure mode
        that's actively worse than staying down a few extra minutes while a neutral tiebreaker
        sorts out which region is actually primary.
      </p>
      <p>
        The two workloads don't differ because one is "more important" in some vague sense — they
        differ because the actual cost of downtime and the actual cost of lost data are different
        for each one, and those costs are what RTO and RPO are supposed to encode. Skip past
        setting them explicitly, for a specific system, with a specific owner, and "multi-region"
        stops being an engineering decision and becomes a reflex — applied uniformly regardless of
        whether the workload underneath it would have been just as well served, for a fraction of
        the cost, by a tested backup-and-restore plan.
      </p>
    </ContentLayout>
  );
}
