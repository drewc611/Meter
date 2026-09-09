---
name: time
description: Record hours against work, including the unpaid hours, so margin and capacity stop being fiction. Use when the operator says log time, how long did that take, or at the end of a working day.
---

# time

The hours nobody logs are the hours that eat the business. Preparation, travel,
revisions, callbacks, the follow up email that took forty minutes. Log them all
and mark them honestly.

## Run it when

End of day, or after any block of work. Daily beats weekly. Weekly beats never.

## Reads

`time.csv`, `projects.csv`, `tasks.csv`, `business.yml`.

## The run

1. Ask what was worked on and for how long. Minutes, not hours, so nobody rounds
   ninety minutes down to one.
2. Attach it to a project. If it was not on a project, it was on the business:
   log it with a blank project and a note saying what it was.
3. `billable` is the important field and it is not about who could theoretically
   be charged. It is about whether it will appear on an invoice. Revisions inside
   a fixed price are `no`. A callback under warranty is `no`. Travel the customer
   agreed to pay is `yes`.
4. At the end of a week, total the `no` hours and show them next to the `yes`
   hours. That ratio is the single most useful number a solo operator can look at
   and almost none of them have it.

## Writes

`time.csv`.

```
os add time date=2026-09-06 project_id=p0002 minutes=390 billable=yes \
  rate=95.00 notes="Rough in day two"
```

## Finish line

`os margin` changes when time is logged. If it does not move, the entry did not
attach to a project.

## Refuses

- To log round numbers the operator did not actually say.
- To mark unpaid work billable to make a margin look better.
