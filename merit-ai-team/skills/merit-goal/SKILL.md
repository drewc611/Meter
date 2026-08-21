---
name: merit-goal
description: Tracks Merit's active goals — currently two, kept fully separate. Use this whenever a skill or Andrew needs to check what the team is actually working toward, update progress against a goal, or propose a new one. Never blend multiple goals into a single number.
---

# Merit goals

Two goals, tracked independently. Do not average them, do not roll one into the
other's progress number, and do not report a single blended "on track" verdict across
both — `merit-ceo-brief` reports them as two separate lines for exactly this reason.

## Goal 1 — design partners (existing)

```
Outcome: 10 design partners
Deadline: [not available in this session — carried over as a fact from the handoff,
           original deadline/measure text not provided; confirm with Andrew rather
           than trusting this file's memory of it]
Measure:  [same caveat — confirm the original counting rule (signed agreement? active
           usage? something else) before reporting progress against it]
Status:   ACTIVE
```

## Goal 2 — content (new, PROPOSED)

```
Outcome: [needs Andrew's input — e.g. "X challenge signups" or
          "Y published prompts + Z challenge conversions"]
Deadline: [needs Andrew's input]
Measure:  [needs Andrew's input — post count? paid conversions? traffic?]
Status:   PROPOSED — do not treat as active, do not report progress against it, until
          Andrew confirms outcome/deadline/measure.
```

This goal exists because the site now has a content/education arm (`/guides`,
`/prompts`, `/challenge`) that is not a sub-goal of the design-partner goal — see
`merit-context` for why. Do not fill in the blanks above with a plausible-sounding
number; leaving them blank and flagging PROPOSED is the correct state until Andrew
answers.

## When updating this file

- A goal moves from PROPOSED to ACTIVE only when Andrew has explicitly given outcome,
  deadline, and measure — not when a skill infers reasonable-sounding defaults.
- Progress updates go here, dated, one line per update, oldest at the bottom:

```
## Progress log — Goal 1
- [date]: [status/number], source: [where this number came from]
```

- If a progress number can't be traced to a real source (an API call, a dashboard
  screenshot, an actual count), don't record it — that's an invented number, which is
  against the standing rails in `merit-context`.
