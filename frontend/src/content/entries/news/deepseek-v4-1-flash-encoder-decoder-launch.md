---
date: '2026-09-10'
category: tools
title: 'DeepSeek ships V4.1 Flash, a 552-billion-parameter model built around a
  split encoder-decoder design'
dek: >-
  The new architecture activates only 8 billion parameters on input and 16
  billion on output, and adds native image understanding DeepSeek's prior
  Flash models didn't have.
sources:
  - label: 'Introducing DeepSeek-V4.1-Flash — DeepSeek (official product page)'
    url: 'https://www.deepseek.com/en/news/deepseek-v4-1-flash/'
  - label: 'DeepSeek API change log — DeepSeek (official developer docs)'
    url: 'https://api-docs.deepseek.com/updates/'
  - label: 'deepseek-ai/DeepSeek-V4.1-Flash — Hugging Face (model card)'
    url: 'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash'
---
DeepSeek released DeepSeek-V4.1-Flash on September 10, describing it as "the smallest model in our new architecture family, with native multimodal visual understanding." The model is a 552-billion-parameter Mixture-of-Experts system built on what DeepSeek calls a Causal Encoder-Decoder design -- summarized in the company's own tagline for the release: "Asymmetric architecture. More intelligence, less cost." It's live now on the DeepSeek API under the identifier `deepseek-flash`.

## What the asymmetric design changes

Where DeepSeek's earlier models used a single uniform stack of transformer layers, V4.1-Flash splits its 40 layers into a 20-layer causal encoder and a 20-layer decoder, and only activates 8 billion parameters per token while processing input against 16 billion while generating output. DeepSeek says this cuts KV-cache storage to a quarter of the previous generation's footprint in HBM and an eighth in SSD, which mainly pays off in agentic and retrieval-heavy workloads that feed the model long input contexts relative to what it outputs -- the model supports contexts up to 1 million tokens. Native multimodal support means it processes images and text through the same architecture rather than bolting on a separate vision encoder, a change from DeepSeek's prior Flash line.

## The rollout is also a pricing and retirement move

The release doubles as a phase-out plan for older models: V4-Flash and V4-Flash-Vision-Exp are deprecated immediately, with their API endpoints temporarily redirected to V4.1-Flash for compatibility, and DeepSeek says V4-Pro requests will begin routing to V4.1-Flash pricing starting September 14. DeepSeek had originally planned to end V4-Pro API support entirely on that date but is now continuing it in response to user demand, with billing unchanged in the meantime. For developers already building against DeepSeek's API, the practical effect is that the cheaper, newer architecture becomes the default path forward whether or not they update their model identifier.
