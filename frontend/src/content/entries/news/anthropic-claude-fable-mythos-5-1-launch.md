---
date: '2026-09-01'
category: product
title: >-
  Anthropic splits its flagship model into public Claude Fable 5.1 and gated
  Claude Mythos 5.1
dek: >-
  Same underlying model, two safeguard regimes: Fable 5.1 is generally available
  with a 75% cut to cache-read pricing and 60% fewer cybersecurity false
  positives, while Mythos 5.1's looser guardrails are restricted to vetted
  cybersecurity and life-sciences partners.
sources:
  - label: Introducing Claude Fable 5.1 and Claude Mythos 5.1 — Anthropic (official)
    url: 'https://www.anthropic.com/claude-fable-and-mythos-5-1'
  - label: >-
      Anthropic's new Fable release is cheaper, less restrictive — TechCrunch
      (Russell Brandom)
    url: >-
      https://techcrunch.com/2026/09/01/anthropics-new-fable-release-is-cheaper-less-restrictive/
---
Anthropic released two versions of its newest model on September 1, 2026: Claude Fable 5.1, generally available to everyone, and Claude Mythos 5.1, the identical underlying model running with looser safety guardrails, restricted to vetted partners through two new programs -- one for cybersecurity defense, one for life-sciences research done in partnership with the US government.

## Cheaper and less trigger-happy

Fable 5.1 cuts cache-read pricing 75%, to $0.25 per million tokens, bringing typical-workload costs down about 25% and highly agentic workloads down as much as 45%, per Anthropic's own numbers. The company also says its updated cybersecurity safeguards block 60% fewer false positives than before, and Claude Code sessions specifically see about 60% fewer safeguard interventions per session -- a direct answer to a complaint that's dogged safety-tuned models generally: flagging legitimate work as often as real misuse isn't actually safer, just more annoying.

## What the gate buys, and what it doesn't

Mythos 5.1's Cyber and Life Sciences Verification Programs let vetted defenders and researchers get real answers to questions Fable would hedge on -- discovering vulnerabilities rather than just describing them defensively, for instance. Anthropic is also rolling out "Enterprise Frontier Safeguards" starting this fall, letting eligible customers run the model on their own cloud infrastructure with data never touching Anthropic's servers, and the company told TechCrunch plainly: "Anthropic has never trained on enterprise data without explicit permission, and never will."

The Fable/Mythos split is Anthropic making an admission most vendors leave implicit: the same model can be simultaneously too restrictive for some legitimate users and not restrictive enough to hand to everyone. Merit AC's own quality-proxy scoring runs into a version of that same tension constantly -- a safeguard tuned to catch the worst misuse ends up flagging a lot of ordinary, valuable work along the way, and the cost of that false-positive rate rarely shows up on an invoice even though it's a real tax on the people trying to get work done.
