---
date: '2026-09-16'
category: product
title: 'Merit AC adds a progress checklist to its 30-day prompt challenge'
dek: >-
  A checkbox layered over each day tile on /prompts, plus a live "N of 30
  days checked off" counter -- localStorage only, no backend change, aimed
  at giving a visitor a reason to come back and actually finish the archive.
sources:
  - label: 'Add a per-day progress checklist to the prompt archive — Merit AC (GitHub PR #140)'
    url: 'https://github.com/drewc611/Meter/pull/140'
---
Merit AC shipped a per-day progress checklist on its 30-day prompt archive on September 16, 2026. Each day tile on `/prompts` now carries a checkbox alongside its existing link, and a progress line above the grid -- "N of 30 days checked off" -- updates live as boxes are checked. State persists in the browser via `localStorage`; there's no account, no server round-trip, no new endpoint.

## A proposal that sat unbuilt for a week

The feature had been flagged twice in the team's own internal tracking -- first in a growth log, then carried into an executive brief's list of decisions owed -- as the one proposal that plausibly moves the actual conversion measure behind the site's content and challenge goal: a visitor who can see their own progress has a reason to come back and finish, and finishing the archive is the precondition for ever reaching the paid-track call to action at the end of it.

## A real bug the build caught

The first pass added padding to keep wrapped title text clear of the new checkbox, using a selector whose specificity lost to the grid's own base tile rule -- silently, with no build error, just title text sitting under the checkbox on longer day titles. It was caught by actually looking at a rendered screenshot rather than trusting a green build, and fixed by matching the base rule's specificity.
