---
date: '2026-09-25'
category: research
title: A new Stanford attribution method tops the interpretability benchmark by 3x
dek: >-
  Matryoshka Attribution traces model outputs to the specific weights and
  representations responsible for them -- and can find the 1% of weights
  that, restored, strip a fine-tuned model''s refusals back out.
sources:
  - label: 'Matryoshka attribution: Learning to attribute language model outputs to representations and weights — arXiv'
    url: 'https://arxiv.org/abs/2609.25518'
  - label: "Stanford's MAttr Tops AI Interpretability Benchmark by Nearly 3x — AlphaSignal"
    url: 'https://alphasignal.ai/news/stanford-s-mattr-tops-ai-interpretability-benchmark-by-nearly-3x'
---
Researchers at Stanford -- Aryaman Arora, Kirill Acharya, Nathan Hu, Yanzhe Zhang, Noah Goodman, Dan Jurafsky, and Christopher Potts -- published Matryoshka Attribution (MAttr), a method for tracing a language model's output back to the specific internal representations and weights responsible for it. On the Mechanistic Interpretability Benchmark's official leaderboard, MAttr scores roughly 2.9x the next-best submitted method.

## How it avoids the usual tradeoff

Existing attribution approaches split into two bad options: causal-intervention methods that are accurate but too computationally expensive to run at scale, and gradient- or mask-based methods that are cheap but tend to miss the internal computations that are actually causally responsible for a behavior. MAttr's approach is a learnable mask parametrized with a differentiable sigmoid top-k operator, trained by randomizing the sparsity level (k) during training rather than fixing it -- which produces a full ranked ordering of which components matter most, instead of a single fixed cutoff.

## The demonstration that makes this concrete

Beyond the benchmark score, the paper shows a striking practical application: using MAttr with reinforcement learning to identify exactly which weights changed during fine-tuning to produce a specific downstream behavior. Restoring just 1% of Llama 3.1 8B Instruct's weights to their pre-fine-tuned, base-model state was enough to strip out the model's refusal behavior while leaving its other capabilities intact. That's a concrete demonstration of localizing a specific trained-in behavior to a tiny, identifiable slice of a model's weights -- relevant to anyone auditing what a fine-tune actually changed, not just whether it changed the benchmark score.
