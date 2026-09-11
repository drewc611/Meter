---
date: '2026-09-10'
category: research
title: Anthropic publishes hard numbers on how well its own models can guide drone strikes and geolocate people
dek: >-
  A new Frontier Red Team report finds Opus 5 hit an 80% terminal-guidance
  success rate against parked vehicles in simulation, and out-geolocates
  champion GeoGuessr players -- published as a safety disclosure alongside
  new misuse-detection classifiers, not a warning to avoid.
sources:
  - label: >-
      Measuring tactical intelligence targeting and conventional weapons
      capabilities of AI models — Anthropic (official)
    url: >-
      https://www.anthropic.com/research/intelligence-targeting-conventional-weapons-capabilities
---
Anthropic's Frontier Red Team published a capability-evaluation report on September 10, 2026, measuring how well current models perform at intelligence targeting and simulated weapons guidance -- not documenting real-world misuse, but testing what the models are technically capable of if misused. On photo geolocation, Anthropic's Mythos Preview model reached a 37.0 km median error, more precise than the top 0.01% of human GeoGuessr players (151 km median error). In a simulated drone-guidance environment, Opus 5 hit an 80% terminal-guidance success rate against a parked, high-visibility vehicle, dropping to 47% against a moving target and near zero against camouflaged or evasive targets; in a payload-delivery test against a moving target in wind, Opus 5 succeeded 28% of the time.

## Why Anthropic published this itself

Anthropic's own framing is explicit that this is a disclosure, not a leak: the report states the evaluations show why "on-platform safety measures are necessary." Anthropic paired the report with new classifiers built to detect and block weapons-development requests, while acknowledging directly that the classifiers will be imperfect -- treating this as mitigation to iterate on, not a solved problem.

## What this means without overstating it

These are simulation results under controlled test conditions, not evidence of real drone strikes or real surveillance campaigns -- and Anthropic doesn't prohibit military use of Claude outright, it's built detection tooling instead. For enterprise buyers, the relevant fact isn't the specific percentages, it's that a frontier lab is now quantifying its own models' dual-use capability publicly and building mitigations in response, which is a different governance posture than either ignoring the question or claiming the risk doesn't exist.
