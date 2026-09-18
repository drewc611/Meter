---
date: '2026-09-17'
category: tools
title: A Caltech spinout compressed a 27B model to 5.9GB and kept 98% of its benchmark score
dek: >-
  PrismML's Bonsai 2 shrinks Alibaba's open-weight Qwen3.8 27B by 9-10x so it
  runs on a laptop or phone -- a bet that most enterprise AI spend is buying
  more model than the task actually needs.
sources:
  - label: >-
      PrismML hopes its tiny LLM will change how we all use AI — TechCrunch
      (Julie Bort)
    url: 'https://techcrunch.com/2026/09/17/prismml-hopes-its-tiny-llm-could-change-how-we-all-use-ai/'
---
PrismML, an AI lab founded by Caltech researchers, released Bonsai 2 27B on September 17 -- a compressed version of Alibaba's open-weight Qwen3.8 27B that shrinks the model 9-10x down to 5.9GB while matching 98% of its aggregate benchmark score, TechCrunch reported. That's up from the original Bonsai, released in March, which matched 95% of its source model's performance. The company says the two Bonsai releases combined have been downloaded more than 11 million and 2.6 million times respectively.

## Compression, not a new model

PrismML doesn't train foundation models from scratch; it takes an existing open-weight model and compresses it, aiming to preserve as much of the source model's intelligence as possible in a fraction of the footprint. The company is led by Caltech professor Babak Hassibi, who specializes in compression techniques, with Databricks co-founder and UC Berkeley Sky Computing Lab director Ion Stoica advising. "There is more room to be able to compress them without losing the intelligence," Hassibi told TechCrunch, arguing the technique scales to even larger source models. PrismML has raised a $22.25 million seed round from Khosla Ventures, Cerberus Capital, and Caltech.

## The case for smaller models, made in benchmark points

A model that fits in 5.9GB runs locally on a laptop or phone instead of a per-token API call to a hosted frontier model -- eliminating both the network round-trip and the ongoing inference bill for tasks that don't need frontier-level reasoning. The claim that matters here isn't the compression ratio, it's the retained-score number: 98% of Qwen3.8 27B's benchmark performance is the whole argument that this isn't a degraded, cut-rate substitute. For a company evaluating whether every AI workload actually needs a frontier model's price tag, a credible, independently-downloadable compression pipeline is exactly the kind of alternative worth pressure-testing against real tasks, not just the benchmarks it shipped with.
