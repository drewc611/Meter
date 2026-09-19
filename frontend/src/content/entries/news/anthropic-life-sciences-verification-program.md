---
date: '2026-09-17'
category: product
title: 'Anthropic loosens Claude''s biosafety limits -- but only for verified researchers'
dek: >-
  The Life Sciences Verification Program trades Claude''s default
  biology-related blocks for credential checks and after-the-fact
  monitoring, developed in coordination with the US government, with a
  higher-risk tier that removes those blocks entirely.
sources:
  - label: 'Introducing the Life Sciences Verification Program — Anthropic (official)'
    url: 'https://www.anthropic.com/news/life-sciences-verification-program'
---
Anthropic launched the Life Sciences Verification Program (LSVP) on September 17, an invite-only track that gives vetted biology researchers and institutions access to Claude models -- including Claude Mythos, Opus, and Sonnet -- with the model's default biosafety guardrails relaxed specifically for their work. Applicants are reviewed on "research credentials, security standards, and ethical research oversight" before being granted access, and the program initially targets teams and institutions rather than individual accounts, with Anthropic saying it plans to extend it to individual Pro and Max plans later.

## Two tiers, and a real tradeoff between them

The program splits into Standard Use, which removes biology-specific blocks while keeping other safeguards like cyber-related classifiers intact, and High-risk Use, which "removes all safeguards that block life sciences requests" for specific projects that clear additional vetting. For both tiers, Anthropic is also changing how it watches for misuse: rather than blocking flagged requests in real time, monitoring shifts to offline pattern analysis, with 30 days of data retention for anything flagged. Anthropic says it's working with the US government specifically to expand High-risk access to Claude Mythos beyond the currently limited set of entities.

## Access control instead of a blanket wall

This is Anthropic making an explicit bet that a verified-identity gate is a better tool than a blanket capability block for the specific case of legitimate biology research, which has always been the hardest case for AI safety filters -- the same knowledge that helps a vaccine researcher can help someone with worse intentions, and a hard block frustrates the former to stop the latter. "Dozens of organizations" have joined during early access, and Anthropic says it expects to enroll "hundreds of organizations" in the first week of the broader rollout. For any life-sciences organization already paying for Claude, this is a real product change worth checking against internal usage -- not just a policy footnote -- since it changes what the model will and won't do for a verified account.
