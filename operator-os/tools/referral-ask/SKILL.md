---
name: referral-ask
description: Draft a referral ask for a client who has just paid, on time, with no friction behind them — never before it's earned. Use when an invoice flips to paid, or the operator asks who they should ask for a referral.
---

# referral-ask

A referral ask lands well exactly once: right after the client has paid,
paid without a fight, and still remembers why they were glad they hired you.
Ask before that and it reads as sales. Ask too long after and it reads as
forgotten. This tool only fires in the window where it's actually earned.

## Run it when

An invoice moves to `status=paid` for a contact whose relationship, on the
record, looks healthy.

## Reads

`invoices.csv`, `contacts.csv`, `data/notes/<contact_id>.md`.

## The run

1. Find the contact behind the invoice that just went `paid`. If that contact
   is `do_not_contact`, stop immediately — say so and go no further.
2. Check every invoice this contact has ever had. If any of them ever sat
   well past due, needed more than one chase, or was ever `written_off`, this
   one hasn't been earned yet either. A good payment this time doesn't erase
   a rocky history — hold off and say why.
3. Check `last_contact` and the contact's note file for anything reading as
   friction — a complaint, a dispute, a discount given to keep them. If the
   relationship looks anything less than straightforwardly good, hold off.
4. If it's clear, draft one short, specific ask that names the actual work
   just delivered — not a generic "know anyone who needs a hand" line — for
   the operator to personalize and send themselves.
5. Ask the operator to confirm whether and when it actually goes out. Only on
   that confirmation, append one dated line to the contact's note file
   recording that a referral ask was made against this invoice number, so the
   same paid invoice never gets asked against twice.

## Writes

Nothing, unless the operator confirms the ask was actually sent — in which
case one line is appended to `data/notes/<contact_id>.md`. Never touches
`invoices.csv` or `contacts.csv`.

```
echo "2026-09-06: referral ask sent re INV-2061, delivered kitchen refit" \
  >> data/notes/c0005.md
```

## Finish line

Every invoice that turned `paid` today produced either a drafted ask or a
stated reason it didn't, and no contact's note file carries two referral-ask
lines against the same invoice.

## Refuses

- To ask a contact marked `do_not_contact`, under any framing.
- To ask on behalf of a relationship with any invoice that was ever late,
  disputed, or written off — the ask has to feel earned, not automatic.
- To send anything itself. It drafts; the operator personalizes and sends.
- To ask twice against the same paid invoice once the note file already
  shows it was asked.
