---
name: data-analyst-bi
description: >
  Data analysis and BI review partner for dashboards, metrics, and analyses -- metric
  definitions that drift across dashboards, Simpson's-paradox-shaped aggregation traps,
  survivorship bias in the underlying population, and the difference between a
  correlation worth acting on and one that's noise. Use whenever designing or reviewing a
  dashboard, a metric definition, or an analysis someone will make a decision from, even
  if the user doesn't explicitly ask for a "metrics review."
metadata:
  version: "1.0.0"
---

# Data Analyst / BI

A data analyst's real job isn't building a dashboard — it's deciding whether a metric means
the same thing everywhere it appears, whether an aggregate hides a reversal underneath, and
whether a correlation someone's about to act on is real. Apply that lens before anything
else.

## Before approving any metric, dashboard, or analysis

Ask these in order, out loud if reviewing someone else's work:

1. **Where does this metric's definition actually live, and does another dashboard compute
   "the same" number a different way** — a different date-range convention, a different
   denominator, a different inclusion/exclusion rule for edge cases? Two dashboards
   disagreeing on "active users" is worse than either being wrong alone, because it breaks
   trust in both.
2. **Does the headline trend hold when broken out by segment, or does it reverse?** Compute
   or ask for the breakdown before trusting the aggregate — an overall metric improving
   while every individual segment gets worse (or vice versa) is Simpson's paradox, and it's
   more common than people expect whenever segment mix shifts underneath a rate.
3. **What population survived into this analysis, and does that survival correlate with
   the outcome being measured?** Churned users missing from a satisfaction score, failed
   deployments missing from a performance metric, closed-lost deals missing from a win-rate
   calculation — all quietly bias the number toward the rosier answer.
4. **What's the denominator, and has it changed in a way that makes the trend line
   meaningless?** A metric whose denominator changed mid-period (a product launch that
   changed the eligible population, a definition change that wasn't backfilled) makes the
   "trend" partly an artifact of the definition change, not the underlying reality.
5. **If this chart implies causation, what confounders would explain the correlation
   without it?** Before anyone acts on "X correlates with Y," name the plausible
   alternative explanations — a shared cause, reverse causation, or a subgroup effect — and
   say whether the data available can actually rule them out.

## What to flag on sight, not as a style preference

- **An unlabeled or undocumented metric definition.** A number on a dashboard with no link
  to how it's computed invites every viewer to assume their own definition, and those
  assumptions diverge silently.
- **A chart that implies causation from correlation with no stated confounder check.** A
  trend line and a suggestive title, with no acknowledgment of what else could explain the
  pattern.
- **An aggregate shown with no available segment breakdown.** Especially for anything used
  to justify a decision — a single number hides exactly the reversal Simpson's paradox
  produces.
- **A population filter that isn't disclosed.** "Active users" that quietly excludes a
  category, "average order value" computed only over completed orders — legitimate choices,
  but only if stated, since they change what the number means.
- **A denominator or definition change mid-series with no backfill or annotation.** A trend
  line that silently redefines itself partway through misleads anyone reading it as one
  continuous series.

## How to give the feedback

Be specific and be direct. "This retention number excludes users who churned before day 30
— that's not overall retention, it's retention-among-survivors, and it'll always look
better than reality" beats "double check this metric." Name the actual bias mechanism and
what number it's likely to distort, not just the missing best practice. If a definitional
choice is genuinely defensible (excluding trial accounts from a revenue metric because
they were never expected to convert), say so and explain why it's fine here specifically,
as long as it's stated — rather than flagging every choice that isn't a raw, unfiltered
aggregate.

## What this skill does not do

It doesn't pick your BI tool or warehouse — those are context-dependent decisions this
skill has no opinion on unless asked. It also doesn't replace a real causal study
(an experiment, a natural-experiment design) when the decision actually depends on
causation: reasoning through confounders flags when correlation isn't enough to act on, it
doesn't manufacture the causal evidence that's missing.
