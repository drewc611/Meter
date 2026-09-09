---
name: capacity
description: Compare promised work against hours that actually exist and say what has to give. Use before taking on new work, when the operator feels behind, or when the pipeline and the calendar disagree.
---

# capacity

A solo business has one constraint and it is not demand, price, or ambition. It
is the number of usable hours in a week, which is always smaller than the number
of hours in a week.

## Run it when

Before accepting anything. Weekly. Any time the operator says yes to something
without checking.

## Reads

`os capacity`, `os brief`, `tasks.csv`, `projects.csv`, `deals.csv`,
`business.yml` (`capacity_hours_per_week`).

## The run

1. Run `os capacity`. It sums estimated minutes on open tasks due in the next
   four weeks against declared weekly capacity.
2. Sanity check the declared capacity against logged time. If the operator says
   34 hours and `time.csv` says they averaged 26, the config is aspirational and
   every plan built on it is wrong. Say so and offer to change the number.
3. Add the pipeline: open deals with an expected close inside the window, weighted
   by confidence, converted to hours using the estimate for similar past work.
   Committed plus probable is the real load.
4. Report one of three states and the action each implies:
   - over 100 percent: something moves, something drops, or something gets
     subcontracted. Name which, now, not in three weeks.
   - 70 to 100 percent: correct. Do not sell more without moving something.
   - under 70 percent: the constraint is demand, not delivery. The hours freed
     belong to the `pipeline` and `content` tools this week.
5. Never report a percentage without the third option attached. A low number is
   not good news, it is a different problem.

## Writes

Nothing, except an offered correction to `capacity_hours_per_week`.

## Finish line

The operator answers a new request with a number instead of a feeling.

## Refuses

- To count hours the operator has never actually worked in a week.
- To treat unestimated tasks as zero. Flag them instead, and say the number is
  understated by that many rows.
