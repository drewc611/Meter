import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "cloud-architecture/cloud-cost-optimization.html",
  title: "Cloud Cost Optimization: Architecture Patterns That Actually Save Money — Merit AC Guides",
  description:
    "Why cloud spend is mostly decided at design time, not on a billing dashboard afterward — the pricing, transfer, sizing, and storage decisions that actually move the number.",
};

export default function CloudCostOptimization() {
  return (
    <ContentLayout active="cloud-architecture" wide>
      <span className="kicker">Guide · cloud architecture</span>
      <h1>Cloud cost optimization: architecture patterns that actually save money</h1>
      <p className="lead">
        By the time a cloud bill is high enough to get attention, the decisions that made it high
        were usually made months earlier, at design time, by someone who wasn't looking at a
        billing dashboard at all — they were sizing a database, picking a pricing plan, or drawing
        a data flow between two regions. Cost optimization treated as a post-hoc dashboard exercise
        catches the symptom. Treated as an architecture concern, it catches the decision that
        created the symptom in the first place.
      </p>

      <Toc
        items={[
          { href: "#architecture-decision", label: "1. Cost is an architecture decision" },
          { href: "#pricing-mismatch", label: "2. The pricing-model mismatch" },
          { href: "#data-transfer", label: "3. Data transfer and egress" },
          { href: "#rightsizing", label: "4. Rightsizing as a continuous practice" },
          { href: "#autoscaling", label: "5. The autoscaling tradeoff" },
          { href: "#storage-tiering", label: "6. Storage tiering" },
          { href: "#worked-example", label: "7. Worked example: diagnosing a spend problem" },
        ]}
      />

      <h2 id="architecture-decision">1. Cost is an architecture decision</h2>
      <p>
        It's tempting to treat cloud cost as something you manage after the fact — a dashboard you
        check monthly, a set of alerts that fire when spend crosses a threshold, a line item
        finance asks about at quarter end. That framing isn't wrong exactly, but it arrives too
        late to influence the biggest cost drivers, because those drivers are usually decided once,
        early, in the design of the system, and then simply compound every month afterward without
        anyone revisiting the original decision.
      </p>
      <p>
        Consider three ordinary design choices, none of which look like a "cost decision" when
        they're made. A team provisions compute sized to comfortably handle a projected peak load —
        reasonable caution, nobody wants an outage during a traffic spike — and that peak turns out
        to occur a few times a year while the same capacity sits mostly idle every other day of the
        month. A team picks a database tier one or two sizes above what current load requires,
        because headroom feels safer than being caught short and resizing a database is more
        disruptive than resizing compute. A team designs a data pipeline that moves data between
        two regions, or fans requests out to multiple availability zones, without pricing that
        movement into the design, because at design time the concern is correctness and latency,
        not the per-gigabyte transfer cost that will show up on next month's bill.
      </p>
      <p>
        None of these are mistakes in the sense of being obviously wrong at the time. Each is a
        locally reasonable tradeoff — favoring safety margin, favoring simplicity, favoring
        correctness — made by someone who wasn't thinking about cost as one of the variables in the
        decision, because nobody had framed cost as an architecture concern that belonged in the
        same conversation as capacity and reliability. That's the actual lesson: cost optimization
        done well isn't a separate activity that happens after architecture is decided, it's one
        more nonfunctional requirement — alongside latency, availability, and security — that
        belongs in the room when the architecture is being decided, not bolted on afterward by
        someone squinting at a billing dashboard trying to reverse-engineer which design decision
        produced which line item.
      </p>

      <h2 id="pricing-mismatch">2. The pricing-model mismatch</h2>
      <p>
        Cloud providers offer a spectrum of pricing models for the same underlying resources, and
        the spectrum exists because different workloads have genuinely different shapes. On-demand
        pricing charges a premium, priced into every unit, in exchange for total flexibility — no
        commitment, scale up or down or to zero at will, pay only for what you use in the moment.
        Reserved or committed-use pricing offers a substantial discount in exchange for committing
        to a baseline level of usage over a term, months or years, whether or not you end up using
        all of it.
      </p>
      <p>
        The mismatch, and it's a common one, runs in both directions. A workload that is genuinely
        steady and predictable — a core service that runs at roughly the same load every hour of
        every day, month after month, with no meaningful seasonality — sitting entirely on-demand
        pricing is paying a flexibility premium for flexibility that workload will never actually
        use. Nobody is going to suddenly turn that service off or need to burst it dramatically; the
        entire value proposition of on-demand pricing is optionality, and this workload isn't
        exercising any of it. Every month it stays on-demand is a month of paying for an option
        nobody exercises.
      </p>
      <p>
        Run the mismatch the other direction and it's just as costly, in a different way. A
        workload that's genuinely spiky, seasonal, or short-lived — a batch job that runs for a few
        hours a week, a service supporting a product that's still being validated and might be
        decommissioned in a quarter, infrastructure supporting a marketing campaign with a known end
        date — committed to a reservation locks in payment for capacity that goes unused most of the
        time the commitment is active. The discount on the committed rate doesn't matter if you're
        paying for capacity you're not using two-thirds of the term; the total cost of an
        underused reservation can end up higher than paying full on-demand price for only the hours
        actually needed.
      </p>
      <p>
        The first real lever in cost optimization, before touching architecture at all, is matching
        the pricing model to the actual traffic shape of the workload — and "actual" is the
        operative word, because this requires looking at real usage data rather than the shape
        someone assumed the workload would have at design time. A workload doesn't have one
        pricing-model-shaped answer for its entire lifetime, either: a service that's genuinely
        spiky during its first year of adoption can become steady and predictable once it matures,
        and the pricing commitment that made sense at launch stops being the right one. Revisiting
        this match periodically, against real traffic data rather than the original assumption,
        is where a surprising amount of avoidable cost hides in an established environment.
      </p>

      <h2 id="data-transfer">3. Data transfer and egress</h2>
      <p>
        Data transfer is the cost center most architectures get surprised by, because it's the one
        least visible at design time. Compute cost and storage cost are intuitive — you can look at
        a server and a disk and have a rough sense of what they cost. Data transfer cost is a
        property of the <em>shape</em> of communication between components, which is much easier to
        design without noticing, especially when the components in question are logically distant
        but the code connecting them is a single, innocuous-looking function call.
      </p>
      <p>
        Three patterns account for most of the surprise. Moving data between regions within the
        same provider — replicating a database across regions for availability, or having a service
        in one region call a service in another because that's where a team historically deployed
        it — costs more than moving the same data within a single region, and that cost scales
        linearly with volume in a way that's easy to underestimate when the initial design and
        testing happen at a data volume far smaller than production will actually see. Moving data
        between different cloud providers in a multi-cloud architecture is more expensive again,
        and multi-cloud designs adopted for redundancy or negotiating leverage sometimes end up
        paying more in cross-provider transfer than they save anywhere else. And moving data out to
        the public internet — egress, in provider terminology — is typically the most expensive of
        the three, which matters enormously for any architecture that serves large media files,
        exports, or bulk data downloads directly from cloud storage to end users.
      </p>
      <p>
        The reason this surprises architectures rather than being priced in from the start is that
        data transfer cost doesn't scale with the complexity of the system, it scales with the
        volume of data moving through it — a design can look clean and well-factored, with each
        service doing one thing, and still be expensive purely because those well-factored services
        talk to each other constantly across a region boundary that wasn't part of the original
        cost conversation. A monolith that does everything in one place, awkward as it is for other
        reasons, doesn't pay this particular tax at all; the tax is specifically the price of
        distributing a system across boundaries, and it's invisible until the bill arrives at a
        realistic production data volume.
      </p>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>Design-time question worth asking explicitly:</b> for every boundary two components
          communicate across — different regions, different providers, out to the public
          internet — what volume of data crosses that boundary, and is that boundary necessary
          given the actual latency and availability requirements? A boundary drawn for
          organizational reasons (two teams own two services) rather than technical ones is exactly
          the kind of boundary that ends up carrying more data transfer cost than it needed to.
        </p>
      </div>
      <p>
        Content delivery networks, regional caching, and simply collocating chatty services in the
        same region are the standard mitigations, and none of them are exotic — the reason they
        don't always get applied is that the cost they're mitigating wasn't visible when the
        architecture was drawn. Pricing out expected data transfer volume as part of the initial
        design, the same way you'd estimate compute or storage needs, is the concrete practice that
        prevents the surprise rather than just responding to it after the fact.
      </p>

      <h2 id="rightsizing">4. Rightsizing as a continuous practice</h2>
      <p>
        Rightsizing gets treated, in a lot of organizations, as a one-time exercise: launch the
        service, look at initial load, pick an appropriately sized instance or database tier, done.
        The problem with treating it that way is that "appropriately sized" is a statement about a
        workload's characteristics at a specific point in time, and workload characteristics change
        continuously — traffic grows, usage patterns shift as features are added or removed, a
        service that used to be CPU-bound becomes memory-bound after a refactor, a database that
        used to serve mostly reads starts serving a much heavier write load after a new feature
        ships. A size that was genuinely correct at launch silently drifts into being wrong,
        usually toward wasteful oversizing, occasionally toward dangerous undersizing, and nothing
        about the system flags that drift on its own.
      </p>
      <p>
        The oversizing direction is the one that costs money quietly and never causes an incident,
        which is exactly why it survives so long unaddressed. A database tier sized generously at
        launch, in a service whose growth was slower than projected or whose load profile changed
        to need less of that particular resource, just keeps running — nothing breaks, nobody gets
        paged, the bill is simply higher than it needs to be every single month, indefinitely, until
        someone happens to look. There's no error message for "you're paying for capacity you don't
        use." The undersizing direction gets noticed faster precisely because it does cause visible
        problems — degraded latency, timeouts, an incident — but it's worth naming as the less
        common of the two failure directions specifically because teams that are anxious about
        undersizing tend to overcorrect toward oversizing as the "safe" default, which is how the
        quiet, expensive failure mode ends up being the more prevalent one in practice.
      </p>
      <p>
        Making rightsizing continuous rather than one-time means treating it as a recurring review
        against real utilization data — actual CPU, memory, I/O, and throughput a resource has used
        over a meaningful recent window — rather than a decision made once and trusted indefinitely.
        Most cloud providers expose exactly this utilization data specifically because rightsizing
        drift is common enough to be a named, expected problem, not an edge case. The organizations
        that keep spend proportionate to actual need are the ones that put a recurring cadence
        around this review — monthly, quarterly, tied to a broader capacity-planning cycle — rather
        than the ones that did a careful sizing exercise once at launch and never returned to it.
      </p>

      <h2 id="autoscaling">5. The autoscaling tradeoff</h2>
      <p>
        Autoscaling is often presented as the straightforward fix for the oversizing problem
        rightsizing describes — instead of picking a fixed size and living with the gap between
        that size and real-time demand, let the infrastructure scale itself to match demand as it
        changes, and pay only for what's actually running at any given moment. That's a real
        benefit, and for a workload with meaningful, predictable variation in load — daily traffic
        cycles, weekly patterns, seasonal swings — autoscaling captures savings a static allocation
        simply can't, without a human having to notice and manually adjust a size on any particular
        day.
      </p>
      <p>
        The tradeoff is that autoscaling isn't free, and its costs are less visible than a fixed
        instance size but no less real. Cold-start latency is the most immediate one: a newly
        started instance or container often takes measurable time to become ready to serve traffic
        — loading code, warming caches, establishing connections — and a scale-out event triggered
        by rising demand doesn't help with that first wave of demand until the new capacity actually
        finishes starting. For a workload where response latency matters to users, that gap between
        "demand rose" and "capacity is actually serving traffic" is a real cost paid in degraded
        experience, not dollars, but it's a cost nonetheless, and it's the direct tradeoff for not
        paying to keep that capacity running all the time.
      </p>
      <p>
        Getting the scaling thresholds right is its own ongoing complexity, not a one-time
        configuration. Scale out too aggressively — on too small a signal, too early — and you
        provision capacity for demand spikes that turn out to be noise, undermining much of the
        savings autoscaling was supposed to provide. Scale out too conservatively, waiting for a
        strong, sustained signal before adding capacity, and a genuine, fast-arriving spike outruns
        the scaling response, causing exactly the availability problem a fixed, generously sized
        allocation would have avoided. There is no threshold setting that's simply correct in the
        abstract; the right threshold depends on how quickly this specific workload's demand
        actually moves, and that's a property you learn by watching the workload under real
        conditions, not something you can competently guess at design time.
      </p>
      <p>
        None of this is an argument against autoscaling — for the right workload shape it's
        unambiguously the better design. It's an argument against treating "turn on autoscaling" as
        a complete answer to a cost problem. The honest framing is that autoscaling trades a fixed,
        predictable cost of overprovisioning for a variable, harder-to-predict cost made up of
        cold-start latency, tuning effort, and residual risk during genuine spikes — and that trade
        is worth making for a workload whose demand actually varies enough to benefit, and much less
        worth making, with real tuning overhead and no real payoff, for a workload that's steady
        enough that a fixed size would have been simpler and just as cheap.
      </p>

      <h2 id="storage-tiering">6. Storage tiering</h2>
      <p>
        Not all stored data needs to live in the fastest, most expensive storage tier a provider
        offers, and treating all data uniformly — putting everything in the tier that offers the
        lowest latency and highest availability guarantees, regardless of how often it's actually
        accessed — is one of the more mechanical, low-effort-to-fix sources of avoidable storage
        spend. Providers generally offer a spectrum: a hot tier optimized for frequent,
        low-latency access at a higher price per gigabyte, down through progressively colder tiers
        with higher retrieval latency or retrieval fees but dramatically lower storage cost, intended
        for data that's accessed rarely or not at all outside of specific circumstances like
        compliance retention or disaster recovery.
      </p>
      <p>
        The mismatch runs in one direction almost exclusively here — data ends up parked in a
        hotter, more expensive tier than its actual access pattern justifies far more often than
        the reverse, because data is usually written into the hot tier by default (that's where an
        application naturally writes new data as it's created) and nothing about most systems
        automatically notices when that data stops being accessed and should have moved somewhere
        cheaper. Logs from eighteen months ago, a backup snapshot nobody has restored from in a
        year, an old export a user generated once and never returned to — all frequently sit in the
        same tier as data being read and written every second, purely because nothing moved them
        once the access pattern changed.
      </p>
      <p>
        The real skill in storage tiering isn't the mechanics of moving data between tiers — that's
        usually a matter of configuring a lifecycle policy the provider already supports. The real
        skill is knowing the access pattern of a given class of data well enough to set that policy
        correctly without manually babysitting individual objects or files: after how many days
        without access does this category of data stop needing hot-tier latency, and does it ever
        need to come back to a hot tier, or is it write-once, read-rarely-if-ever for its entire
        remaining life. Get that judgment right for a class of data — application logs, user
        uploads, database backups, generated reports — and a lifecycle policy handles the rest
        automatically, moving data through progressively cheaper tiers on a schedule that matches
        how it's actually used, with no ongoing manual effort after the policy is set.
      </p>
      <p>
        Get the access-pattern judgment wrong — move something into a cold tier that turns out to
        be needed unpredictably, incurring retrieval fees and latency at exactly the moment someone
        urgently needs that data — and the "savings" partially or fully reverse in an operationally
        painful way. That's the reason this is a judgment call and not a default to apply
        universally: the right tiering policy is specific to how a particular class of data is
        actually used, and getting it right requires actually knowing that access pattern, not
        assuming one.
      </p>

      <h2 id="worked-example">7. Worked example: diagnosing a spend problem</h2>
      <p>
        Take a hypothetical but representative workload: a mid-sized web application with a
        primary database, a set of background job workers, object storage for user-uploaded files,
        and a service that syncs data to a partner system in a different region. The monthly bill
        has grown noticeably over the last several months and nobody has a clear story for why.
        Working through the levers above, in the order they're likely to matter, is a more useful
        diagnostic than staring at the total number.
      </p>
      <p>
        Start with data transfer, because it's the most commonly overlooked and the easiest to
        check first: is the partner-sync service moving a meaningfully large or growing volume of
        data to a different region on every sync, and has sync frequency or data volume grown as
        the product has grown? If the partner-sync traffic has scaled with user growth and nobody
        priced that scaling in when the integration was designed, this is very often where a
        disproportionate share of an unexplained cost increase is actually hiding — it's invisible
        on a dashboard organized by service, because the cost shows up as "data transfer," a line
        item that doesn't obviously point back to the sync feature that's driving it.
      </p>
      <p>
        Next, check the database tier against actual utilization, not against how it was originally
        sized. If the database was sized for a growth projection that didn't fully materialize, or
        if a recent optimization reduced its actual load without anyone revisiting its size
        afterward, the gap between provisioned capacity and real usage is a candidate — and it's a
        candidate worth checking with real utilization numbers before touching anything, since
        downsizing a database that turns out to still need its current capacity is a much more
        painful mistake to walk back than leaving it oversized a while longer.
      </p>
      <p>
        Then check the background job workers' pricing model against their actual traffic shape.
        If those jobs run continuously at a steady rate, on-demand pricing on them is paying a
        flexibility premium they don't use, and moving to a committed-use pricing model is close to
        a pure win. If instead they run in irregular bursts driven by unpredictable user activity,
        on-demand is probably already the right model for them, and the pricing-model lever has
        little to offer here — the fix, if there is one, is elsewhere.
      </p>
      <p>
        Finally, check storage tiering on the user-upload store: is old, rarely accessed content
        from months or years ago sitting in the same hot tier as content uploaded this week, with
        no lifecycle policy moving it to a cheaper tier as it ages out of active use?
      </p>
      <Code wrap>{`Lever                        Likely to move the needle when...              Likely a rounding error when...
Data transfer / egress        Cross-region or cross-provider traffic         Everything already sits in one
                               scales with usage and was never priced in     region with minimal external egress
Database / compute sizing     Provisioned capacity was set once and          Sizing already tracks real usage
                               never revisited against real utilization      via a regular review cadence
Pricing model match           A steady workload sits on pure on-demand,      Traffic is already on the pricing
                               or a spiky one is over-committed              model matching its actual shape
Storage tiering               Large volumes of aging, rarely accessed        Storage volume is small relative
                               data sit in the default hot tier              to compute and transfer spend`}</Code>
      <p>
        The pattern worth taking away from this walkthrough isn't the specific diagnosis — it's the
        order of operations. Data transfer and pricing-model mismatches tend to produce the largest,
        most disproportionate savings relative to the effort of fixing them, because they're
        structural mismatches between how a workload actually behaves and what it's being charged
        for, rather than a matter of degree. Rightsizing and storage tiering matter and compound
        over time, but they tend to be a smaller, steadier drag rather than the single line item
        explaining a sudden jump in the bill. Diagnosing spend well means checking the structural
        mismatches first, precisely because they're the ones most likely to have been decided once,
        by accident, at design time, and never revisited since.
      </p>
    </ContentLayout>
  );
}
