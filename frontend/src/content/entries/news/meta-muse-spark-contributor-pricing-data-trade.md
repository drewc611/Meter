---
date: '2026-09-03'
category: product
title: 'Meta will cut your AI bill 95% if you let it train on everything you send'
dek: >-
  A "Contributor" tier for Muse Spark drops standard token pricing from
  $1.25/$4.25 per million to 10 and 20 cents -- in exchange for every
  prompt and output feeding Meta's next model, and a rate limit cut to
  a thirtieth of the standard plan.
sources:
  - label: >-
      Meta is paying to peek at how you use their latest AI model —
      TechCrunch (Tim Fernholz)
    url: 'https://techcrunch.com/2026/09/03/meta-is-paying-to-peek-at-how-you-use-their-latest-ai-model/'
  - label: >-
      Meta cuts Muse Spark prices up to 21x for developers who hand over
      their prompts — Cryptopolitan (Randa Moses)
    url: 'https://www.cryptopolitan.com/meta-cuts-muse-spark-prices-21x/'
---
Meta has introduced a two-tier pricing structure for Muse Spark, its coding and agent model, that makes the trade-off between price and data privacy explicit rather than implicit. TechCrunch's Tim Fernholz reported on September 3, 2026 that Meta's standard rate is $1.25 per million input tokens and $4.25 per million output tokens; under the new "Contributor" tier, those same tokens cost 10 cents and 20 cents respectively -- roughly a 95% discount -- in exchange for every prompt and model output a developer sends being used to train Meta's future models. Cached-token pricing drops even further, from $0.15 to $0.002 per million, a figure Cryptopolitan's Randa Moses independently confirmed at a "75x reduction."

## The catch that isn't in the discount

The price cut isn't the only difference between the two tiers. Contributor-tier access caps requests at 100 per minute, against 3,000 per minute on the standard plan -- a 30x throughput cut that Moses notes limits the tier to prototyping and low-volume experimentation rather than production workloads. That framing lines up with how Meta's own pricing documentation describes the tier, quoted by Fernholz: it "lowers the barrier to entry for prototyping, testing integrations, and scaling experiments."

## Why Meta needs this data specifically

Meta has struggled to source the kind of real coding-agent interaction data that improves agentic performance. Both outlets note the same recent context: an internal initiative to track employees' own computer usage for training data, launched earlier in 2026, drew enough internal criticism that Meta paused it in June. The Contributor tier is a different approach to the same underlying problem -- instead of monitoring people who didn't opt in, it prices the opt-in explicitly and lets developers choose it workload by workload. Meta declined to comment on the new pricing model when TechCrunch asked.

## The bill this doesn't show up on

Every major lab already trains on some tier of user data by default and treats not doing so as the premium option a privacy-conscious customer pays for. Meta's Contributor tier inverts that: opting into training is now the discount, not the default, and the discount is large enough -- 95% on tokens most developers already pay for constantly -- that the actual cost of choosing privacy becomes visible on a rate card instead of buried in a policy document nobody reads before clicking accept. For any organization tracking what its AI spend actually buys, that's a real trade-off to price deliberately, not a checkbox to leave on the default setting.
