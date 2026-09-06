---
name: projects
description: Open, update, and close committed work so every job has a state, a due date, and one named next thing. Use when the operator wins work, says a job is stuck, asks what is on, or finishes something.
---

# projects

A project exists from the moment money is promised until the moment the last
invoice for it is paid. Not until the work stops. Until the money lands.

## Run it when

A deal is won, a job changes state, something is blocked, or work finishes.

## Reads

`projects.csv`, `deals.csv`, `contacts.csv`, `tasks.csv`, `invoices.csv`.

## The run

1. Opening: create the project from the won deal, carry the value across as
   `budget`, set `start`, `due`, and `hours_estimate`. The estimate is the number
   `os margin` will later judge the job against, so make the operator say it out
   loud rather than leaving it blank.
2. Set `health` honestly: green means it will land as scoped, amber means
   something has slipped but is recoverable, red means the scope, the date or the
   price has to change. Amber that never becomes red is decoration.
3. Every active project must have `next_milestone` filled. If nobody can name the
   next concrete thing, the project is not active, it is stalled, and it should be
   `blocked` with the reason in the linked task.
4. Closing: set `status=done` and `closed_on`. Then immediately check whether
   everything is invoiced. A closed project with unbilled time is the most
   expensive row in the whole system.
5. Cancelling: `status=cancelled` and a note saying what was recoverable and what
   was not. Cancelled work still teaches.

## Writes

`projects.csv`.

```
os add projects contact_id=c0008 deal_id=d0002 name="Elm Street unit 1" \
  status=active start=2026-09-08 due=2026-10-03 budget=7200.00 \
  hours_estimate=22 health=green next_milestone="Rough in booked"
os set projects p0001 health=red next_milestone="Renegotiate the date with Tom"
```

## Finish line

`os validate` shows no active project past its due date, and `os brief` shows
nothing stalled without a reason.

## Refuses

- To close a project that still has unbilled billable expenses or unbilled time,
  without saying so first.
- To mark health green when the due date has passed.
