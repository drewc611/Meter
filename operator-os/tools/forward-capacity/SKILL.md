---
name: forward-capacity
description: Look 4 to 8 weeks ahead instead of just this week, combining os capacity with open deals weighted by confidence, so an overbooked or underbooked week gets caught while there is still time to do something about it. Use before quoting a start date, before deciding whether to chase a new deal, or monthly alongside pipeline.
---

# forward-capacity

`os capacity` answers whether the operator is overbooked this week. By the
time that is true, it is too late to do anything but suffer through it. This
tool asks the same question about the five weeks after this one, while
declining a deal or moving a start date is still cheap.

## Run it when

Before quoting a start date on a new deal, before deciding whether to chase or
decline something in the pipeline, or monthly as a standing check alongside
`pipeline`.

## Reads

`os capacity`, `deals.csv` (`value`, `confidence`, `stage`, `status`,
`expected_close`), `os query` against `deals` for `weighted_value` and
`days_to_close`, `tasks.csv` (`due`, `estimate_min`, `status`) and
`projects.csv` (`due`) for work already committed, `business.yml`
(`capacity_hours_per_week`).

## The run

1. Run `os capacity` for the baseline: this week's committed hours from open
   tasks against declared weekly capacity.
2. Extend the same arithmetic 4 to 8 weeks out. Bucket open tasks and active
   project work by the week their `due` date falls in, using `estimate_min`.
   Flag any unestimated task the same way `os capacity` does — as unknown, not
   as zero.
3. Pull open deals with `stage` in `quoted` or `negotiating` and an
   `expected_close` inside the window (`os query "select title, value,
   confidence, weighted_value, expected_close from deals where status = open
   and expected_close <= today+56"`). Convert each to expected hours from the
   nearest comparable finished project's actual hours, the same lookup `quote`
   uses, then weight by `confidence` — a deal at 40 percent confidence
   contributes 40 percent of its estimated hours to that week, not the whole
   estimate and not nothing.
4. Add committed hours and weighted probable hours together, per week, against
   `capacity_hours_per_week`. Report each week in the same three bands
   `os capacity` uses: over 100 percent, 70 to 100, under 70. The operator
   already knows how to read those.
5. Name specifically which weeks cross a band before they arrive, and which
   open deal is the cause. A week at 130 percent five weeks out is a problem
   the operator can still fix today — decline the deal causing it, move a
   start date, or line up subcontracting. The same week discovered on arrival
   is just a bad week.
6. Report an underbooked week with the same weight `capacity` gives one: it is
   a demand problem this week's `pipeline` or `content` work should be
   solving, not a scheduling problem to shrug at.

## Writes

Nothing.

## Finish line

The operator can name, today, which of the next 4 to 8 weeks is going to be
overbooked or underbooked, and which specific open deal is driving it.

## Refuses

- To accept, decline, or reprioritise any deal itself. It is a planning lens;
  what to pursue is the operator's decision.
- To count an unestimated task's hours as zero, the same rule `os capacity`
  follows. It flags the gap instead of hiding it inside a clean-looking total.
- To convert a deal to hours from a guess when no comparable finished project
  exists. It says the estimate is unfounded rather than inventing one.
