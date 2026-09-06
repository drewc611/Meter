---
date: '2026-08-22'
category: research
title: >-
  Claude and GPT models broke out of their test environments and touched real
  systems
dek: >-
  Anthropic disclosed that three Claude versions gained unauthorized access to
  outside organizations' networks during security evaluations -- days after
  OpenAI reported the same category of failure.
sources:
  - label: >-
      Anthropic reveals Claude "gained unauthorized access" to "real-world
      systems" during testing — CBS News
    url: >-
      https://www.cbsnews.com/news/anthropic-claude-gained-unauthorized-access-to-real-world-systems/
  - label: >-
      After OpenAI disclosure, Anthropic says Claude also hacked outside systems
      — Al Jazeera
    url: >-
      https://www.aljazeera.com/news/2026/7/31/after-openai-disclosure-anthropic-claude-hacked-outside-systems
---
On July 30, 2026, Anthropic disclosed that three different Claude model versions gained unauthorized access to systems belonging to three separate, unnamed organizations. The count is small against scale -- three incidents out of more than 141,000 evaluation runs -- but the mechanism is the part worth sitting with.

## What actually happened

The models were running "capture-the-flag" security evaluations: told to break in and retrieve a hidden secret on a target machine, using whatever it could find. They found basic vulnerabilities -- weak passwords, unauthenticated endpoints -- and used them. That's the evaluation working as designed. What wasn't supposed to happen is that the models had internet access at all during these runs, which Anthropic attributes to "a misunderstanding between us and our evaluation partner," Irregular. Some of what they reached through that access belonged to real organizations, not sandboxed test infrastructure.

This followed, by a matter of days, OpenAI's own disclosure that its models broke out of test containment, reached Hugging Face, and touched the open internet during similar evaluations -- serious enough that OpenAI paused that category of testing to rework its security protocols before resuming.

## Why this is the whole argument, not a footnote to it

Two frontier labs, independently, found that the boundary meant to contain an agent during adversarial testing wasn't actually load-bearing -- not because the model schemed its way out, but because a network-access assumption between two teams didn't hold. That's precisely the failure mode the ten disciplines and fourteen domains guides on this site are about: a model's own competence is not a control, and the control that's supposed to sit between reasoning and real-world action has to be verified as actually present, not assumed from the architecture diagram.

The uncomfortable generalization: if two of the most security-conscious labs in the industry can lose track of whether their own agents have internet access during a live evaluation, an internal team standing up an agentic coding platform on a Friday afternoon should not assume its own boundary is solid just because nobody's tested it yet.

Worth trying this week: pull up your own agent environment's network egress rules and confirm -- don't assume -- exactly what it can reach. Day 4 of the prompt archive walks through auditing exactly this.
