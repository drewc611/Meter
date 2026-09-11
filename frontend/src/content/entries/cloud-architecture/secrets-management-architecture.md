---
title: Secrets management architecture
description: >-
  Why a secret sitting in an environment variable or a config file is a
  liability regardless of how it got there, and what a real secrets pipeline
  — dynamic issuance, rotation, and workload identity — replaces it with.
kicker: Guide · cloud architecture
lead: >-
  A secret checked into source control gets the attention, and it should, but
  it's not actually the common case in a reasonably careful team. The more
  common case is a secret that was never committed to anything, that just
  lives, correctly and deliberately, in an environment variable or a config
  file on a running instance, forever, because nothing in the system's design
  ever asked it to be anything shorter-lived than that.
wide: true
tileMeta: 'Dynamic issuance, rotation, and why a static credential is a liability by design'
---
## 1\. Why "not committed to git" isn't the bar

A database password passed to a service through an environment variable is not sitting in source control, and it's still a static, long-lived credential: anyone with access to the running process, its environment, a memory dump, a misconfigured logging pipeline that happens to capture environment variables on crash, or simply the deploy configuration itself, has the password, indefinitely, until someone manually rotates it. The actual property that matters isn't where a secret is stored at rest, it's how long it remains valid once it's been read by anything other than the system that was supposed to have it, and an environment variable that never expires has the same property whether it leaked from git or from a debug log: once it's out, it's out until someone notices and rotates it by hand.

## 2\. Centralized secrets stores

A dedicated secrets management system, HashiCorp Vault or a cloud provider's own secrets manager, exists to separate "where a secret is stored" from "how an application gets it," and to make the getting an auditable, access-controlled event rather than a value baked into a config file at deploy time. An application authenticates to the secrets store using its own workload identity (Section 3), requests the specific secret it needs at startup or at the point of use, and the store logs that request, who asked, for what, and when, which is the audit trail a config file with an embedded password has no equivalent of.

The distinction between static and dynamic secrets is where a secrets store earns its complexity rather than just relocating the same static-password problem behind a nicer API. A static secret, stored once and handed out unchanged on every request, is still a long-lived credential, just retrieved through a more auditable path than before. A dynamic secret is generated on demand, per requester, with a short lease: the secrets store itself creates a database credential valid for exactly the requesting application's use, expiring automatically after a bounded window, so a credential that leaks from one application's memory is worthless within hours rather than valid indefinitely.

## 3\. Access through workload identity, not a shared master credential

The system that gates access to secrets can't itself be gated by another static secret without simply moving the original problem one layer up: an application authenticating to the secrets store with a static API token has replaced one long-lived credential with another. The actual fix is authenticating to the secrets store the same way a workload authenticates to any other cloud resource, through workload identity: a cloud instance role, a Kubernetes service account bound to the platform's identity system, a CI job's automatically issued short-lived identity, none of which is a value a person copies into a config file, and all of which the platform itself vouches for rather than a credential proving it on its own. [IAM architecture](/cloud-architecture/iam-architecture-cloud) covers this mechanism in more depth; the point specific to secrets is that the door guarding every other secret shouldn't itself be guarded by the same kind of static credential the whole system exists to get rid of.

## 4\. Rotation, and why dynamic secrets are the real fix for it

Manual rotation, periodically generating a new credential and updating every place the old one was configured, is operationally painful in direct proportion to how many places a static secret got copied to, and the pain is exactly why rotation gets deferred or skipped in practice: a password shared across a dozen services and config files means twelve coordinated updates, none of which can lag behind the others without breaking something, for every single rotation.

Dynamic secrets sidestep this by making rotation the default behavior rather than a deliberate, coordinated event: because every credential already expires on a short lease and gets reissued automatically on the next request, there's no single long-lived value sitting in twelve places that a human has to remember to update in twelve places at once. Rotation, in a system built on dynamic secrets, isn't a scheduled maintenance task, it's just what happens continuously as leases expire and get renewed, which is the actual reason dynamic issuance is worth the added complexity of running a real secrets management system instead of a shared static password everyone agrees to rotate quarterly and rarely actually does.

## 5\. Secrets in CI/CD specifically

A CI/CD pipeline is a disproportionately common leak surface for secrets, for reasons that have nothing to do with carelessness: a pipeline routinely needs real credentials to deploy to real infrastructure, its logs are often more widely readable than production infrastructure itself, and a misconfigured job that echoes an environment variable for debugging, or a third-party action with more access than it needs, can expose a secret to a much wider audience than the credential was ever meant for. A secret injected into a pipeline as a long-lived, broadly scoped token, reused across every job because provisioning a separate one per job felt like unnecessary overhead, means a single leak from any one job's logs compromises everything that token could touch, not just the one job that leaked it.

The mitigation follows the same principle as everywhere else in this guide: scope tightly and prefer short-lived, workload-specific credentials over a shared long-lived one. Modern CI platforms increasingly support OIDC-based federation directly with a cloud provider, letting a pipeline job request short-lived, narrowly scoped cloud credentials at run time rather than storing a static cloud key as a pipeline secret at all, which removes the static credential from the leak surface entirely rather than trying to keep it well-guarded once it exists.

## 6\. Encryption at rest and envelope encryption

A secrets store's own storage still has to be encrypted at rest, and the standard pattern for doing this well is envelope encryption: each individual secret is encrypted with its own data key, and that data key is itself encrypted by a separate, centrally managed key (typically held in a cloud key management service or a hardware security module) rather than every secret being encrypted directly by one master key shared across the entire store. The benefit is that compromising a single data key exposes only the one secret it protects, and rotating the top-level key that protects all the data keys doesn't require re-encrypting every individual secret, only re-wrapping the data keys, which is a much smaller and faster operation.

This is worth naming because "the secrets store encrypts everything" is true of both a well-designed envelope-encrypted store and a poorly designed one with a single flat encryption key covering everything, and the two have very different blast radii if the encryption layer itself is ever compromised.

## 7\. Worked example: from an embedded password to dynamic credentials

A backend service authenticates to its database using a password stored in an environment variable, set once at deploy time and unchanged for over a year, because nobody wanted to coordinate a rotation across the three other services and two scheduled jobs that share the same database credential. The password shows up, unredacted, in a debugging session's environment dump that gets pasted into an internal chat channel, and now an unknown number of people who were never meant to have database access do.

The fix moves the database credential into a secrets management system configured to issue dynamic, per-service database credentials with a short lease, each of the four consumers authenticating to the secrets store through its own workload identity rather than sharing one password. The immediate leaked credential is no longer relevant, since it was already scoped to that one debugging session's lease and has since expired; more importantly, the next time a credential leaks the same accidental way, it's valid for a bounded window measured in hours rather than indefinitely, and the audit log shows exactly which service's identity requested which credential and when, which the original shared environment variable had no way of recording at all.

This pairs with [IAM architecture](/cloud-architecture/iam-architecture-cloud) for the identity mechanism dynamic secrets are issued against, and with [infrastructure as code](/cloud-architecture/infrastructure-as-code-architecture) for why a state file itself, not just an application's runtime config, has to be treated as part of the same secrets exposure surface.
