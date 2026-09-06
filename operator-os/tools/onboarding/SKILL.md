---
name: onboarding
description: Turn a won deal into a properly set up client record and an open project, then work through the first-week basics before any work actually starts. Use when the operator says a new client just said yes, onboard them, set up the new client, or a deal moves to won.
---

# onboarding

The gap between "they said yes" and "the record is actually right" is where
terms get forgotten, deposits get skipped, and the first invoice turns into an
argument. This tool closes that gap before the first hour is worked.

## Run it when

A deal moves to `won`, or the operator says any version of "they said yes" for
work that hasn't been onboarded yet.

## Reads

`contacts.csv`, `deals.csv`, `projects.csv`, `business.yml` (`hourly_rate`,
`invoice_terms_days`, `capacity_hours_per_week`).

## The run

1. Confirm the deal is actually `won`. If it's still `quoted` or
   `negotiating`, this is the wrong tool — send it back to `pipeline`. Don't
   onboard a maybe.
2. Fill the contact row in properly. A lead record is often thin: `company`,
   `role`, `phone`, and `tags` are frequently blank because nobody needed them
   until now. Fill what the operator can state and leave the rest blank rather
   than guessing. Set `status=active` if it still reads `lead`.
3. Open the project from the won deal: carry the deal's `value` across as
   `budget`, and make the operator say `start`, `due`, and `hours_estimate`
   out loud rather than leaving any of them blank — `margin` and `capacity`
   both depend on this number later.
4. Work the first-week checklist, out loud, one at a time:
   - **Rate.** Does the price agreed match what `hourly_rate` and the quote
     implied? If it's lower and nobody meant it to be, say so before the
     first hour is logged, not after the first invoice.
   - **Invoicing cadence.** One invoice at the end, milestone billing, or
     recurring? If it's recurring, this tool stops here and hands off to
     `retainer` — don't set up a recurring commitment from inside this
     checklist.
   - **Deposit.** If one was agreed, it isn't invoiced here — that's the
     `invoice` tool's job — but note it against the project's
     `next_milestone` so nobody starts work assuming it landed when it
     hasn't.
5. If the deal's own `closed_on` is blank, set it now. A won deal without a
   close date is a hole in every report that reads `deals.csv`.

## Writes

`contacts.csv` (missing fields, `status`), `projects.csv` (one new row),
`deals.csv` (`closed_on` if it was left blank).

```
os set contacts c0005 company="Ashworth & Co" phone=555-0108 \
  tags=client status=active
os add projects contact_id=c0005 deal_id=d0012 name="Ashworth kitchen refit" \
  status=active start=2026-09-08 due=2026-10-17 budget=6400.00 \
  hours_estimate=48 health=green next_milestone="Deposit invoice confirmed before start"
```

## Finish line

`os find <contact>` shows an active contact with no obviously blank fields,
one open project with a `next_milestone` filled in, and the linked deal
carrying a `closed_on` date.

## Refuses

- To raise the deposit invoice, send anything, or contact the client itself —
  this tool sets up the record, it doesn't touch money or people.
- To open a project for a deal that isn't `won` yet.
- To set up a `recurring` row for retainer work — that's a different tool with
  its own pricing check.
- To leave `hours_estimate` blank because the operator didn't want to commit
  to a number. Every later margin read depends on this one being real.
