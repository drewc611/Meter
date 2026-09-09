---
title: 'Infrastructure as code: architecture and the drift problem'
description: >-
  Why the state file, not the template language, is the actual hazard in
  infrastructure as code, and how blast radius and drift shape a sane
  repository layout.
kicker: Guide · infrastructure architecture
lead: >-
  Infrastructure as code gets sold as "your infrastructure, version
  controlled" and that framing undersells the actual design problem. The code
  is a description of a desired state. The dangerous part is the gap between
  that description and what's actually running, and the tooling decisions
  that determine how quickly, and how safely, that gap gets closed.
wide: true
tileMeta: 'State, drift, and blast radius — the parts that actually break in production'
---
## 1\. What IaC actually replaces

The alternative to infrastructure as code was never "no process," it was an engineer clicking through a console or running a one-off script, then telling (or not telling) a wiki page what they did. That approach has one real failure mode: nobody, including the person who made the change, can reliably reconstruct the current state of the system from anything other than the system itself. IaC's actual promise is that the desired state lives somewhere reviewable, diffable, and reproducible before it's applied, not that infrastructure changes become mechanically safer just because they're expressed as code.

That promise only holds if the tool actually enforces it. A declarative tool like Terraform or CloudFormation computes a diff between what the code says should exist and what the tool believes currently exists, then applies only that diff. An imperative tool, a provisioning script or an Ansible playbook run in sequence, executes a set of steps and trusts that running them again produces the same result, which is a much weaker guarantee, since a step written to work against one starting state can behave differently against a system that's drifted from it. Pulumi and the AWS CDK sit in between: general-purpose code that compiles down to a declarative template under the hood, giving you real language constructs (loops, conditionals, functions) while still going through the same diff-and-apply model as a native declarative tool.

## 2\. State: the part that isn't the code

The code is the desired state. What the tool believes is the current state lives somewhere else entirely, in Terraform's case a state file, in CloudFormation's case a stack's own tracked resources. This is the part of IaC that actually causes outages, and it's the part most new users don't think about until it breaks. If two people run `apply` against the same state file at the same time without locking, the second apply computes its diff against a state that's already stale by the time it writes back, and the result is undefined in a way the code review that approved either change never anticipated.

The fix is a remote, locked backend: state stored in an object store with a locking mechanism (a DynamoDB table alongside an S3 bucket, in the AWS-native Terraform pattern, or an equivalent managed state backend), so a second `apply` blocks or fails loudly instead of racing the first. State also has to be treated as sensitive, not just important: a state file frequently contains resource attributes that amount to secrets (a generated database password, a certificate's private key material) in plain text, which is a real reason to restrict who can read the backend, not only who can write to it.

## 3\. Drift: divergence nobody wrote down

Drift is what happens when reality moves without the code moving with it: someone fixes an incident by editing a security group directly in the console, a scaling event changes an instance count that the code declared statically, an expired resource gets manually recreated with slightly different settings under time pressure. None of that is malicious, all of it is normal operational reality, and every instance of it means the tool's belief about current state is now wrong.

Drift is dangerous specifically because it's invisible until the next `apply`, at which point the tool reconciles the actual state back toward what the code says, silently undoing whatever the manual change was, at whatever moment someone happens to run it, possibly during an unrelated deploy days later. The mitigation isn't "never let anyone touch the console" (that ban gets violated during real incidents and the tooling should assume it will be), it's running a scheduled drift-detection pass, a plan against the live state with no apply, on a cadence tight enough that drift gets surfaced and reconciled deliberately instead of being discovered as a surprise side effect of an unrelated change.

## 4\. Blast radius: how much one apply can touch

The single design decision that determines how bad a bad apply can be is how much infrastructure lives in one state file, one root module, one thing a single `apply` operates against. A repository with one giant root module covering every environment and every service shares one blast radius across all of it: a bad plan for a change to the staging database can, through a state-file mistake or a misapplied module input, touch production resources that were never meant to be part of that change.

Splitting state by environment and by service, so that the staging network, the production network, and each service's own resources each have their own state file, shrinks blast radius directly: an apply against one state file can only ever touch the resources tracked in that file. The real cost of splitting is that shared values (a VPC ID, a subnet list) now have to cross a boundary deliberately, through a remote-state data source or an explicit output passed as an input, instead of just being a local variable in the same module. That's a genuine tradeoff, not a free win: more files and more explicit wiring, in exchange for a mistake in one apply being contained to the resources that apply was actually meant to touch.

## 5\. Modules and the reuse tradeoff

A shared module (a "standard VPC," a "standard service") is attractive for the same reason any shared library is: write the pattern once, get consistency everywhere it's used. The cost that's easy to underweight is that a module used by fifty call sites turns every change to that module into a change with fifty potential blast radii, and a subtle bug or an unpinned provider version bump inside a widely used module can silently change behavior across every consumer the next time each of them runs a plan, on their own schedule, not the module author's.

Pinning module versions explicitly at each call site, rather than tracking a module's default branch, converts "the module changed under everyone at once" into "each consumer upgrades deliberately, reviews the diff for their specific use, and rolls back independently if it's wrong." That's slower to propagate a genuinely good change across every consumer, and it's the right tradeoff for the same reason pinning a third-party library's version in a dependency file is the right tradeoff: reviewable, revertible change beats invisible, simultaneous change for infrastructure that a mistake can take down.

## 6\. Worked example: splitting a monolithic root module

A team runs one Terraform root module covering their VPC, three services' compute and databases, and their shared DNS, all in a single state file, because that's how the repository started and nobody revisited it as the system grew. A junior engineer adding a new environment variable to one service runs `apply`, and a stale local plan (generated before someone else's unrelated change merged) reconciles a security group rule for a completely different service back to an old value, briefly breaking it. Nothing about the diff review flagged this, because the plan output for one giant state file is long enough that a reviewer's eyes go to the block that changed and not to the twelve blocks that show no changes at all.

The fix is splitting the root module along the boundaries that actually have independent blast radius: a `network` state file for the VPC and DNS that changes rarely, and one state file per service for its compute and database, each apply now able to touch only the resources for that one service. Shared values (VPC ID, subnet IDs) move from local variables to remote-state data sources read from the network state. The next time someone adds an environment variable to one service, the plan for that change is short enough to actually read in full, and it structurally cannot touch a different service's resources, because they no longer live in the same file for a stray plan to reconcile against.

This pairs directly with [cloud cost optimization](/cloud-architecture/cloud-cost-optimization), which covers the rightsizing decisions IaC repositories are usually the mechanism for actually applying, and with [secrets management architecture](/cloud-architecture/secrets-management-architecture) for why a state file holding a plaintext credential is its own separate problem worth designing around.
