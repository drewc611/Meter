---
date: '2026-09-03'
category: tools
title: >-
  MBZUAI's IFM released six open models with full weights, data, and training
  logs
dek: >-
  K2 Horizon spans 0.9B to 375B parameters under Apache 2.0, and IFM is calling
  it the largest fully open model release in AI history -- a claim this site
  independently checked against Hugging Face's own published artifacts rather
  than taking on the strength of a single press release.
sources:
  - label: >-
      UAE's AI university introduces world's largest 'fully open' models — The
      National (Cody Combs)
    url: >-
      https://www.thenationalnews.com/future/technology/2026/09/03/mbzuai-k2-horizon-ai-open-model-uae/
  - label: >-
      K2 Horizon AI models: MBZUAI launches six open models — tbreak (Abbas
      Jaffar Ali)
    url: 'https://tbreak.com/mbzuai-k2-horizon-ai-models/'
  - label: IFM/K2-Horizon-375B-A23B — Hugging Face (official model card)
    url: 'https://huggingface.co/IFM/K2-Horizon-375B-A23B'
  - label: >-
      MBZUAI's IFM releases world's largest fully open AI model — Middle East AI
      News (Carrington Malin)
    url: 'https://www.middleeastainews.com/p/mbzuais-ifm-releases-worlds-largest'
---
The Institute of Foundation Models (IFM), part of Abu Dhabi's Mohamed bin Zayed University of Artificial Intelligence, released K2 Horizon on September 3, 2026: six models ranging from 0.9 billion to 375 billion parameters, all under the Apache 2.0 license. IFM is billing this, per multiple outlets' independent reporting on its own announcement, as the largest fully open model release in AI history -- and unlike a typical open-weights release, it says it published the pretraining datasets, training code, model configurations, and evaluation results alongside the weights themselves.

## Checking the claim against the actual artifacts

IFM's own press materials returned a blocked request on direct fetch, so this run verified the release independently: Hugging Face's IFM organization page lists the full K2 Horizon model family plus several published datasets -- including TxT360-v2 for pretraining, and separate math- and code-reasoning datasets -- confirming that training data, not just weights, is genuinely public. The flagship 375B-A23B model's own card is more measured than the marketing framing, however: as of this run, it describes the final weights as released now, with intermediate checkpoints and training code still described as forthcoming rather than already live -- a real gap between the release's stated ambition and what's verifiably downloadable for the largest model specifically, worth noting rather than glossing over.

## The technical claim worth flagging separately

IFM also claims a technique it calls diffusion distillation -- pairing a frozen autoregressive model with lightweight adapters that generate blocks of tokens in parallel -- delivers roughly a 3x inference speedup with no loss in output quality, per Middle East AI News's direct reporting on IFM's release. That's IFM's own characterization of its own architecture, not an independently benchmarked result this run could verify directly, and should be read the same way as any other lab's self-reported efficiency number.

The largest-fully-open-release superlative is IFM's own claim, not an independently adjudicated fact, and no source this run found offers a rigorous methodology for ranking open releases against each other. What is independently verifiable is that IFM published more of its actual research pipeline than most labs do, training data and methodology included, and that transparency is the part with real value to a company evaluating whether to self-host an open-weight model instead of paying for API access: the more of a model's actual construction is checkable, the easier it is to reason about what you're actually running, cost and behavior both, rather than trusting a vendor's word for it.
