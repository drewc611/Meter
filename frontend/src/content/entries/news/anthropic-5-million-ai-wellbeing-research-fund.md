---
date: '2026-08-25'
category: funding
title: >-
  Anthropic is paying outside researchers to grade AI's effect on user
  wellbeing, and says it won't direct the work
dek: >-
  The $5 million fund gives clinicians, psychologists, and methodologists money,
  Claude access, and technical support to build open-source wellbeing
  evaluations -- with a September 21 application deadline and a hard requirement
  that findings publish regardless of what they show.
sources:
  - label: >-
      Funding better evaluations of AI's impact on wellbeing — Anthropic
      (official)
    url: 'https://www.anthropic.com/news/wellbeing-research-grants'
  - label: Anthropic Launches $5M Grant Program for AI Well-Being Research — TUN
    url: >-
      https://www.tun.com/home/anthropic-launches-5m-grant-program-for-ai-well-being-research/
---
Anthropic announced a $5 million research-grant fund on August 25, 2026, aimed at independent researchers building open-source evaluations and benchmarks for how AI affects the people who use it. Grantees get direct funding, access to Claude models, and technical support -- and, per Anthropic, work "fully independently," with every output required to publish as an open-source project regardless of what it finds.

## Who this is actually aimed at

The program explicitly targets clinicians, psychologists, and methodologists, not just ML engineers -- an acknowledgment that measuring whether a model's output is good for a person's psychological state isn't a benchmark problem the way math or code correctness is. Anthropic frames the gap directly: AI systems "can serve as sources of emotional support during difficult times," and existing evaluation suites mostly aren't built to catch when that support is inappropriate for the specific person receiving it. Initial applications are due September 21; applicants selected from that pool submit full proposals by October 5.

## Why the independence clause is the actual story

This is close kin to the problem this site's own Tier 2 quality-proxy scoring exists to approximate: a number for "is this output actually good," not just "was it produced." The wellbeing question is a harder version of the same thing -- there's no compiler to check against, no test suite that passes or fails. Funding outside researchers to build that evaluation, publish it regardless of outcome, and explicitly disclaiming any right to steer the findings is a real attempt at the kind of ground truth a vendor can't credibly produce about itself. Whether the resulting evaluations hold up is a question for whenever they actually publish -- but the funding structure itself is the part worth other labs copying, independent of what this specific cohort finds.
