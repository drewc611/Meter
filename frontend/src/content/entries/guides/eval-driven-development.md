---
title: 'Eval-driven development: building an evaluation pipeline for AI features'
description: >-
  A prompt change is a code change, and it deserves the same regression
  discipline — a golden dataset built from real examples, evals wired into
  the same review pipeline as code, and why the eval set itself needs
  ongoing maintenance.
kicker: Guide · systems engineering
lead: >-
  A test suite exists because nobody trusts "it looked right when I tried
  it" as a release gate for ordinary code, and a prompt or an agent's tool
  configuration is no less capable of silently regressing than a function is.
  Eval-driven development is the discipline of treating a change to an AI
  feature exactly like a code change deserves to be treated — with a
  regression suite that runs before the change ships, not after someone
  notices it broke something in production.
wide: true
group: systems-engineering
tileMeta: 'A regression suite for prompts and agent behavior, wired into the same pipeline as code'
---
## 1\. The gap this closes

[AI evaluation methods](/guides/ai-evaluation-methods) covers the mechanics of rubrics, LLM-as-judge, and benchmarks, how to actually measure whether a given output is good. Eval-driven development is about when and how those measurements get run: not as an occasional, manual spot-check someone does before a big release, but as a standing pipeline that runs automatically against every change to a prompt, a tool configuration, or a model version, the same way a test suite runs against every code change regardless of how confident the author is that this particular change is safe. The gap it closes is specifically the gap between "I tried it on a few examples and it looked fine" and "I ran it against a real, representative dataset and can see exactly what changed relative to before," which is the same gap a test suite closes for ordinary code, applied to a system whose correctness is harder to check by eye.

## 2\. A golden dataset, built from real examples

The dataset an eval suite runs against has to be made of real, representative inputs, actual past queries, actual documents the system has had to process, actual edge cases that showed up in production, not invented examples someone wrote up quickly to have something to test against. An invented dataset reflects what its author assumed the hard cases would look like, which is a much narrower and much less representative set than what real usage actually produces, and a system that passes cleanly against a hand-invented set can still fail badly against the actual distribution of inputs it sees once it's live, because the invented set never included the genuinely weird, ambiguous, or edge-case-heavy inputs real usage reliably surfaces.

Building the dataset from logged production inputs, sampled to cover both the common case and the tail of unusual ones, and labeled with a correct or acceptable answer (by a human reviewer, ideally someone with real domain expertise in what "correct" means for this specific system) gives the eval suite something that actually reflects what the system has to handle, and it's worth treating this dataset-building step as a real, ongoing engineering task, not a one-time bootstrap exercise done once before launch and never revisited.

## 3\. Wiring evals into the same pipeline as code review

The practice that makes this discipline actually stick, rather than being a good intention that erodes under deadline pressure, is triggering the eval run automatically on the same event that triggers code review: a prompt change, a system-prompt edit, a tool-schema update, or a model version bump submitted as a pull request runs the eval suite the same way a code change runs the test suite, with the results visible to reviewers before the change merges, not run manually and informally by whoever happens to remember to check.

This has a real, useful side effect beyond just catching regressions: it makes a prompt change reviewable the way a code change is reviewable, since a reviewer can see not just the diff to the prompt text but the diff to the eval suite's output, which is a much more concrete basis for approving or pushing back on a change than reading a prompt's new wording and guessing whether it'll behave as intended across the range of inputs the system actually has to handle.

## 4\. Regression detection: compare to baseline, not to an absolute bar

An eval score in isolation, "this prompt scores 82 on the rubric," tells you less than it seems to, because without a baseline to compare against, 82 could represent a meaningful improvement or a real regression depending entirely on what the previous version scored. The useful comparison is always relative: does this change's eval run score better, worse, or the same as the previous version's eval run, against the exact same dataset, and specifically, which individual examples flipped from passing to failing, or vice versa, rather than only looking at the aggregate number moving.

That per-example view matters because an aggregate score can stay flat while masking a real regression: a change that fixes five previously-failing examples while breaking five different previously-passing ones nets to the same aggregate score as no change at all, and a reviewer looking only at the top-line number would approve a change that actually traded one class of correctness for another, possibly a worse trade if the newly broken examples matter more than the newly fixed ones. Surfacing the specific examples that changed status, not just the aggregate delta, is what lets a reviewer make that judgment instead of it being invisible inside a flat average.

## 5\. The eval set itself decays

A golden dataset built from production traffic at one point in time reflects that point in time, and production drifts: user behavior changes, the product adds features that shift what a "typical" input looks like, an upstream data source changes format. An eval set that was genuinely representative a year ago can quietly stop being representative of current real usage without anyone deciding that on purpose, the same way a monitoring dashboard's alert thresholds, tuned once against an old baseline, silently stop making sense once the system's normal behavior has moved.

The discipline this implies is treating the eval set's own maintenance as a recurring task with an owner, periodically re-sampling from current production traffic, checking whether the existing labeled examples still reflect what "correct" means for the system as it's evolved, and retiring examples that no longer represent a case the system genuinely needs to handle well. An eval suite that's rock-solid against a stale dataset gives false confidence, passing cleanly on a distribution of inputs the system barely encounters anymore while the actual current failure modes go completely unmeasured.

## 6\. Human review as an ongoing part of the loop, not a bootstrap step

The instinct to treat human labeling as a one-time cost, label the initial dataset once, then run the automated eval suite indefinitely without further human involvement, misses that the automated eval suite itself, especially the LLM-as-judge portion [AI evaluation methods](/guides/ai-evaluation-methods) covers, needs periodic human spot-checking of its own judgments to catch drift in what the judge considers acceptable, the same calibration risk that section covers for judge models generally. A human reviewer periodically sampling a subset of the automated eval's verdicts, not to relabel the whole dataset again but to confirm the automated scoring still agrees with genuine human judgment on a meaningful sample, is what keeps an eval-driven pipeline actually trustworthy over time rather than silently drifting into measuring something subtly different from what it was originally built to measure.

## 7\. Worked example: a change that passed manual review and failed the eval suite

A team updates a support bot's system prompt to handle a newly added product category, phrased in a way that reads correctly on a handful of manual spot-checks the author tried before opening a pull request. The eval suite, run automatically against the pull request, surfaces a regression the manual spot-check missed entirely: several previously-passing examples involving a different, older product category now fail, because the new prompt's added instructions for the new category inadvertently shifted how the model interprets an ambiguous phrase that also appears in the older category's typical queries, a specific interaction the handful of manual test cases never happened to include.

Without the eval suite, this would have shipped, and the regression would have surfaced later as a real production issue, harder to trace back to this specific prompt change once other changes had shipped on top of it in the meantime. With the eval suite wired into the same review pipeline as the code change, the regression is visible in the pull request itself, specific to the exact examples that flipped from passing to failing, giving the author a concrete, reproducible case to fix the prompt against, rather than a vague report days later that something about support quality for an unrelated category seemed to have gotten worse.

This pairs with [AI evaluation methods](/guides/ai-evaluation-methods) for the actual measurement techniques an eval pipeline runs, and with [context engineering](/guides/context-engineering) for why a prompt or context-structure change is exactly the kind of edit whose effects are hardest to fully predict by reading the diff alone, which is the real argument for running it against a real dataset instead of trusting a read-through.
