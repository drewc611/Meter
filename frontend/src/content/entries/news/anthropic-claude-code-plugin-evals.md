---
date: '2026-09-11'
category: tools
title: Claude Code adds a formal testing framework for its own plugins and skills
dek: >-
  The new claude plugin eval command scores a plugin against realistic
  prompts with six grader types, compares the result to a no-plugin baseline,
  and can gate CI on the score.
sources:
  - label: Test plugins with evals — Claude Code Docs (official)
    url: 'https://code.claude.com/docs/en/plugin-evals'
---
Anthropic shipped `claude plugin eval` in Claude Code 2.1.269, released September 11, 2026, giving plugin and skill authors a built-in way to test whether their plugin actually changes Claude's behavior for the better. Each eval case pairs a realistic prompt with one or more graders -- a regex over the reply, whether a specific tool got called, or a rubric a second model judges against -- and `claude plugin eval init` can propose and write an initial suite by asking the author what a good result looks like. Of the six grader types, four (regex, tool_used, tool_order, file_exists) are computed straight from the transcript at no cost, while two, `llm` and `baseline`, call a judge model and bill against the account running them.

## The point of running every case twice

By default, every case runs three times with the plugin loaded and three times without it, producing a `WITH` and `W/OUT` score. As Anthropic's own documentation puts it, "A high score on its own doesn't tell you the plugin helped" -- Claude might do just as well unassisted, so the gap between the two, labeled Δ, is what actually gets attributed to the plugin. A skill whose natural-language description doesn't reliably trigger it shows up as a near-zero Δ with the `tool_used` grader failing, rather than looking like a pass because the underlying model handled the request on its own.

## Aimed at CI, not just one-off debugging

The same command runs unchanged in CI, letting a team gate a plugin or skill change on whether its eval score holds or regresses -- the same discipline unit tests bring to application code, applied to a layer (prompts and skill descriptions) that's historically shipped without any automated check at all. For any team building internal Claude Code plugins at scale, it's a direct answer to whether a prompt change actually helped, or just felt like it should have.
