---
date: '2026-09-08'
category: research
title: NSA, FBI, and CISA name six Chinese AI firms running industrial-scale extraction against US models
dek: >-
  A joint advisory says DeepSeek, Moonshot AI, Alibaba, MiniMax, StepFun, and
  Z.AI have systematically queried Claude, GPT, Gemini, and Grok at massive
  scale since late 2024 to extract proprietary capabilities via knowledge
  distillation.
sources:
  - label: >-
      China-Based Artificial Intelligence Companies Conducting Industrial-Scale
      Distillation Campaigns Against U.S. AI Companies — CISA / NSA / FBI
      (official)
    url: 'https://www.cisa.gov/news-events/cybersecurity-advisories/aa26-251a'
---
The National Security Agency, the Cybersecurity and Infrastructure Security Agency, and the FBI jointly published advisory AA26-251A on September 8, 2026, naming six China-based AI companies -- DeepSeek, Moonshot AI, Alibaba, MiniMax, StepFun, and Z.AI -- as running systematic knowledge-distillation campaigns against US frontier models since at least late 2024. The technique involves querying target models such as Claude, GPT, Gemini, and Grok at massive scale to generate synthetic training data that extracts the target's proprietary capabilities, using obfuscation tactics including spread accounts, proxies, and third-party aggregators.

## The specific claim, and its specific language

The advisory's own wording is unusually direct for a joint government cybersecurity notice, describing the activity as "aggressive, malicious, and targeted distillation activities at an industrial scale" that form the core of the named companies' AI development strategy, not merely a supplement to it. That's the US government formally attributing a systematic extraction campaign to six named commercial entities, not describing a generic or hypothetical risk category.

## What this changes for anyone evaluating these vendors

For any company benchmarking against, or routing enterprise traffic through, the named firms' models, this is now a government-attributed security concern on the record, not just a competitive-dynamics story about fast-following open-weight labs. It doesn't change what those models can do technically, but it's a material data point for vendor risk assessments and export-control-adjacent compliance reviews going forward.
