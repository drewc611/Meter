---
title: 'Database architecture in the cloud: replication, sharding, and consistency'
description: >-
  Why scaling a database is a series of distinct tradeoffs, not one decision —
  replication lag, sharding key choice, and what a managed database actually
  takes off your plate versus what it doesn't.
kicker: Guide · cloud architecture
lead: >-
  Every other piece of a cloud architecture, compute, caching, the network
  path a request takes, can usually be scaled horizontally by adding more of
  it. A database resists that in a way nothing else in the stack does,
  because the whole point of a database is that reads and writes have to
  agree on a single, consistent version of the truth, and every scaling
  technique available is really a negotiation over how strictly that has to
  hold.
wide: true
tileMeta: 'Replication lag, sharding key choice, and what a managed database actually offloads'
---
## 1\. Vertical scaling first, and its actual limit

The first, simplest lever is vertical: a bigger instance, more CPU, more memory, faster disk, all pointed at a single database node that still owns the entire dataset and every write. It's simple because nothing about the application or the data model has to change, and for a genuinely large share of real workloads it's sufficient for far longer than teams expect, because a single well-resourced modern database instance handles more throughput than most systems ever generate. The limit is real, though, and it's not just a throughput ceiling: a single node is also a single point of failure for every write in the system, and vertical scaling does nothing to address that, only how much load one node can absorb before it does.

## 2\. Replication: the first horizontal lever

Replication copies data from a primary node, which accepts writes, to one or more replicas, which accept reads. This buys two things at once: read capacity beyond what one node could serve alone, since read traffic spreads across replicas, and a standby copy of the data that can be promoted to primary if the original primary fails. What it doesn't buy, in the common case of asynchronous replication, is a guarantee that a replica's data is perfectly current: writes commit on the primary and propagate to replicas afterward, and the gap between those two moments, replication lag, is real and grows under write-heavy load or network pressure between nodes.

Replication lag is the source of a specific, easy-to-miss bug class: a user writes something, immediately reads it back, and the read is served by a replica that hasn't caught up yet, so the user sees stale data reflecting a state before their own write. Read-after-write consistency, routing a user's own subsequent reads to the primary (or to a replica confirmed caught up) for some window after they write, is the standard mitigation, and it's a deliberate architectural choice, not something replication gives you automatically just by turning it on.

## 3\. Sharding: partitioning the data itself

Replication scales reads; it does nothing for write throughput, because every write still has to land on the single primary regardless of how many read replicas exist downstream of it. Sharding addresses that by partitioning the dataset itself across multiple independent nodes, each owning a distinct subset of the data and accepting writes for that subset only, so write throughput scales with the number of shards rather than being capped by what one primary can absorb.

The sharding key, the field that determines which shard a given row lives on, is the single decision that determines whether sharding actually helps or just relocates the problem. A key that distributes writes evenly across shards (a well-distributed customer ID, for instance) gets the throughput benefit sharding exists for. A key that's skewed, one customer, one tenant, or one category that dominates the traffic, concentrates load onto whichever shard owns that key's range regardless of how many shards exist in total, and a system sharded on a bad key can end up no better off than an unsharded one, just with far more operational complexity layered on top of the same bottleneck. A query that needs data from multiple shards at once, a cross-shard join or an aggregate across the whole dataset, is the other real cost: sharding trades away the ability to do that cheaply, in exchange for write throughput that a single node structurally cannot provide.

## 4\. Consistency tradeoffs

A distributed database, once data lives on more than one node, has to make an explicit choice about what happens when a network partition separates nodes that would otherwise coordinate: continue serving reads and writes on both sides of the partition and risk them disagreeing once it heals, or refuse to serve on the minority side until the partition heals and consistency can be guaranteed again. This is the real content behind the CAP theorem's often-oversimplified summary: consistency and availability are only genuinely in tension during an actual partition, and a system's choice of how to behave during that specific, hopefully rare, event is what its CAP classification actually describes, not a permanent, everyday tradeoff a team is making on every request.

