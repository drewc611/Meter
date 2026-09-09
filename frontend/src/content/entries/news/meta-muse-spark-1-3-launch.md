---
date: '2026-09-02'
category: product
title: Meta says Muse Spark 1.3 finally closes the gap with Claude and GPT
dek: >-
  The new model uses about 25% fewer tokens than its predecessor on the same
  tasks, and an independent benchmark now ranks it just behind Claude Fable 5.1
  and Opus 5 -- though Meta still won't say whether it will open-source the
  weights.
sources:
  - label: Introducing Muse Spark 1.3 — Meta AI Research
    url: 'https://research.meta.ai/blog/introducing-muse-spark-1-3'
  - label: >-
      Meta says it has caught up with Anthropic and OpenAI after releasing Muse
      Spark 1.3, its most powerful LLM so far — SiliconANGLE
    url: >-
      https://siliconangle.com/2026/09/02/meta-says-it-has-caught-up-with-anthropic-and-openai-after-releasing-muse-spark-1-3-its-most-powerful-llm-so-far/
---
Meta released Muse Spark 1.3 on September 2, 2026, the latest version of its flagship model line, available immediately through the Meta Model API and Muse Code, Meta's terminal coding agent, on macOS and Linux. Per Meta's own announcement, the model is built for longer-horizon agentic work: sustaining multiple workflows in a single thread, asking for clarification on ambiguous prompts, and confirming before taking consequential actions rather than just acting.

## Efficiency as the headline, not just capability

Meta's own benchmark claim is specific and testable: roughly 20% fewer tool calls and 25% fewer tokens than Muse Spark 1.2 on the same agent, coding, instruction-following, and long-context evaluations, benchmarked directly against 1.2 alongside GPT-5.6 Sol and Opus 5 (max). Meta also lists safety changes alongside the capability bump -- stronger adversarial robustness, better resistance to prompt injection, and improved calibration on irreversible actions -- rather than treating those as separate from the performance story.

SiliconANGLE's Mike Wheatley reports that Artificial Analysis, an independent evaluator, scored the model 62 on its Intelligence Index -- placing it behind only Claude Fable 5.1 and Claude Opus 5, ahead of everything else in the field. Meta Chief AI Officer Alexandr Wang told Bloomberg the model is "competitive" with Fable 5.1 and "better than" GPT-5.6 Sol specifically at code generation, and said developers using the Muse Spark family are already burning through "trillions of tokens per week."

Pricing is unchanged from 1.2. Meta has not said whether it will release the model's weights, a notable silence given the company's earlier open-source framing for the Muse and Llama lines -- SiliconANGLE's reporting flags this explicitly rather than assuming continuity with past practice.

The efficiency framing -- fewer tokens and tool calls for the same task, not just a higher benchmark score -- is the more interesting number here than the leaderboard position. A model that does the same job for less compute is a real cost signal, the kind Merit AC's own spend tracking is built to separate from raw capability marketing.
