---
title: 'IAM architecture: roles, federation, and workload identity'
description: >-
  The mechanics of cloud identity and access management — RBAC vs. ABAC,
  federation, workload identity, and cross-account access — underneath the
  broader zero-trust philosophy.
kicker: Guide · cloud architecture
lead: >-
  Zero trust, treated on its own, is a philosophy: verify explicitly, assume
  breach, grant least privilege. Identity and access management is the actual
  machinery that philosophy runs on, and most of what goes wrong in practice
  is not a failure to believe in least privilege, it's a policy written too
  broadly, a credential that outlived the job it was created for, or a role
  nobody remembers granting.
wide: true
tileMeta: 'RBAC vs. ABAC, federation, and workload identity instead of long-lived keys'
---
## 1\. What a policy actually encodes

An IAM policy is, mechanically, a decision function: given a principal (who or what is asking), an action (what they want to do), and a resource (what they want to do it to), does the system allow it. Every cloud provider's IAM model reduces to some version of that triple, and almost every real-world access problem, an over-broad grant, a confused deputy, a credential doing more than the job it was issued for, traces back to one of the three being defined more loosely than the actual need required: a principal representing more than the one workload that needs the access, an action granted as a wildcard instead of the specific calls actually used, or a resource scope covering more than the one object or prefix the job touches.

## 2\. RBAC vs. ABAC

Role-based access control assigns permissions to a role, then assigns principals to roles: an "analyst" role gets read access to a reporting dataset, and every analyst is a member of that role. This is simple to reason about and simple to audit, because the question "what can this person do" reduces to "what roles are they in, and what do those roles grant," and it scales well when the org's actual access needs cluster into a manageable number of distinct roles.

Attribute-based access control evaluates a policy against attributes of the principal, the resource, and the request context at the moment of the request, rather than a fixed role membership: a policy might allow access if the requesting principal's department attribute matches the resource's department tag, and deny it otherwise, with no explicit role ever enumerated. ABAC handles cases RBAC handles awkwardly, permissions that genuinely depend on a relationship between principal and resource rather than a fixed category, at the cost of being harder to audit: answering "what can this person do" now requires evaluating the policy logic against their current attributes rather than reading a role membership list. Most real systems end up using both: RBAC for the coarse, stable groupings (this team, this service), ABAC-style conditions layered on top for the finer-grained, contextual restrictions (only during business hours, only from resources tagged for this project) that a fixed role can't cleanly express.

## 3\. Federation: the identity provider as the source of truth

Federation means authentication happens once, against a single identity provider (an organization's SSO, typically speaking SAML or OIDC), and every downstream system trusts an assertion from that provider instead of maintaining its own separate set of usernames and passwords. The architectural payoff is that offboarding becomes a single action: disabling a person's account at the identity provider revokes their access everywhere federation was actually wired up correctly, instead of requiring someone to remember and manually disable a separate account in every individual system the person had access to.

The failure mode that undermines this is a system that was supposed to be federated but has a local, non-federated account left over from before the migration, or an emergency break-glass account created once and never revisited. Every one of those is an access path that offboarding at the identity provider doesn't touch, and an org that believes its offboarding is centralized because most systems are federated, without auditing for what isn't, is carrying a real gap between the belief and the actual state.

## 4\. Workload identity instead of long-lived credentials

A static access key, generated once and embedded in a config file, an environment variable, or worse, committed into source control, is a credential with no natural expiry and no built-in way to prove it's being used by the workload it was actually issued for. It works exactly as well in the hands of whoever finds it as it does in the hands of the service it was meant for, which is the whole problem: possession of the key is the only check.

Workload identity replaces that with a mechanism where the cloud platform itself vouches for what's making the request, an instance role attached to a compute resource, a Kubernetes service account bound to a cloud IAM role via a workload identity federation setup, a CI job's identity established through short-lived, automatically issued credentials tied to that specific job run. None of these credentials are things a person copies into a config file and forgets about; they're issued automatically, scoped to the specific workload, and typically expire on their own within hours, which means a leaked one is a much smaller, much shorter window of exposure than a static key that, once leaked, remains valid until someone notices and manually rotates it.

## 5\. Cross-account and cross-project access

A multi-account or multi-project setup, common practice specifically because it limits blast radius by keeping production, staging, and different business units in genuinely separate account boundaries, still needs a defined way for one account to reach into another when there's a legitimate reason to. The standard pattern is an assume-role mechanism: a principal in account A is granted permission to assume a specific role in account B, receiving short-lived, scoped credentials for exactly that role's permissions, rather than account B issuing account A a standing credential of its own.

The design discipline worth naming explicitly is that the role being assumed should be scoped to the specific cross-account job, not a broad administrative role reused for convenience across every cross-account need an organization has. A single, widely reused cross-account admin role turns every system that's ever granted permission to assume it into an equally privileged path into the target account, and an audit of "what can reach into our production account" then has to account for every one of those paths, not just the one the role was originally created for.

## 6\. Policy as code, and the same drift problem infrastructure has

IAM policies attached through a console, one-off, the same way an infrastructure resource can be clicked into existence outside of code, drift from whatever's declared in a repository the same way any other cloud resource does, and policy drift is a worse category of drift than most, because the gap it creates is specifically a gap in who can access what, not just a gap in what's running. Managing IAM policy through the same infrastructure-as-code pipeline as everything else, reviewed, diffed, and applied through the same process, closes the same gap [infrastructure as code](/cloud-architecture/infrastructure-as-code-architecture) closes for compute and network resources, and for the same reason: a change nobody can see coming through a diff is a change nobody caught in review.

A periodic access review, independent of the policy-as-code pipeline, is still worth keeping as a second layer, because policy-as-code catches drift from what's declared, not the separate problem of a policy that was correctly declared, correctly reviewed, and simply never revisited after the job it was granted for ended.

## 7\. Worked example: retiring a static key

A data pipeline job running on a scheduled compute instance has, for years, authenticated to a cloud storage bucket using an access key generated once and stored in the job's configuration. The key has broader permissions than the job actually uses, because it was copied from an earlier, more general-purpose script and nobody trimmed it down once the job's real scope narrowed. Nobody currently on the team knows exactly when it was created or whether it's been rotated since.

The fix replaces the static key with an instance role, or the equivalent managed identity for whichever platform the job runs on, scoped to exactly the read and write actions on exactly the one bucket prefix the job actually touches, granted through the account's normal IAM-as-code pipeline rather than through a console click. The job's code changes only in how it authenticates (using the platform's default credential chain instead of an embedded key); the access itself becomes automatically short-lived, automatically tied to the specific instance running the job, and visible in the same policy review that covers every other resource's permissions, instead of being a credential nobody currently on the team can fully account for.

This pairs directly with [secrets management architecture](/cloud-architecture/secrets-management-architecture) for the broader question of how any credential, not just an IAM key, should be issued and rotated, and with [cloud security architecture: shared responsibility and zero trust](/cloud-architecture/cloud-security-architecture-zero-trust) for the philosophy this mechanism exists to actually enforce.
