---
title: 'Container orchestration: Kubernetes architecture fundamentals'
description: >-
  What Kubernetes' control plane actually does, why the pod rather than the
  container is the atomic unit, and where reconciliation loops help until
  stateful workloads make them the hard part.
kicker: Guide · infrastructure architecture
lead: >-
  A container solves packaging: a process and its dependencies bundled so it
  runs the same way everywhere. It doesn't solve placement, restart,
  discovery, or rollout, and those four problems are what an orchestrator
  actually exists for. Kubernetes is the dominant answer to them, and its
  architecture makes more sense read as a solution to those four problems in
  order than as a product to learn feature by feature.
wide: true
tileMeta: 'Control plane, pods as the atomic unit, and why stateful workloads are the hard part'
---
## 1\. What orchestration actually solves

Given a fleet of machines and a set of containers that need to run somewhere on them, four questions have to be answered continuously, not just once at deploy time. Where does each container run, given the resources available on each machine right now. What happens when a container crashes, or the machine it's on disappears. How does one service find another when either side's actual location can change at any time. How does a new version roll out without every instance of the old version disappearing at once. A single-machine `docker run` answers none of these; an orchestrator's entire job is answering all four, continuously, as the fleet's shape changes underneath it.

## 2\. Control plane and worker nodes

Kubernetes splits into a control plane that makes decisions and worker nodes that run workloads. The API server is the single entry point: every other component, including `kubectl`, reads and writes cluster state exclusively through it, never directly against each other. etcd, a distributed key-value store, is where that state actually persists, and it is the single most consequential component to keep healthy and backed up, since losing etcd means losing the cluster's memory of what should exist, not just what happens to be running at that instant. The scheduler watches for newly created pods with no assigned node and picks one, based on requested resources, constraints, and current node capacity. The controller manager runs the reconciliation loops (Section 4) that keep actual state converging toward desired state.

On each worker node, the kubelet is the agent that actually starts and stops containers on that machine, reporting node and pod status back to the API server, and enforcing the resource limits attached to each pod. kube-proxy maintains the networking rules that let traffic addressed to a Service reach whichever pods are currently backing it, which matters because a pod's own IP address is not something anything else in the cluster should ever depend on directly (Section 5).

## 3\. Pods as the atomic unit, not containers

The pod, not the container, is what Kubernetes schedules, scales, and restarts. A pod is one or more containers that are guaranteed to run on the same node, share a network namespace (so they can reach each other over `localhost`), and are created and destroyed together. Most pods run exactly one container; multi-container pods exist for genuinely coupled roles, most commonly a sidecar that handles something the main container shouldn't have to (a log shipper, a service-mesh proxy, a secrets-fetching init step) but that has to live and die on the exact same lifecycle as the container it's supporting.

This matters architecturally because it sets the granularity everything else operates at. Scaling adds or removes whole pods, never scales one container inside a pod independently of its sidecar. A node failure takes the whole pod down together, which is exactly the guarantee a sidecar needs (there's no world where the main container is up and its log shipper isn't, or vice versa, without one of them silently failing its job).

## 4\. Declarative reconciliation loops

Kubernetes doesn't execute a deploy as a sequence of imperative steps that either finishes or fails. A Deployment object declares desired state (this image, this many replicas), and a controller runs a continuous reconciliation loop: observe actual state, compare it to desired state, take an action that moves actual state closer to desired state, repeat. This is the same idea infrastructure-as-code tools use for a `plan`/`apply` cycle, applied continuously and automatically instead of on demand: if a node dies and takes three replicas with it, the loop notices the gap between desired and actual replica count on its own next pass and schedules replacements, with no human or pipeline step needing to trigger that recovery.

The same mechanism drives rollouts. A Deployment update to a new image doesn't cut over all replicas at once by default; it incrementally replaces old-version pods with new-version ones, a few at a time, governed by how many old pods may be unavailable and how many new pods may exceed the target count during the transition. If the new version's pods fail their readiness checks, the rollout stalls with the old version still serving most of the traffic, rather than the reconciliation loop faithfully replacing everything and taking the whole service down chasing a desired state that turns out to be broken.

## 5\. The networking model

Every pod gets its own IP address from a flat cluster network, and any pod can reach any other pod's IP directly, without network address translation getting in the way, which is a deliberate simplification relative to a typical VPC's segmented subnets. The catch is that a pod's IP is not stable: a pod that's rescheduled, whether by a rollout or a node failure, gets a new one. Nothing that needs to reliably reach "the payments service" should ever hold onto a specific pod IP.

A Service is the stable address that solves this: a fixed virtual IP and DNS name that kube-proxy transparently load-balances across whatever set of pods currently matches the Service's label selector, updated automatically as pods come and go. This is the mechanism that makes the reconciliation loop's constant pod churn invisible to everything else in the cluster: a consumer talks to a Service name that never changes, and the mapping from that name to actual, currently-healthy pod IPs is kept correct underneath it without the consumer ever needing to know a rescheduling event happened at all.

## 6\. Stateful workloads: the hard part

Everything above assumes a pod is disposable and interchangeable with any other replica of the same Deployment, which is true for a stateless web service and false for a database. A StatefulSet exists for the case where identity and storage matter: each replica gets a stable, predictable name (`db-0`, `db-1`, not an arbitrary generated one) and its own persistent volume that follows it across rescheduling, rather than a fresh, empty volume every time a pod restarts.

That solves storage continuity, not the harder problem underneath it, which is that most stateful systems have their own replication and consensus protocol (a primary election, a quorum requirement) that Kubernetes knows nothing about and won't enforce for you. Rescheduling `db-1` onto a new node reattaches its volume correctly, but whether the application inside that pod correctly rejoins its replication group, or whether a network partition during a rolling update briefly produces two nodes that both think they're primary, is entirely a property of the stateful application's own logic, not something the orchestrator's reconciliation loop understands or protects against. This is the concrete reason "just run your database in Kubernetes" is a much bigger commitment than "just run your stateless API in Kubernetes": the platform gives you stable identity and storage, and the correctness of everything built on top of that is still the application's problem.

## 7\. Worked example: resource requests and probes

A pod with no resource requests set gets scheduled onto whatever node has room by the scheduler's best guess, and under real load can consume far more CPU or memory than any other pod on that node expected to share with it, degrading everything else on the node rather than being visibly throttled itself. Setting a resource request (what the scheduler reserves for this pod when deciding placement) and a resource limit (the hard ceiling the kubelet enforces at runtime) turns an invisible noisy-neighbor problem into an explicit, predictable one: the scheduler won't overcommit a node past its requests, and a pod that exceeds its memory limit gets killed and restarted instead of degrading everything around it.

Readiness and liveness probes close the remaining gap between "the process is running" and "the process is actually able to serve traffic." A liveness probe that fails restarts the container, which is the right response to a genuinely hung process, and the wrong response to a process that's just slow to start (a premature liveness failure during startup causes a restart loop that never lets the process finish initializing). A readiness probe that fails removes the pod from a Service's load-balanced set without restarting it, which is the correct response during startup or a temporary downstream dependency outage: don't route traffic here yet, don't kill it either, let it recover on its own and rejoin once it reports ready again.

This pairs with [microservices vs. monolith](/cloud-architecture/microservices-vs-monolith) for the question of whether a given system's boundaries justify running many independently deployed services at all, and [API gateway and service mesh architecture](/cloud-architecture/api-gateway-service-mesh-architecture) for what typically runs as a sidecar alongside application pods once a cluster's traffic patterns outgrow a Service's plain load balancing.
