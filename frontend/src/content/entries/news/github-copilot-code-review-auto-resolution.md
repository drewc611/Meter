---
date: '2026-09-11'
category: tools
title: GitHub Copilot's code review now closes its own comment threads and grades harder
dek: >-
  Comments now auto-resolve when a follow-up commit addresses them, and
  Copilot's lower-effort review tier switched to multiple agents voting on
  one review -- a change GitHub says raised how often high-severity findings
  actually get fixed.
sources:
  - label: >-
      Auto-resolution and analysis updates in Copilot code review — GitHub
      Changelog (official)
    url: >-
      https://github.blog/changelog/2026-09-11-auto-resolution-and-analysis-updates-in-copilot-code-review/
---
GitHub said on September 11, 2026 that Copilot's pull-request code review now automatically resolves its own comment threads once a subsequent commit addresses the feedback, keeping open threads limited to what's still unresolved. The same update adds contextual, change-specific commit message suggestions in place of generic auto-filled text, and moves the "Lite" review effort level onto an ensemble of multiple agents instead of a single one. Per GitHub's own changelog, "Each agent contributes its own perspective on the code" before Copilot merges their findings into one review.

## What the ensemble actually bought

GitHub's changelog attributes concrete gains to the new backend: the average number of addressed comments per review rose 47% for high-severity findings, 31% for medium, and 11% for low, while review cost fell by about 8%. The review process now also draws on a broader set of shell tools -- including running builds and tests -- to validate its own findings before surfacing them, rather than relying purely on static reading of the diff.

## Why "addressed" is the number to watch

A comment getting auto-resolved isn't the same as a bug getting fixed -- it just means a later commit changed something the thread was about. GitHub's own framing ties the ensemble change to more high-severity findings actually getting acted on, not just more comments getting posted, which is the harder number to move and the one worth checking against a team's own defect data before crediting the feature. For engineering leaders already weighing Copilot's review against Cursor's BugBot or Claude Code's review tooling, addressed-comment rate by severity is a more useful yardstick than review volume alone.
