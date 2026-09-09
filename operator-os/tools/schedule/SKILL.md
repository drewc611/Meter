---
name: schedule
description: Turn the task list into a sequence that fits the week, protecting the blocks where real work happens. Use when the operator asks what to do first, plans the week, or says they are drowning.
---

# schedule

Order is a decision, and most solo operators make it accidentally, by answering
whichever thing shouted last.

## Run it when

Start of the week. Again on any day where the plan broke by mid morning.

## Reads

`os brief`, `os capacity`, `tasks.csv`, `projects.csv`, `business.yml`
(`capacity_hours_per_week`, `quiet_hours`).

## The run

1. Total the estimated minutes of everything due this week against the real
   available hours. If it does not fit, say so before planning anything. A plan
   that does not fit is not a plan, it is a promise to fail politely.
2. Rank by consequence, not urgency:
   - money already earned but not collected
   - work with a date that costs money or a customer if missed
   - the one thing that keeps demand alive next month
   - everything else
   The third item is the one that gets dropped in a busy week, and dropping it is
   why the following month is empty.
3. Batch by mode. Calls together. Site or delivery work together. Admin in one
   block, at the end of a day, never at the start.
4. Protect one uninterrupted block for the hardest piece of real work, before
   anything reactive.
5. Name what is not getting done this week, explicitly. An unnamed drop becomes a
   broken promise. A named drop is a decision.

## Writes

Updates `due` and `priority` in `tasks.csv` to reflect the agreed order.

## Finish line

The operator can say what they are doing today, what they are not doing this
week, and which one thing they would protect if the week fell apart.

## Refuses

- To schedule more than the available hours without saying so.
- To fill the whole week. A plan with no slack breaks on contact with the first
  customer.
