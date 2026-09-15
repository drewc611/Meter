---
date: '2026-09-15'
category: research
title: 'Sakana AI splits its Fugu model in two -- one built for cost, one for peak performance'
dek: >-
  Fugu Max and Fugu Ultra v2, released September 11, route each request across
  a pool of open-weight and specialized models rather than relying on one
  frontier model, undercutting Sonnet 5 and GPT-5.6 Terra on price.
sources:
  - label: 'Introducing Fugu Max and Fugu Ultra v2: Orchestrating the Pareto Frontier — Sakana AI (official)'
    url: 'https://sakana.ai/fugu-max-release/'
---
Sakana AI released Fugu Max and Fugu Ultra v2 on September 11, splitting its Fugu orchestrator line into two variants that optimize for different ends of the cost-performance curve. Neither is a single trained model in the conventional sense: both are orchestration systems that take one API request and route the underlying work across a pool of open-weight and specialized models -- including Nvidia's Nemotron -- stitching the results back into one answer.

## Two models, two jobs

Fugu Max is the cost-efficiency variant, priced at $2 per million input tokens and $6 per million output tokens -- 40 to 60% cheaper on output than Anthropic's Sonnet 5, GPT-5.6 Terra, and Kimi K3, according to Sakana's own comparison. The company says it posts the best score on six benchmarks including Terminal Bench 2.1 and SWEFish, and expands the cost-performance Pareto frontier on seven of ten benchmarks tested. Fugu Ultra v2, at $5 input / $30 output per million tokens, draws on a deeper expert pool aimed at complex reasoning, autonomous research, and software engineering, posting best or joint-best scores on five of eight benchmarks -- including 48.3 on the visual-reasoning benchmark Chartography and 74.3 on DeepSWE.

## The pool doesn't include the current frontier leaders

The detail worth noting is what's not in Fugu Ultra v2's model pool: Sakana's own release specifically excludes Claude Fable 5, Fable 5.1, and GPT-6-Astra -- the current frontier flagships -- from the set of models Fugu routes work to. The pitch is architectural independence rather than parity with any single lab's best model: swappable components instead of a dependency on one proprietary frontier system, which Sakana frames as both a cost lever and a hedge against export-control exposure on any one vendor's chips or weights.
