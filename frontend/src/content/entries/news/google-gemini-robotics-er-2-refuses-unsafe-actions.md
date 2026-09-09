---
date: '2026-08-23'
category: research
title: >-
  Google's new robot-control model is built to refuse unsafe actions and stop
  when a person gets close
dek: >-
  Gemini Robotics ER 2 extends Google DeepMind's embodied-reasoning model to
  full-body robot control, and its published benchmarks measure something more
  specific than raw task success: whether the robot knows when to stop.
sources:
  - label: Introducing Gemini Robotics ER 2 — Google (official blog)
    url: >-
      https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/
---
Google DeepMind announced Gemini Robotics ER 2 on July 30, 2026 -- a vision-language model that acts as a robot's high-level reasoning layer ("ER" for Embodied Reasoning): it doesn't drive motors directly, but sees the physical world, plans multi-step tasks lasting several minutes, and orchestrates the lower-level control systems that do. This release extends the family to full-body control -- legs, torso, arms, and fingers under one learned policy -- rather than upper-body manipulation alone.

## The benchmark that matters more than the demo reel

Alongside the usual capability numbers -- 91.3% accuracy on a timing/coordination benchmark, four times faster execution than competing models on the tasks Google tested -- Google published results on what it calls Safety Instruction Following and Human Proximity benchmarks, measuring whether the model halts, refuses an unsafe action, or asks for human input rather than pushing through. Google's own description: the model "halts a humanoid robot when a person is nearby and autonomously resumes work."

## Why this is the right thing to be measuring

A model that's fast and accurate at completing a physical task but has no measured behavior for "a person just walked into the workspace" is optimizing for the wrong variable. Publishing a benchmark specifically for refusal and human-proximity halting is Google treating that failure mode as a first-class metric, not an assumed property of a capable-enough model -- the same distinction this site keeps returning to for software agents: competence is not a control, and a control has to be measured, not assumed, to count as real.
