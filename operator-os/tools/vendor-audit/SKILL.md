---
name: vendor-audit
description: Walk the recurring and vendor expense list looking for duplicate charges and price creep, starting from what os anomalies already flags, and record what the operator decided about each one. Use monthly, or when the operator suspects a double charge or asks whether a subscription is still worth it.
---

# vendor-audit

A subscription that crept from $29 to $49 over eighteen months never
announces itself. It sits in `recurring.csv` next to forty other rows nobody
rereads, and the only thing that catches it is somebody actually rereading.

## Run it when

Monthly, alongside `reaper`'s recurring-costs pass. Also any time the operator
suspects a duplicate charge or asks whether a vendor is still worth the money.

## Reads

`os anomalies` (duplicate expenses, category-outlier spend, no-receipt spend
over threshold), `expenses.csv` (`vendor`, `category`, `amount`, `date`,
`billable`, `receipt`, `notes`), `recurring.csv` (`label`, `amount`,
`cadence`, `next_date`, `category`), `business.yml` (`receipt_threshold`).

## The run

1. Run `os anomalies`. It scans the whole business, not just vendors, so pull
   out only the rows tagged as a possible duplicate charge, an unusual spend
   for its category, or an expense over `receipt_threshold` with no receipt.
   Everything else it flags belongs to `pricing` or `chase`, not here.
2. For each duplicate-charge flag, check whether it is one purchase billed
   twice or two genuinely separate purchases that happen to match on vendor
   and amount. Do not decide silently — ask the operator, they know if they
   actually bought two.
3. Walk `recurring.csv` one row at a time, the same way `reaper` reads the
   recurring list out loud, and compare each `amount` against what the
   operator remembers agreeing to. A slow year-over-year creep on a
   subscription won't trip a statistical anomaly on its own — it needs the
   operator's memory checked against the number, not just the math.
4. For every item reviewed, get one of three decisions from the operator:
   keep (legitimate, no action), dispute (the operator contacts the vendor
   themselves), or cancel. Never assume which one from the size of the amount.
5. Record the decision against the specific expense row. For a cancel
   decision on a recurring cost, raise a task rather than editing
   `recurring.csv` directly — `recurring.csv` has no status field to flip,
   and the actual cancellation is the operator calling or emailing the
   vendor.

## Writes

`expenses.csv` `notes` field on each row reviewed — append the decision with
today's date, never overwrite what was already there. One row in `tasks.csv`
per item the operator wants to dispute or cancel.

```
os set expenses e0042 notes="Reviewed 2026-09-06: legitimate, two separate call-outs same week"
os add tasks title="Cancel Adobe Creative Cloud - unused since March" priority=normal due=2026-09-13 status=todo
```

## Finish line

Every item `os anomalies` flagged this run has either a decision recorded in
`expenses.csv` notes or a dispute/cancel task in `tasks.csv` — nothing stays
flagged and untouched.

## Refuses

- To contact, dispute, or cancel anything with a vendor itself. It produces
  the decision and the task; the call or email is the operator's.
- To overwrite an existing `notes` field instead of appending to it — that
  erases whatever was already recorded about that expense.
- To treat every anomaly as a problem needing action. A flag is a question;
  a clean answer gets recorded as clean, not left open to look thorough.
