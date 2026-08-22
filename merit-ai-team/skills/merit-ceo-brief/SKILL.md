---
name: merit-ceo-brief
description: >
  The weekly CEO synthesis for Merit AC — runs the whole team, reads every log,
  scores progress against the goal, and returns the three things that matter
  and the decisions Andrew owes. Use when Andrew says "CEO brief", "weekly
  brief", "run the team", "where are we", "what do I need to decide", "state of
  the business", or when the weekly CEO scheduled task fires.
metadata:
  version: "0.1.0"
---

# Merit AC CEO brief

The one that pulls it together. Read `merit-context` and `merit-goal` first.

## Run order

1. **Read all three goals.** `merit-ai-team/docs/merit-goal.md` (design
   partners), `merit-ai-team/docs/merit-content-goal.md` (content/challenge),
   and `merit-ai-team/docs/merit-news-goal.md` (AI news). Everything below is
   ranked against whichever one it actually serves — never blend the three
   into a single score. If any is missing or still PROPOSED, say so; the
   content goal has sat PROPOSED with blank outcome/deadline/measure since
   2026-08-21 and the news goal since 2026-08-22 — flag each every week until
   Andrew closes it, same as the original goal was flagged for its first two
   weeks. The news goal also needs its two structural checks read from
   `merit-news-judge-log.md` (is the Judge pass actually rejecting anything;
   does every published article that needed one carry a corrections entry) —
   report those even when the goal itself is still PROPOSED.

2. **Read last week.** Read `merit-ai-team/docs/merit-infra-log.md`,
   `merit-eng-log.md`, `merit-growth-log.md`, and `merit-exec-brief.md`. Note
   which of last week's recommendations were acted on. An item recommended
   three weeks running and never done is itself the finding — either it
   doesn't matter or something is blocking it, and both need saying.

3. **Run the team yourself.** Do the infra, engineering, and growth work
   directly (or via the Agent tool if a subagent is genuinely useful) — the
   `merit-executor` routing skill referenced in earlier drafts of this file
   isn't part of this plugin, so there's no separate dispatch layer to hand
   this to.

4. **Synthesize with your own judgment.** This step was never meant to be
   delegated even when the tier-routing skills existed — it stays yours here
   too.

## What the brief is

Not a status report. Andrew has the logs. This is the part only a CEO does:
deciding what matters, killing what doesn't, and naming what he has to choose.

Structure:

**Goal lines, three of them.** Design-partner outcome, days remaining, status,
number that changed. Then the content/challenge outcome the same way, and the
news outcome the same way again — for either, if still PROPOSED, one line
saying so plus what's blocking Andrew from filling it in. For the news goal
specifically, add whether the Judge-tier pass is actually rejecting anything
and whether the corrections trail is holding — both goals-independent facts
worth a line even before the goal itself has numbers. Do not merge the three
into one combined status.

**The three things.** Exactly three, ranked. Each one: what happened, why it
matters to the goal, what it costs to act. If there aren't three things worth
Andrew's attention, give two. Never pad to three.

**Decisions owed.** Things only Andrew can decide, each with the options, the
tradeoff, and a recommendation. Make the recommendation — a CEO brief that
lists options without a position is a memo.

**Dropped.** What the team decided not to work on and why. This is the section
that keeps the other four honest.

## Judgment rules

- **Rank by goal contribution, not by severity.** A missing CSP header is a
  real finding and probably not one of the three things this week. Say it in
  the log, not the brief.
- **Kill things.** If a workstream hasn't moved the measure in a month, name it
  and recommend stopping. Nobody else on this team will.
- **Don't launder inference as fact.** Anything not directly observed gets
  labeled. Confidence discipline is Merit AC's own product claim; the team that
  builds it doesn't get to be sloppier than the product.
- **No invented numbers.** If Andrew hasn't connected billing, analytics, or
  the waitlist count, say the data isn't there and name what to connect. An
  estimate that reads like a measurement is the worst output this skill can
  produce.
- **Short.** One screen. If it doesn't fit, the ranking wasn't done.

## Voice

Andrew's, per the `andrew-agent:write-as-andrew` skill if that plugin is
available in the current environment (it isn't part of this plugin, so check
before relying on it): direct, opinionated, specific names and numbers, point
first then support. No preamble, no inspirational close, no "in today's
landscape," no bold-term-colon lists, one em dash maximum.

## Output

Post the brief in chat, then write it to
`merit-ai-team/docs/merit-exec-brief.md` (plain file, not a project tool — see
`merit-context`) — newest entry at the top, keeping the last eight weeks and a
rolling "what we decided and what happened" table beneath them so the record
of calls made stays visible.

Then append the week's result to the progress log in
`merit-ai-team/docs/merit-goal.md`.
