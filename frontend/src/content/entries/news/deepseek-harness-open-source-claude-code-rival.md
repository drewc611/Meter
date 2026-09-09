---
date: '2026-08-13'
category: tools
title: >-
  DeepSeek open-sourced its own coding-agent harness the same day it raised API
  prices
dek: >-
  dsh treats every part of a coding agent -- model calls, tools, sessions, the
  interface -- as a swappable plugin, pitched as a free, inspectable alternative
  to Claude Code; DeepSeek shipped it alongside a new peak/off-peak pricing
  scheme that raises V4-Pro and V4-Flash rates.
sources:
  - label: >-
      DeepSeek Harness developer preview: Everything is a plugin — DeepSeek
      (official)
    url: 'https://deepseek.com/harness/en/'
  - label: >-
      DeepSeek Harness launches as open source rival to Claude Code, alongside
      V4-Pro on API with higher prices — VentureBeat (Carl Franzen)
    url: >-
      https://venturebeat.com/technology/deepseek-harness-launches-as-open-source-rival-to-claude-code-alongside-v4-pro-on-api-with-higher-prices
---
On August 13, 2026, DeepSeek released DeepSeek Harness -- "dsh" -- an MIT-licensed, open-source agent harness in developer preview, the same day it pushed DeepSeek V4-Pro live on its API. A harness is the runtime layer that sits between a model and the outside world: the part that lets an agent read and edit files, call a shell, keep a session going, and hand off to subagents. DeepSeek's own description of the design philosophy is blunt: "Everything is a plugin" -- the interface, tool calls, and agent loop are all built on a plugin kernel called Cordis, so any piece can be swapped, disabled, or replaced without touching the rest of the system. The release also includes an append-only event log so a session's actions can be replayed or audited after the fact, and it ships with four preset runtime modes (Standard, Code, Minimal, and Creator).

VentureBeat's own coverage, filed the same day, put the launch-day numbers at roughly 27,500 GitHub stars and 2,000 forks -- and framed it directly as "an open source rival to Claude Code," the category Anthropic's own coding-agent product has led. Several other outlets and trade blogs have since reported far larger cumulative totals -- upward of 170,000 stars within the first week -- but this run could not independently confirm those later figures through a bylined source with the same rigor as VentureBeat's launch-day count, so they're noted here as widely repeated rather than verified.
