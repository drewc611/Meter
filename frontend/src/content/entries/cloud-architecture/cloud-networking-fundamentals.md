---
title: 'Cloud networking fundamentals: VPCs, subnets, and peering'
description: >-
  A working mental model for cloud networking — VPCs, subnets, gateways,
  security groups, peering, and on-prem connectivity — traced through one
  request's actual path.
kicker: Guide · infrastructure fundamentals
lead: >-
  Almost every cloud networking concept — subnets, gateways, security groups,
  peering, private DNS — is either a piece of one foundational idea or a way of
  connecting two instances of it. That idea is the virtual private cloud.
  Understand what a VPC actually is and why it exists, and the rest of this
  guide is mostly detail on top of a model you already have.
wide: true
tileMeta: >-
  VPCs, subnets, peering, and the actual path a request takes to a private
  database
---
## 1\. The VPC as isolation boundary

A cloud provider's data centers hold hardware shared across thousands of customers. A virtual private cloud is what makes that shared physical substrate behave, from inside, like a private network you fully control: your own address space, your own routing decisions, your own boundary for what can reach what. Nothing outside the VPC can see inside it unless you explicitly build a path — a gateway, a peering connection, a VPN. That default-closed posture is the single most important property of a VPC, and almost every other concept in this guide is either a way of opening a specific, deliberate hole in that boundary or a way of extending the boundary itself across multiple VPCs or into a physical data center.

Concretely, a VPC is a range of private IP addresses — expressed as a CIDR block, like `10.0.0.0/16` — that you carve up and control entirely. The provider handles the physical network underneath; you define everything on top of it: which addresses exist, which of them can talk to the internet, which route to each other, and which are blocked from everything by default. Two VPCs, even in the same account and the same region, cannot communicate at all until you connect them on purpose. That isolation is a feature, not friction — it means a mistake in one VPC's routing table, or a compromised instance inside it, does not automatically expose anything in a neighboring VPC.

It's worth being precise about what a VPC is _not_. It is not a security product, not a firewall, not an access-control system in its own right — it's a network boundary. Security groups, network ACLs, IAM policies, and encryption are the controls you layer on top of the boundary a VPC provides. A VPC with no security groups configured and everything routed to the internet is still, technically, an isolated network — it's just an isolated network with the front door left open. The isolation the VPC gives you is the starting condition every other control assumes; it doesn't substitute for those controls.

## 2\. Subnetting: public and private

A VPC's address range is too coarse to use directly — you need to place different kinds of resources into different zones of trust and reachability, and that's what subnets are for. A subnet is a slice of the VPC's CIDR block, typically pinned to a single availability zone, and its defining property isn't its size but its route table: a **public subnet** has a route to an internet gateway, and a **private subnet** does not. That one routing fact is the entire distinction. Nothing about a subnet's addresses, name, or the resources inside it makes it public or private — only whether traffic addressed to `0.0.0.0/0` (everywhere on the internet) has a route out.

The practical convention that follows from this is a tiered layout: a load balancer or bastion host sits in a public subnet because it genuinely needs to be reachable from the internet; application servers sit in a private subnet because they only need to be reachable from the load balancer; and the database sits in a private subnet one layer further in, reachable only from the application tier. Each tier can only be reached from the tier in front of it, so compromising the public-facing layer doesn't hand an attacker a direct path to the data.

Putting the database tier in a private subnet adds real operational friction, and it's worth naming that friction honestly rather than pretending it isn't there. An engineer who needs to run a one-off query against production can't just connect directly — they need a bastion host, a VPN, or a session-manager tunnel that itself lives on the boundary between public and private. Database migrations, backups, and monitoring agents all need a path that respects the same boundary. None of that friction is a bug in the design; it's the cost of the property you're buying, which is that a database with no business being internet-reachable simply isn't a routable destination from the internet, full stop — not "blocked by a rule that could be misconfigured," but structurally unreachable because no route exists. A misconfigured security group on a private-subnet database is a much smaller incident than the same mistake on a public one, because the network path to exploit it doesn't exist in the first place.

## 3\. Routing and gateways

An internet gateway is what makes a public subnet public: it's attached to the VPC, and a route table entry sending `0.0.0.0/0` traffic to it is what lets instances in that subnet both reach the internet and be reached from it (assuming their own security rules allow it). Without that route table entry, an instance can have a public IP address assigned to it and still have no way to actually send or receive internet traffic — the address alone does nothing without the route.

Private subnets present a real problem this raises immediately: an application server with no route to the internet can't download OS security patches, pull a container image from a public registry, or call an external API — all things it legitimately needs to do, without needing to be reachable _from_ the internet at all. The asymmetry — outbound access without inbound reachability — is exactly what a NAT gateway provides. A NAT gateway lives in a public subnet, and a private subnet's route table sends its outbound internet-bound traffic there instead of to an internet gateway directly. The NAT gateway rewrites the source address of outbound packets to its own public IP, sends them out through the internet gateway, and on the way back, matches responses to the private instance that originated them and forwards them along. Nothing outside can initiate a new connection to the private instance through the NAT gateway — it only ever completes connections the private side started. That's the mechanic that lets a database apply patches without ever being a valid destination for an inbound connection from the internet.

