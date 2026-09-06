---
name: renewal-reminder
description: Walk through every recurring row that is overdue, due soon, or missing a next_date, so a renewal never slips past unnoticed. Use when the operator says check renewals, what's coming up, is anything due, or runs a weekly or monthly review.
---

# renewal-reminder

`recurring.csv` is the one registry nobody opens on its own — there is no
invoice to chase, no deal to move. That is exactly how a renewal auto-renews
at last year's price, or a client retainer goes quiet for two months before
anyone notices the money stopped.

## Run it when

Doing a weekly or monthly review, or any time the operator asks what's
coming up on the recurring side.

## Reads

`recurring.csv`, by way of `os reminders`. Nothing else — this is a read
before anything is decided, not a pricing pass.

## The run

1. Run `os reminders`. That is the default 14 day window; run
   `os reminders 30` for a longer look before a monthly review.
2. Work the **overdue** section first. A row with a `next_date` already
   passed has either already renewed at whatever price is on the row, or it
   is late being actioned. Either way it needs a human decision now, not a
   guess here.
3. For each overdue or soon-due `income` row, decide: is the price still
   right? If not, that's the `retainer` tool's job, not this one — this tool
   only surfaces the row, it does not reprice it.
4. For each overdue or soon-due `cost` row, check whether it actually still
   renewed at the amount on the file. A vendor price increase that already
   landed belongs to `vendor-audit`, not here.
5. For every row in the **no next_date** section, set one:
   `os set recurring <id> next_date <date>`. A recurring row with no
   next_date is invisible to this whole tool going forward, which is worse
   than being overdue.
6. Once every row has a next_date the operator trusts, run `os reminders`
   again and confirm the overdue section is empty.

## Writes

Nothing. `os set recurring <id> next_date ...` is a core command run by the
operator in step 5, not something this plugin does on its own.

## Finish line

`os reminders` shows no rows in the "no next_date" section, and every row in
the overdue section has been looked at and either updated or explicitly left
as-is on purpose.

## Refuses

- To change a price or a next_date itself. It only lists what needs a look;
  `retainer`, `vendor-audit`, and `os set recurring` are where the actual
  edit happens.
- To treat a row with no next_date as "not due." It is filed separately
  because it cannot honestly be judged either way, not because it is fine.
