---
date: '2026-09-10'
category: tools
title: GitHub Copilot adds a Jira canvas and lets its CLI pick its own model
dek: >-
  The September 7 weekly release folds Jira issues into a shared planning
  canvas in the Copilot app, adds an experimental model router to Copilot
  CLI, and gives VS Code the ability to schedule its own recurring agent
  tasks.
sources:
  - label: 'GitHub Copilot weekly releases — September 7 — GitHub Changelog (official)'
    url: 'https://github.blog/changelog/2026-09-10-github-copilot-weekly-releases-september-7/'
---
GitHub's September 7 weekly release moves Copilot further into the planning stage of work, not just the coding stage. The Copilot app now lets users "bring Jira issues into a shared canvas, choose what moves forward" before handing the selected work to Copilot to carry through investigation, implementation, and pull request preparation -- collapsing the usual handoff between a ticket in Jira and a branch in GitHub into one surface.

## The CLI picks its own model

Copilot CLI's new Project HydraFusion, shipped to `/experimental`, is a semantic router rather than a model: per GitHub's changelog, it "delivers automated semantic routing between local, cloud, and compound models," choosing per-task between them to balance performance, cost, and latency instead of leaving that choice to whoever typed the command. It sits alongside Copilot CLI's existing model picker rather than replacing it.

## VS Code stops waiting to be asked

VS Code 1.137 adds three capabilities in the same release: scheduling recurring Copilot agent tasks (hourly, daily, weekly, or on-demand) in public preview, an experimental voice mode for talking to Copilot instead of typing, and the ability to review a linked issue's or pull request's details directly inside the Agents window without opening the underlying repository.

Taken together, the release is about reducing how often a developer has to leave one tool to feed context into another -- the kind of friction that shows up as adoption drag rather than a line item, but that determines whether a Copilot seat gets used for real work or sits mostly idle.