The failure mode worth watching for is a route table mismatch: a subnet that looks private because it holds no public IPs, but whose route table still points `0.0.0.0/0` at an internet gateway rather than a NAT gateway. Route tables, not IP assignment or naming, are the actual source of truth for whether a subnet is public or private — always verify the route table directly rather than trusting a subnet's name or its position in a diagram.

## 4\. Security groups vs. network ACLs

Cloud networks give you two firewall layers that look similar and are frequently confused, but differ in a way that matters operationally: a security group is a **stateful**, instance-level firewall, and a network ACL is a **stateless**, subnet-level firewall. Both exist because they solve different problems, and relying on only one leaves a gap the other is specifically designed to close.

A security group attaches to an individual instance or network interface and evaluates rules per connection, not per packet. Statefulness means that if you allow inbound traffic on port 443, the return traffic for that same connection is automatically allowed out — you never have to write a matching outbound rule for a response. This is almost always what you want for application traffic: you reason about it in terms of "what connections can reach this instance," which maps directly onto how the applications running on it actually communicate.

A network ACL attaches to a subnet and applies to every instance inside it, uniformly, and it's stateless: an allowed inbound packet does not automatically permit its response back out — you write inbound and outbound rules independently, and both have to be right or traffic breaks in a way that's genuinely confusing to debug, because the inbound half looks fine in every log you check. That statelessness is also what makes network ACLs useful for a job security groups can't do well: an explicit _deny_ rule. Security groups are allow-only — there's no way to write a security-group rule that blocks a specific address while allowing everything else. A network ACL can. If you need to hard- block a known-bad IP range or a specific subnet-to-subnet path regardless of what any instance's security group says, the network ACL is the only layer that can express it, and it applies before traffic ever reaches an instance's own rules.

In practice, most teams run permissive default network ACLs and do the real work in security groups, reaching for a network ACL only for that explicit-deny case or for a blanket subnet-wide rule that shouldn't depend on every instance in the subnet configuring its security group correctly. The two layers being independent is the actual point: a mistake in one instance's security group doesn't automatically defeat a subnet-wide deny rule sitting in the network ACL in front of it, which is exactly the kind of defense-in-depth a single firewall layer can't provide no matter how carefully it's configured.

## 5\. Peering and transit gateways

VPC peering connects two VPCs so instances in either one can talk to instances in the other using private IP addresses, as if they were on the same network. It's cheap, low-latency, and simple to reason about for a small number of VPCs — but it comes with a gotcha that catches almost everyone who hasn't hit it before: peering is strictly point-to-point and _does not transit_. If VPC A is peered with VPC B, and VPC B is peered with VPC C, A cannot reach C through B. Each peering connection only covers the two VPCs on its own two ends; there's no automatic transitive routing, no matter how it might look on a network diagram where A–B–C appears to form a path. If you need A to reach C, you need a direct A–C peering connection, full stop.

That non-transitive property is fine — even desirable — for two or three VPCs, but it becomes a real architectural problem as the number of VPCs grows, because full connectivity between N VPCs by direct peering alone requires roughly N(N-1)/2 peering connections. Ten VPCs that all need to reach each other is 45 separate peering connections, each with its own route table entries to manage on both ends, and each new VPC you add means wiring up a peering connection to every existing one. That N-squared growth is the actual problem a transit gateway solves.

A transit gateway acts as a central routing hub: instead of every VPC peering directly with every other VPC, each VPC attaches once to the transit gateway, and the transit gateway routes traffic between all attached VPCs (and, typically, on-premises connections too) according to its own route tables. Adding a new VPC to the network means one new attachment, not N new peering connections. The tradeoff is that you're introducing a single routing component that everything now depends on and that you pay for based on traffic volume — for a handful of VPCs, direct peering is usually simpler and cheaper; past that, the operational cost of maintaining a growing peering mesh by hand outweighs the cost and complexity of a transit gateway.

## 6\. Connecting to on-premises networks

Most organizations running in the cloud still have something on-premises worth connecting to — a legacy system that hasn't migrated, an internal directory service, an office network — and there are two fundamentally different ways to build that connection, trading cost against latency and reliability.

A site-to-site VPN encrypts traffic between your VPC and your on-premises network and sends it over the public internet, the same physical paths that carry ordinary internet traffic. It's fast to set up — often a matter of hours — and inexpensive, because you're not paying for dedicated infrastructure. What you're accepting in exchange is that your traffic's latency and reliability are subject to the public internet's variability: a route change somewhere upstream, congestion at a peering point you don't control, or a transient outage at an ISP between you and the cloud provider can all affect a connection you have no direct visibility into and no ability to fix yourself.

