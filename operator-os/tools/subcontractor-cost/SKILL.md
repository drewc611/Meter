---
name: subcontractor-cost
description: Log a subcontractor's invoice as a project expense so it erodes the job's margin instead of vanishing. Use when the operator says subcontractor, contracted out, farmed out, subbed this out, or paid a sub.
---

# subcontractor-cost

Work farmed out is still a cost of the job. If it lands in a personal transfer
or a side ledger instead of `expenses.csv`, the project that carried it looks
more profitable than it was, and every margin number downstream is wrong by
exactly that much.

## Run it when

A subcontractor's invoice or payment request arrives for work that belongs to
a specific project.

## Reads

`projects.csv`, `os margin`, `expenses.csv` (existing `category` values for
subcontracted labour).

## The run

1. Confirm the project. If the operator hasn't named one, list active projects
   and ask. Never guess which job a sub worked on.
2. Get the subcontractor's invoice total and date from the actual invoice, not
   from memory of what was agreed.
3. Pick `category`. Reuse whatever value the operator already uses in
   `expenses.csv` for subcontracted work. If nothing fits, ask rather than
   invent one.
4. Decide `billable`: `yes` only if this cost is passed straight through to the
   client's invoice, `no` if it's absorbed into the operator's own price. If
   the project was quoted or contracted on a pass-through basis and the
   operator says `no` anyway, stop and confirm out loud before writing it.
   That combination is exactly the one that quietly kills a margin.
5. Set `receipt` from whether the sub actually issued a proper invoice, not
   from whether they've been paid yet.
6. Log the row, then run `os margin` for that project and read back the new
   profit and margin% so the cost is seen landing, not just recorded.

## Writes

One row in `expenses.csv`.

```
os add expenses date=2026-09-06 vendor="Alvarez Drywall" category=subcontractor \
  amount=1450.00 project_id=p0004 billable=yes method=transfer receipt=yes
```

## Finish line

`os margin` for that project shows cost up and profit down by exactly the
subcontractor's invoice total.

## Refuses

- To mark a subcontractor cost `billable=no` without the operator's explicit
  confirmation, when the project's contract or quote implies the client is
  billed pass-through for subcontracted work.
- To assign the cost to a project the operator hasn't named.
- To invent a new expense category when an existing one already fits.
