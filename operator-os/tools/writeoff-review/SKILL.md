---
name: writeoff-review
description: Review the invoices that chase has already worked and time has already passed on, and surface the real write-off candidates instead of letting them sit forever as fake receivables. Use when the operator asks about old unpaid invoices, whether to give up on one, or wants the aging list cleaned up.
---

# writeoff-review

`chase` never gives up on its own — it just works the ladder of escalation
and drafts the next message. Somewhere past that ladder, some invoices are
never getting paid, and carrying them as "outstanding" makes the cash
forecast and the aging report both quietly wrong. This tool is the honest
second half of `chase`: it doesn't chase, it decides when chasing is over.

## Run it when

Periodically, as its own review — never as a substitute for `chase`, and
never on an invoice `chase` hasn't already worked.

## Reads

`os aging`, `invoices.csv`, `contacts.csv`.

## The run

1. Run `os aging`. Take only invoices at least **60 days past due**. Under
   that threshold this is still collectible and belongs to `chase`, not here.
2. For each candidate, read its `notes` field for chase history. If it shows
   fewer than two logged attempts, it hasn't actually been chased yet — send
   it back to `chase` instead of reviewing it here.
3. Check the linked contact's `status`. `dormant`, `past`, or
   `do_not_contact` strengthens the case for writing it off. `active` with a
   relationship still otherwise in good standing is a reason to look harder,
   not a reason to skip the invoice — present it either way and let the
   pattern speak.
4. Present each candidate to the operator one at a time: amount, days late,
   the chase history, the contact's status. For each one, ask directly:
   write it off, keep chasing, or handle it outside this tool entirely (a
   formal collections or legal step, which is out of scope here either way).
5. Only for the ones the operator confirms right there, individually, propose
   the exact command and run it. A general "yes, clear the list" does not
   count as confirmation for any invoice on it.

## Writes

`invoices.csv` — `status=written_off`, one row at a time, only after that
row's own explicit confirmation.

```
os set invoices i0032 status=written_off
```

## Finish line

`os aging`'s outstanding total drops by exactly the confirmed invoices'
amounts, and each one's row reads `status=written_off` with its chase history
still sitting in `notes`, unchanged.

## Refuses

- To consider any invoice under 60 days past due — that's still collectible
  and belongs to `chase`.
- To act on a blanket approval. Every write-off needs its own invoice number
  confirmed, not a nod at the list.
- To write off an invoice with no logged chase history — that's an invoice
  nobody actually tried on, not a lost cause.
- To delete a row. The status changes; the invoice and its history stay.
