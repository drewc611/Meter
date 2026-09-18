---
date: '2026-09-17'
category: tools
title: GitHub gives Copilot admins a way to unblock stuck developers -- and a dashboard to see which features actually stick
dek: >-
  Two back-to-back changelog entries add self-service budget-increase
  requests for Business and Enterprise plans, plus 28-day per-feature
  engagement data in the Copilot impact dashboard -- one fixes a spend
  friction point, the other measures whether that spend is doing anything.
sources:
  - label: 'Copilot budget increase requests are generally available — GitHub Changelog (official)'
    url: 'https://github.blog/changelog/2026-09-16-copilot-budget-increase-requests-are-generally-available/'
  - label: 'Copilot impact dashboard now shows feature engagement — GitHub Changelog (official)'
    url: 'https://github.blog/changelog/2026-09-17-copilot-impact-dashboard-now-shows-feature-engagement'
---
GitHub shipped two Copilot administration features a day apart in mid-September, and together they cover both ends of the enterprise-spend problem: what happens when a developer runs out of AI credits, and how an admin knows if the credits being spent are worth it. The first, published September 16, makes budget-increase requests generally available on Copilot Business and Enterprise plans under usage-based billing. Previously, a member who exhausted their allotted AI credits was simply blocked from credit-consuming Copilot features until an admin manually raised their limit. Now they can request more the moment they hit the wall, and the request routes automatically to whoever owns that budget -- an organization or an enterprise -- where an owner, admin, or billing manager can approve, adjust, or deny it without leaving their settings.

## A dashboard built to answer "is anyone actually using this"

The second release, out September 17, adds per-feature engagement data to the Copilot impact dashboard: how many active users engaged with each of seven feature areas -- code completion, agent edits, passive and active code review, cloud agent, CLI, and the Copilot app -- on at least two days in a rolling 28-day window. That's a meaningfully different question than the dashboard's existing adoption-phase view, which only reported who was active at all. GitHub's own framing is explicit about the intent: enterprise leaders can now "see which Copilot features are becoming part of developers' regular workflows and focus training or configuration changes where adoption is lower." The data lives in aggregate enterprise and organization reports via the usage metrics API, gated behind ownership roles or a custom "View Copilot Metrics" permission.

## Why it matters

Neither feature is a flashy model release, but both attack the exact gap this site exists to track: an org can now see not just what it's spending on Copilot, but which specific capability that spend is buying developer attention for, and it can unblock a legitimately productive user without waiting on a support ticket. A seat that's licensed but shows engagement in zero of the seven feature buckets is a much cleaner signal of wasted spend than an aggregate "active user" count ever was -- and a team that only ever triggers code completion, never agent edits or code review, is a different ROI story than one using Copilot end to end.
