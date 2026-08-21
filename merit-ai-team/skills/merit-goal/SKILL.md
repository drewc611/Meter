---
name: merit-goal
description: >
  Tracks Merit's active goals — currently two, kept fully separate and never
  averaged into one score. Use this whenever checking what the team is
  actually working toward, updating progress against a goal, or proposing a
  new one. Depends on merit-context for the three-site-arm background.
metadata:
  version: "0.1.0"
  last_verified: "2026-08-21"
---

# Merit goals

Two goals, tracked independently in `merit-ai-team/docs/merit-content-goal.md`
(the content goal's log) and inline below (the design-partner goal, since it
predates this file's log). Do not average them, do not roll one into the
other's progress number, and do not report a single blended "on track"
verdict across both — `merit-ceo-brief` reports them as two separate lines for
exactly this reason.

## Goal 1 — design partners (existing)

```
Outcome: 10 design partners
Deadline: [not confirmed in this session — the number "10" is the one fact
           carried forward reliably; verify the deadline and the exact
           counting rule with Andrew before reporting a percentage against it]
Measure:  [same caveat — confirm what counts: signed agreement? active usage?
           a call booked? don't assume]
Status:   ACTIVE
```

## Goal 2 — content (new, PROPOSED)

```
Outcome: [needs Andrew's input — e.g. "X challenge signups" or
          "Y published prompts + Z challenge conversions"]
Deadline: [needs Andrew's input]
Measure:  [needs Andrew's input — post count? paid conversions? traffic?]
Status:   PROPOSED — do not treat as active, do not report progress against
          it, until Andrew confirms outcome/deadline/measure.
```

This goal exists because the site now has a content/education arm (`/guides`,
`/prompts`, `/challenge`) that is not a sub-goal of the design-partner goal —
see `merit-context`. Do not fill in the blanks above with a plausible-sounding
number; leaving them blank and flagged PROPOSED is the correct state until
Andrew answers.

## When updating this file or the content-goal log

- A goal moves from PROPOSED to ACTIVE only when Andrew has explicitly given
  outcome, deadline, and measure — not when a skill infers reasonable-sounding
  defaults.
- Progress updates for Goal 2 go in
  `merit-ai-team/docs/merit-content-goal.md`, dated, one entry per update:

```
## [date]
Status: [number/state]
Source: [where this number came from — a specific file, count, or dashboard,
         never "estimated"]
```

- If a progress number can't be traced to a real source (an actual count in
  `merit-content-log.md`, a dashboard figure, a signed agreement), don't
  record it — that's an invented number, against `merit-context`'s standing
  rails.
- Goal 1's progress is whatever Andrew reports directly (design-partner
  conversations aren't something this team can observe on its own); don't
  infer it from site traffic or waitlist signups.