A dedicated private connection — a direct physical link from your data center or a colocation facility into the cloud provider's network, bypassing the public internet entirely — solves that variability at the cost of real money and real lead time. Provisioning one typically means working with the cloud provider or a network partner to establish a physical cross-connect, which can take weeks, and paying for dedicated port capacity whether or not you're using all of it. What you get is consistent, low latency and a connection whose behavior doesn't depend on the state of the public internet on a given day — which matters a great deal for latency-sensitive workloads (a trading system, real-time replication) and matters much less for a nightly batch sync that only needs to finish before morning.

The two aren't mutually exclusive, and a common pattern is to run both: the dedicated connection as the primary path, and a VPN as an automatic failover if the dedicated link goes down. That gives you the latency and reliability profile of the dedicated connection during normal operation, without a single point of failure if that link — which is, physically, a single cable or a small number of them — is cut or fails.

## 7\. DNS and service discovery

Every resource inside a VPC — an instance, a load balancer, a managed database — gets a private IP address, and that address can and will change: an instance gets replaced during an autoscaling event, a database fails over to a standby, a load balancer's backing infrastructure is swapped by the provider. Hardcoding an IP address anywhere in configuration or application code is a bet that the resource behind it never changes, and in a cloud environment built around elastic, replaceable infrastructure, that bet loses eventually — often silently, as a connection that starts failing for a reason nobody wrote down.

Private DNS zones exist to make that bet unnecessary. Instead of an application connecting to `10.0.4.17`, it connects to `db.internal.example.com`, and a private hosted zone inside the VPC resolves that name to whatever the current correct IP address is. When the database fails over to a standby with a different address, updating one DNS record repoints every application that uses the name — no config file to hunt down and edit across a fleet of instances, no restart required beyond whatever the DNS record's TTL dictates.

```
# The brittle version — breaks silently the next time
# the instance behind this address is replaced:
DB_HOST=10.0.4.17

# The version that survives infrastructure changes —
# the name is stable even when what it resolves to isn't:
DB_HOST=db.internal.example.com
```

Most managed cloud services already give you this for free — a managed database, a load balancer, a managed cache all come with a stable DNS name whose backing IP address the provider is free to change without notice, precisely because nothing is supposed to depend on that address staying fixed. The discipline this guide is really arguing for is narrower and easy to skip under deadline pressure: never work around a provided DNS name by resolving it once and hardcoding the result "to save a lookup," and give your own internal services the same treatment — a private DNS name from the moment they exist, not retrofitted after the first outage caused by an address that quietly changed.

## 8\. Worked example: internet to private database

Put the pieces together by tracing one request end to end: a user's browser calls an API that ultimately needs a row from a database sitting in a private subnet. Naming every hop makes clear that each control point exists to do one specific job, not as generic defense-in-depth for its own sake.

**1\. Internet to load balancer.** The request leaves the user's browser and arrives at a load balancer sitting in a public subnet, reachable via the VPC's internet gateway. This is the only point in the entire path that is directly reachable from the open internet — by design, so that there's exactly one thing to harden against internet-facing traffic rather than an entire fleet of application servers.

**2\. Load balancer's security group.** Before the connection is accepted at all, the load balancer's security group checks that the request is on an allowed port (443, say) from an allowed source. This is the first firewall the packet meets, instance-level and stateful.

**3\. Load balancer to application server.** The load balancer forwards the request to an application server in a private subnet — a subnet with no route to the internet gateway at all, so it isn't a valid destination for any connection that didn't originate from the load balancer. The application server's own security group additionally restricts inbound traffic to only the load balancer's security group as a source, not just "anything inside the VPC."

**4\. Subnet-level network ACL.** Both the public and private subnets have network ACLs evaluating the traffic as it crosses the subnet boundary — stateless, so both the inbound request and its eventual outbound response are checked independently against the rules. This is the layer that would enforce a hard, subnet-wide block if one were needed, regardless of what any individual instance's security group allows.

**5\. Application server to database.** The application server resolves `db.internal.example.com` via the VPC's private DNS zone to the database's current private IP address, and connects. The database sits in a further private subnet whose security group allows inbound connections only from the application tier's security group — not from the load balancer, not from the public subnet, and never from the internet gateway, because no route from the internet gateway to that subnet exists in the first place.

**6\. The database's own outbound path.** Separately from serving the request, the database instance periodically needs outbound access — for OS patches, for a managed backup service, for telemetry. That traffic follows the private subnet's route table to a NAT gateway in the public subnet, which lets the outbound connection complete without ever making the database a valid destination for an inbound one.

Every hop in that path is a deliberate choice, not a coincidence of how the resources happened to be provisioned: a public subnet exists because exactly one thing needs to be internet-reachable; private subnets exist because nothing else does; security groups narrow "reachable from this subnet" down to "reachable from this specific upstream service"; network ACLs provide a subnet-wide backstop that doesn't depend on any one instance's configuration; DNS means none of this breaks the next time an IP address changes; and the NAT gateway lets the innermost tier stay current without ever opening an inbound path to it. Read backward from an incident, that's also the checklist for diagnosing one: at which hop did a request reach further than this design intended it to.
