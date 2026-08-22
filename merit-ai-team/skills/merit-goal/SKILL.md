---
name: merit-goal
description: >
  Sets, reads, and scores Merit AC's standing goal — the one objective every agent
  run is measured against. Use when Andrew says "goal", "/goal", "set the
  goal", "what's the goal", "are we on track", "how are we doing against the
  goal", "change the goal", or when any weekly merit run needs to know what it
  is working toward. Every other merit-* skill reads this before deciding what
  to work on.
metadata:
  version: "0.2.0"
---

# Merit AC goal

**Three goals now, tracked separately, never averaged into one score (news
goal added 2026-08-22).** The design-partner goal
(`merit-ai-team/docs/merit-goal.md`), the content/challenge goal
(`merit-ai-team/docs/merit-content-goal.md`), and the news goal
(`merit-ai-team/docs/merit-news-goal.md`) measure different things and can
move in opposite directions in the same week. Report all three, rank work
against whichever one it actually serves, and never blend them into a
single verdict — "content is up but partners are flat and news just
started" is the honest sentence, not a combined average.

Everything the team does gets ranked against the goal it's actually meant to
move. Work that doesn't move any of the three gets named as such rather than
quietly done anyway.

Read all three files (plain Read, not a project tool — this plugin runs
against files in `drewc611/Meter`, not a claude.ai Project; see
`merit-context`) at the start of every merit run, even if this run's task
only concerns one of them — the CEO brief needs all three.

## Modes

Pick from what Andrew said.

### Set — "set the goal", "/goal <text>", "new goal"

If a goal already exists, show it and confirm before replacing. Never
silently overwrite; move the old one to the history section.

A goal needs four things. Ask for anything missing, in one round:

- **Outcome** — a specific end state, not an activity. "Ten design partners
  signed" is a goal. "Do more marketing" is not.
- **Deadline** — a date.
- **Measure** — how you'll know, and where the number comes from.
- **Constraint** — what Andrew won't trade to get it. Usually budget, or "no
  surveillance-tool positioning," or "don't break the prototype."

Then write the file:

```markdown
# Merit AC goal

**Outcome:** <end state>
**Deadline:** <date>
**Measure:** <metric, source>
**Constraint:** <what won't be traded>
**Set:** <date>

## Sub-goals
| Sub-goal | Owner skill | Status |
| --- | --- | --- |

## Progress log
### <date>
- <what moved, with the number>
```

### Read — "what's the goal", "/goal" with no argument

Print the goal, days remaining, latest measured value, and the two open
sub-goals closest to the critical path. Four lines, not a report.

### Score — "are we on track", or at the end of any weekly run

Judge honestly. Compare the current measure against where it should be given
elapsed time, and give a plain verdict: on track, slipping, or off. If off, say
what specifically has to change — the plan, the deadline, or the effort. Do not
soften it, and do not manufacture a green status out of activity. Shipped work
that didn't move the measure counts as not moving the measure.

Append the result to the progress log.

### Amend — "change the goal", "push the deadline"

Allowed, but log the old value, the new one, and the reason. A goal quietly
moved twice is a goal that isn't real.

## How other skills use this

Every merit-* skill reads the goal before choosing what to work on, and orders
its recommendations by contribution to it. Each weekly output ends with one
line:

> **Goal:** <outcome> · <days left> · <on track | slipping | off> — <what moved this week>

When a run produces work that does not advance the goal, say so explicitly
rather than padding the report with it. "Nothing this week moved the goal" is a
legitimate and useful finding.

## Default goal

If no goal file exists and Andrew hasn't set one, propose this and ask him to
confirm or replace it — do not adopt it silently:

> **Outcome:** Ten design partners using Merit AC on their own AI spend data.
> **Deadline:** 2026-12-31.
> **Measure:** Count of companies with live ingestion and at least one scored
> period, from `/api/adoption` across tenants.
> **Constraint:** No surveillance-tool positioning, and no claim Merit AC's own
> copy doesn't already make.

It follows from where Merit AC actually is: a labeled prototype on demo data with
a waitlist endpoint and no crawlable content. Everything else — security
headers, SEO, the methodology page — is downstream of getting real tenants.

## Second goal — content and challenge (added 2026-08-21)

Lives at `merit-ai-team/docs/merit-content-goal.md`, same file shape as above,
same Set / Read / Score / Amend modes. **Do not invent the outcome, deadline,
or measure** — none of the three have been given by Andrew as of 2026-08-21.
Propose this shell, marked PROPOSED, and ask him to fill the blanks rather
than guessing a number to make the file look complete:

> **Outcome:** <needs Andrew: e.g. "N challenge signups converted to paid" or
> "N guides + prompts published and indexed">
> **Deadline:** <needs Andrew>
> **Measure:** <needs Andrew: published post count? paid conversions? traffic
> to `/guides` or `/prompts`?>
> **Constraint:** No invented statistics in guides/prompts, same sourcing
> discipline as the design-partner goal's copy. Fee mechanism (Stripe vs.
> manual) must be confirmed before `/challenge` describes a working checkout.

A goal file with three blanks in it is more honest than one with three guessed
numbers. Flag the blanks in every weekly output on this goal until Andrew
closes them, the same way the design-partner goal sat PROPOSED for its first
two weeks.

## Third goal — AI news (added 2026-08-22)

Lives at `merit-ai-team/docs/merit-news-goal.md`. Same PROPOSED-with-blanks
treatment as the content goal above — Andrew hasn't given an outcome,
deadline, or measure for this one either. Do not invent them.

Unlike the other two, this goal's work publishes **autonomously** — a
scheduled run drafts an article, runs an adversarial Judge-tier pass, and
merges directly with no human review, per Andrew's direct confirmation
(2026-08-22). Because there's no human gate, this goal is scored on two
structural things holding, not just publish volume: whether the Judge pass
is actually rejecting things (check `merit-news-judge-log.md` — a long
run of zero rejections is itself a finding, not necessarily good news),
and whether every published article still carries an honest, dated
corrections trail if one was ever needed. If either stops holding, say so
plainly even if the publish count looks healthy.
