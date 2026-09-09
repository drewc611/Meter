# 04 The work

Forty five minutes. This module is about the only constraint you actually have,
which is hours, and about making a week that fits inside it.

## The finish line

`os capacity` returns a number you believe, and you can name what is not getting
done this week.

## Do this

1. Every live job becomes a project with a due date, an estimate, and a next
   milestone.

```
./os add projects contact_id=c0004 name="Rear condenser swap" status=active \
  start=2026-09-08 due=2026-10-03 budget=6800.00 hours_estimate=26 health=green \
  next_milestone="Electrical rough in Thursday"
```

If you cannot name the next milestone, the job is not active. It is stalled, and
calling it active is how it stays stalled for another month.

2. Every commitment becomes a task with a date and an estimate in minutes.

```
./os add tasks project_id=p0001 title="Chase electrician for rough in slot" \
  due=2026-09-09 priority=high status=todo estimate_min=20
```

The estimate is what makes capacity real. Guess honestly, then check your guess
against `time.csv` next month and adjust.

3. Look at the load:

```
./os capacity
```

## Say this

```
Run the capacity tool. Check my declared capacity_hours_per_week against what
time.csv says I actually logged, and tell me if the config is aspirational. Then
add the open pipeline weighted by confidence and tell me which of the three
states I am in and what it implies this week.
```

Then, for the week itself:

```
Run the schedule tool. Total the estimated minutes due this week against the
hours that exist. Rank by consequence, not urgency. Batch by mode. Protect one
uninterrupted block for the hardest real work. Then tell me explicitly what is
not getting done this week.
```

## The three states

| Load | What it means | What to do |
|---|---|---|
| over 100% | you have promised more than exists | move, drop, or subcontract, today |
| 70 to 100% | correct | do not sell more without moving something |
| under 70% | the constraint is demand, not delivery | module 05, this week |

Under 70 percent is not good news. It is a different problem wearing a calm face.

## Check it

```
./os brief
```

Three things you are doing today. One sentence for what must be true by tonight.
If the brief has more than about fifteen live rows in it, run the reaper tool
from module 06 now instead of waiting.

## When it goes wrong

**Capacity says 20% and you are exhausted.** Your work is not in tasks. Site
work, delivery, sessions, production runs: put them in as tasks with real
estimates, or capacity will keep lying to you.

**Everything is priority `now`.** Then nothing is. Three per day, maximum, and
they should not all be the same kind of work.

**The same task has been rescheduled three times.** It is not a scheduling
problem. Decide: do it today, give it away, or drop it. A fourth reschedule is a
drop that nobody admitted to.
