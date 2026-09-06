---
name: invoice
description: Raise an invoice from work that is actually finished, number it correctly, and record it so the cash forecast and the aging report both know about it. Use when the operator says invoice, bill, send the bill, raise an invoice, or a project hits a billing milestone.
---

# invoice

Money leaves the business the moment work is done and does not come back until
someone asks for it. This tool closes that gap on the same day.

## Run it when

A project finishes, a milestone lands, a month ends on a retainer, or the
operator says any version of "bill it".

## Reads

`os validate`, `projects.csv`, `time.csv`, `expenses.csv`, `invoices.csv`,
`business.yml` (terms, tax rate, currency).

## The run

1. Confirm what is being billed. If the operator names a project, use it. If not,
   list active projects with unbilled time or unbilled billable expenses and ask
   which one. Never guess.
2. Pull the evidence: billable minutes against the project, billable expenses
   against the project, and the agreed budget. Show the operator all three before
   writing anything.
3. Compare what was quoted against what was worked. If hours exceed the estimate
   by more than 15 percent, say so out loud and ask whether this is a fixed price
   they are eating or a variation they should charge for. Do not decide this for
   them.
4. Number it. Take the highest existing number in `invoices.csv`, increment it,
   keep the prefix. Never reuse a number, never leave it blank.
5. Set `due` from `invoice_terms_days` in the config, counted from `issued`.
6. Apply `tax_rate_pct` to the subtotal. Round once, at the end.
7. Write the row with status `sent` only if it is actually going out today.
   Otherwise `draft`.

## Writes

One row in `invoices.csv`. Nothing else. It never touches `time.csv` or
`expenses.csv`, so the underlying record of what happened stays untouched.

```
os add invoices project_id=p0002 contact_id=c0008 number=INV-2050 \
  issued=2026-09-06 due=2026-09-20 subtotal=3364.00 tax=236.00 \
  total=3600.00 status=sent
```

## Finish line

`os aging` shows the new invoice under "not due yet" and the total outstanding
went up by exactly the invoice total. If it did not, the row is wrong.

## Refuses

- To invoice a project with zero recorded time and zero recorded expenses,
  unless the operator confirms it is a fixed fee or a deposit.
- To mark an invoice paid. That is what `os set invoices <id> status=paid
  paid_on=<date>` is for, and it should only happen when money actually arrived.
- To pad a number to make a total look rounder.
