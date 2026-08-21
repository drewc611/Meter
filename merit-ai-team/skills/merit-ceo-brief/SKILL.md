---
name: merit-ceo-brief
description: >
  Weekly synthesis for Andrew — rolls up merit-goal, merit-growth,
  merit-eng-review, and merit-infra-check into one brief. Use this to produce
  or update the CEO brief; it reports two separate goal lines, never one
  blended score. Depends on merit-context and the other four skills' logs
  under merit-ai-team/docs/; writes to merit-ai-team/docs/merit-exec-brief.md.
metadata:
  version: "0.1.0"
  last_verified: "2026-08-21"
---

# Merit CEO brief

Weekly synthesis of what the other five skills produced, written for Andrew.
The point is a fast, honest read: what moved, what didn't, what's blocked, and
what needs his decision — not a status report that papers over gaps.

## Before writing it

Read the current contents of, in order: `merit-ai-team/docs/merit-content-goal.md`,
`merit-ai-team/docs/merit-growth-log.md` + `merit-content-log.md`,
`merit-ai-team/docs/merit-eng-log.md`, `merit-ai-team/docs/merit-infra-log.md`,
and this skill's own Goal 1 section in `skills/merit-goal/SKILL.md`. The brief
is a synthesis of those, not a fresh guess at the state of things.

## Structure

Append each week's brief as a new dated section in
`merit-ai-team/docs/merit-exec-brief.md`:

```
## [date]

### Goal 1 — design partners
[status from merit-goal, with source for any number cited]

### Goal 2 — content
[status from merit-goal — if still PROPOSED, say so plainly: "not yet an
active goal, still waiting on outcome/deadline/measure from Andrew" rather
than reporting progress against a placeholder]

### Growth / content produced this week
[from merit-growth's content log — real counts, e.g. "3 prompts drafted, 1
judge-passed, 0 shipped" — never a rounded-up or estimated number]

### Engineering
[from merit-eng-review — defects found, fixed, or explicitly not-yet-reviewed
because the surface doesn't exist yet]

### Infra
[from merit-infra-check — any route that 404s, misses headers, or isn't
indexable; lead with what changed since last week]

### Decisions needed from you
[the open-decisions list from merit-context, only the ones still unresolved]
```

## The one rule this skill exists to enforce

**Two goal lines, two measures — never averaged, never blended into one
score.** Goal 1 (design partners) and Goal 2 (content) measure different
things for different reasons (see `merit-context`); a single blended
"progress: 60%" across both would be meaningless and would hide whichever
goal is actually behind. If a template or a prior habit tries to combine
them, don't — report them side by side instead.

## When Goal 2 is still PROPOSED

Don't skip the goal-2 section — say explicitly that it's blocked on Andrew's
input, and repeat exactly what's needed (outcome, deadline, measure) so it's
one copy-paste answer away from being resolved, rather than requiring him to
go dig up the original ask.
