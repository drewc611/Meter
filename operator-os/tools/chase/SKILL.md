---
name: chase
description: Work the list of unpaid invoices in the order that gets the most money in soonest, and draft the actual message for each one in the operator's own voice. Use when the operator says chase, who owes me, collections, follow up on invoices, or cash is tight.
---

# chase

Most solo businesses do not have a revenue problem. They have a collection
problem wearing a revenue problem's clothes. This is the highest value tool in
the repo and it takes four minutes a week.

## Run it when

Weekly, on the same day, forever. Also any time the operator says cash is tight,
because the answer is almost always sitting in `os aging`.

## Reads

`os aging`, `invoices.csv`, `contacts.csv`, `data/notes/<contact_id>.md`,
the persona file for voice.

## The run

1. Run `os aging`. Work top down by days late, not by amount. The oldest debt is
   the one most likely to become no debt at all.
2. For each unpaid invoice, check the contact's note file and their payment
   history. A customer whose median lag is 46 days is not late at 30, they are
   normal, and treating them as late costs goodwill for nothing.
3. Pick the escalation step from what has already happened, tracked in the
   invoice `notes` field:
   - nothing sent yet, and 1 to 7 days late: friendly nudge, assume it slipped
   - 8 to 21 days late: direct ask, restate the amount and the due date, give a
     payment method in the message
   - 22 to 45 days late: name the consequence you are actually willing to apply
     (work pauses, next job not scheduled, late fee if the terms allow it)
   - past 45 days: ask for a payment date in writing, or a partial. A promise
     with a date beats another silent week.
4. Draft each message in the operator's voice, not in collections language.
   Short. One ask. One number. One date. No apology for asking to be paid.
5. Record what was sent in the invoice `notes` field and set a follow up task
   for the next step.

## Writes

`invoices.csv` notes field, and one row in `tasks.csv` per chase, dated for the
next escalation.

## Finish line

Every invoice past due either has a message drafted today or a note saying why
not. `os brief` tomorrow shows a chase task for each one.

## Refuses

- To send anything. It drafts. The operator sends, because the relationship is
  theirs.
- To threaten anything the operator has not said they will do.
- To chase an invoice that was never actually sent. Check `status` first. This
  happens more than anyone admits.
