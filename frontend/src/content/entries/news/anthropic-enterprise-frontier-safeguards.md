---
date: '2026-09-01'
category: product
title: Anthropic scraps its Claude data-retention mandate after enterprise pushback
dek: >-
  Enterprise Frontier Safeguards moves activity logs into a customer's own cloud
  account, under the customer's own encryption keys -- replacing a June policy
  that bank security chiefs and other big customers objected to.
sources:
  - label: Developing Enterprise Frontier Safeguards with our customers — Anthropic
    url: 'https://www.anthropic.com/news/enterprise-frontier-safeguards'
  - label: >-
      Anthropic Revises Enterprise Data Retention Policy After Customer Pushback
      — PYMNTS
    url: >-
      https://www.pymnts.com/news/artificial-intelligence/2026/anthropic-revises-enterprise-data-retention-policy-after-customer-pushback/
---
On September 1, 2026, Anthropic announced Enterprise Frontier Safeguards (EFS), a replacement for the mandatory 30-day activity-log retention policy it had required since June on Claude Fable 5 and Mythos 5-class models, adopted for cybersecurity and misuse-defense purposes. EFS keeps the misuse-detection goal but changes where the data lives: in the customer's own cloud account, under the customer's own encryption keys, not on Anthropic's servers.

The system has three parts, per Anthropic's own announcement: automated monitoring that sends misuse signals directly to a customer's security team, storage of the underlying activity data inside the customer's cloud account, and a review step that is fully automated -- no Anthropic staff view the logs. Anthropic says it won't charge for EFS itself; customers still pay their cloud provider for the storage and data transfer. The controls apply across Claude Code, Claude Enterprise, and the Claude Platform, and reach customers who access Claude through Amazon Bedrock, Google's Agent Platform, or Microsoft Foundry. Rollout is phased, starting later this fall.

## Built with the banks it upset

Anthropic says EFS was developed with more than 100 customers across financial services, healthcare, manufacturing, telecom, law, retail, and the public sector, including the Analysis and Resilience Center for Systemic Risk (ARC) -- a group whose members include the chief information security officers of Goldman Sachs, Morgan Stanley, Citi, Bank of America, and Wells Fargo. Wells Fargo CISO Munish Kumar Sharma is quoted in Anthropic's own announcement: EFS "gives us exactly what we asked for: our logs stay in a Wells-managed environment under Wells-managed keys."

PYMNTS' own reporting frames this plainly as a reversal under pressure: the June retention rule is what drove the pushback that produced EFS in the first place. Anthropic's Kate Jensen, head of Americas, told PYMNTS the company spent "hundreds of hours" working with customers on the alternative -- effort that only exists because the original policy didn't survive contact with the customers it was meant to reassure.

This is a small, concrete instance of a bigger governance question: a vendor's stated safety rationale (retaining logs to catch misuse) collided with enterprise customers' own compliance requirements (data sovereignty, key control), and it took a public walk-back to resolve. That's the same tension Merit AC exists to make visible on the spend side -- whether AI deployed inside a company is actually governed, or just adopted and hoped for.
