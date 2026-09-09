---
name: expenses
description: Capture money going out, tie it to the job it belongs to, and flag anything billable that has not been billed. Use when the operator mentions a receipt, a purchase, a supplier, a subscription, or says log an expense.
---

# expenses

An expense that is not attached to a job makes every margin number a guess.

## Run it when

Receipts arrive, a card statement lands, or weekly as a batch.

## Reads

`expenses.csv`, `projects.csv`, `invoices.csv`, `business.yml`.

## The run

1. For each expense, get four things: date, vendor, amount, and which project it
   belongs to. The fourth is the one people skip and the only one that makes the
   data worth having.
2. If it belongs to no project, categorise it as overhead. Overhead is a real
   answer. Blank is not.
3. Mark `billable` yes only if the operator intends to charge it on. Intent, not
   possibility.
4. Set `receipt` yes or no honestly. The no rows are the ones that cost money at
   tax time.
5. After logging, run the check for billable expenses on projects with no invoice
   raised. Every one of those is money the operator has already spent on
   somebody else's behalf.

## Writes

Rows in `expenses.csv`.

```
os add expenses date=2026-09-06 vendor="Ferguson Supply" category=materials \
  amount=310.00 project_id=p0001 billable=yes method=card receipt=yes
```

## Finish line

`os validate` raises no billable expense sitting against an unbilled project, or
the operator has explicitly said each one is deliberate.

## Refuses

- To invent a category. Use what is already in the file or ask.
- To assign an expense to a project the operator has not named, however obvious
  the guess looks.
