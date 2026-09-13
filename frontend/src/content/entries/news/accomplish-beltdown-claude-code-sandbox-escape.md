---
date: '2026-09-11'
category: research
title: 'Researchers show a booby-trapped repo could escape Claude Code''s sandbox with no prompt'
dek: >-
  Accomplish disclosed "Beltdown," a chain of git config quirks that let an
  untrusted repository run commands outside Claude Code's macOS sandbox --
  and says Anthropic took roughly 50 days and 30 releases to fully fix it.
sources:
  - label: 'Beltdown: Escaping the Claude Code sandbox — Accomplish (official)'
    url: 'https://www.accomplish.ai/blog/beltdown-escaping-the-claude-code-sandbox/'
  - label: >-
      Claude Code, Codex, And Cursor Have Leaky Sandbox Problems You Don't
      Hear About — Upstarts Media (Alex Konrad)
    url: 'https://www.upstartsmedia.com/p/accomplish-claims-leaky-sandboxes-in-claude-codex-cursor'
---
Stealth security startup Accomplish published a disclosure on September 11, 2026 for a vulnerability it calls "Beltdown": opening an untrusted repository in Claude Code could let that repo execute commands on the user's Mac outside the tool's sandbox, without triggering a permission prompt. Principal security researcher Oren Yomtov, who wrote the disclosure, described the result plainly -- a command from the repo ran "outside the sandbox, with no permission prompt." Accomplish reported the bug to Anthropic on July 13, 2026; a partial hardening shipped August 6 in version 2.1.223 that Accomplish says was still incomplete, and a full fix didn't land until version 2.1.247 on August 26.

## How the chain works

Beltdown isn't one bug but five stacked together: git's `core.fsmonitor` setting can be configured to execute an arbitrary shell command during routine repository operations; Claude Code runs git commands outside its own sandboxed Bash tool, unlike other commands it executes; a `git ls-files` call the harness runs wasn't hardened against that config option; nested `.git` folders can be created and renamed to dodge protections that only checked root-level `.git` directories; and the coding agent's skill auto-loading feature triggers the kind of automatic file-index refresh that touches off the whole chain. Anthropic's eventual fix blanks the `core.fsmonitor` setting on every git command Claude Code runs.

## A pattern across vendors, not a one-off

Accomplish's disclosure was one of three -- it also flagged sandbox-escape issues in OpenAI's Codex and in Cursor. Reporter Alex Konrad's account of the disclosures, at Upstarts Media, says Cursor and OpenAI shipped fixes in about a week each, against the roughly 50 days and 30 releases Accomplish says it took Anthropic to close Beltdown out completely. Accomplish co-founder Or Hiltch argues the gap matters beyond this one bug: if frontier labs' own models are as capable as the labs claim, he asks, why aren't those models catching critical vulnerabilities like this one in the labs' own coding-agent products before outside researchers do.
