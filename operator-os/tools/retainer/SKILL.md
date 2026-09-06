---
name: retainer
description: Set up or renew a recurring retainer at a price the operator can defend today, not the price that made sense a year ago. Use when a client agrees to ongoing recurring work, or when a retainer comes up for renewal.
---

# retainer

Recurring revenue is the one number in the forecast that never has to be
chased — which is exactly why it's the number most likely to sit unpriced
for years while costs and the operator's own rate move on without it.

## Run it when

A client agrees to ongoing recurring work, or an existing retainer is coming
up for its regular renewal.

## Reads

`recurring.csv`, `contacts.csv`, `os margin`, `os capacity`, `business.yml`
(`hourly_rate`, `capacity_hours_per_week`).

## The run

1. Confirm this is genuinely ongoing, not a one-off dressed up as one. If
   there's no real recurring cadence to it, this is a `projects` or `quote`
   job, not a `retainer` job.
2. Get the scope in hours the operator can actually state — what does this
   retainer cover each period. Never assume a number the operator hasn't
   said; a retainer with no stated hours can't be checked against anything.
3. Divide the proposed `amount` by the hours it's meant to cover in that
   cadence to get an effective hourly rate, and compare it against
   `hourly_rate` in the config and, if there's history for this contact,
   against `os margin`. If it's below the configured rate, say so plainly
   before it's written anywhere.
4. Run `os capacity`. Convert the retainer's hours to a weekly figure by its
   cadence and check it actually fits alongside every other recurring
   commitment already on the books. A retainer that overcommits the week on
   paper is a problem the day it's signed, not the day it's worked.
5. Look for an existing `recurring` row for this contact. New: add one with
   `type=income`. Renewal: update the existing row's `amount` and
   `next_date`.
6. If this is a renewal and the new amount is lower than the old one, stop.
   Confirm out loud with the operator that a lower price is the actual,
   deliberate intent — not the check that quietly didn't happen.
7. Tag the contact and update `last_contact`.

## Writes

`recurring.csv` (new row or updated `amount`/`next_date`), `contacts.csv`
(`tags`, `last_contact`).

```
os add recurring label="Ashworth monthly retainer" type=income \
  amount=1800.00 cadence=monthly next_date=2026-10-01 category=retainer
os set contacts c0005 tags=retainer last_contact=2026-09-06
```

## Finish line

The `recurring` row's `amount` divided by the hours it covers meets or beats
`hourly_rate`, and `os capacity` shows the retainer's hours fitting inside the
weekly figure alongside everything else already committed.

## Refuses

- To lower an existing retainer's price without the operator explicitly
  confirming that's what they intend.
- To price a retainer against hours the operator hasn't actually stated.
- To skip the capacity check and set up a commitment that doesn't fit the
  week it's meant to run in.
- To draft or send the renewal conversation itself — this tool only records
  what's already been agreed.