In practice this shows up as a spectrum of consistency models a specific database or a specific read path can choose from, not a single global setting: strong consistency, every read sees the most recent committed write, at the cost of that read potentially waiting on coordination across nodes; eventual consistency, a read might return a slightly stale value but the system converges given enough time with no further writes; and various points between the two (read-your-writes, bounded staleness) that trade a specific, named amount of staleness for a specific, named amount of latency or availability benefit. Choosing the right model per read path, rather than picking one setting for the whole database, is usually the more useful design decision: an account balance check probably needs strong consistency, a "likes" counter on a social post almost certainly doesn't.

## 5\. Managed vs. self-hosted

A managed database service takes over patching, backups, failover orchestration, and often the mechanics of read replicas and storage scaling, in exchange for less control over the underlying configuration and a cost structure that reflects the operational work being offloaded. What it does not take over is the schema design, the sharding key choice, the query patterns, or the consistency model a given feature actually needs: those remain entirely the application team's decisions, and a managed database with a bad sharding key or a query pattern that fights its indexing strategy performs just as badly as a self-hosted one would, because none of what's being managed touches those decisions.

The honest way to frame the choice is which category of operational work a team wants to keep doing themselves. Patching, failover mechanics, and backup verification are largely undifferentiated work, the same regardless of which company is running it, and a managed service doing that work reliably is close to a pure win. Schema and access-pattern decisions are the differentiated part, specific to the actual application, and no managed service relieves a team of getting those right.

## 6\. Multi-region databases

Extending a database across regions for latency (serving reads closer to users) or disaster recovery (surviving a whole region's failure) reintroduces the consistency tradeoff from Section 4 at a much larger physical distance, where the latency of coordinating a write across regions, tens to low hundreds of milliseconds depending on the regions involved, is no longer a rounding error compared to a same-region round trip. A multi-region setup that insists on strong consistency for every write pays that inter-region latency on every single write, which is often an unacceptable cost for a latency-sensitive application. A multi-region setup that accepts eventual consistency across regions, syncing asynchronously, keeps writes fast in the region they originate but reopens the read-after-write staleness problem from Section 2, now at region scale rather than replica scale.

There's no configuration that makes this tradeoff disappear; the honest question is which regions actually need to serve writes at all. A read-replica-per-region design, with writes always routed back to a single home region, sidesteps the cross-region write-consistency problem entirely at the cost of write latency for users far from the home region, and is the right fit for far more systems than a genuinely multi-write-region design, which should be reserved for cases where write latency in every region is a hard requirement worth the real consistency and operational complexity it costs.

## 7\. Worked example: choosing a shard key for a multi-tenant app

A multi-tenant SaaS application, initially on a single database instance, starts hitting write throughput limits as its largest customers grow. The obvious first candidate for a sharding key is tenant ID, since the application's data model is already tenant-scoped end to end and nearly every query already filters by it, which keeps the vast majority of queries within a single shard rather than needing a cross-shard join. The risk with tenant ID specifically is skew: if one enterprise customer generates an order of magnitude more traffic than the median tenant, sharding by tenant ID alone puts that customer's shard under the same pressure the whole database was under before, just isolated to one shard instead of spread across the fleet.

The practical fix that keeps tenant ID as the key while addressing the skew is giving a small number of known, unusually large tenants a dedicated shard each, while smaller tenants share pooled shards keyed by a hash of tenant ID, so an operator can see load per shard and split off the next tenant that grows too large for its pool, deliberately, rather than the whole system degrading unpredictably as one tenant's traffic silently outgrows its share of a shared shard.

This pairs with [cloud cost optimization](/cloud-architecture/cloud-cost-optimization) for how database sizing decisions specifically show up on a bill over time, and with [disaster recovery and multi-region architecture](/cloud-architecture/disaster-recovery-and-multi-region-architecture) for the failover mechanics a database's own replication topology has to support during a real regional outage.
