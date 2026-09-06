---
name: crm
description: Keep the record of who people are, what was agreed, and when they were last spoken to, so nothing depends on the operator's memory. Use when a new person appears, after any conversation, or when the operator asks who someone is.
---

# crm

A solo business has no handover. Everything lives in one head, and one head
forgets that a customer already asked for the discount twice.

## Run it when

Any first contact, any conversation worth remembering, and any time a
relationship changes shape.

## Reads

`contacts.csv`, `data/notes/<contact_id>.md`, `deals.csv`, `invoices.csv`.

## The run

1. New person: one row, with `source` filled in. Source is how they found the
   business and it is the field that later tells the operator which marketing is
   real and which is a story they tell themselves.
2. After a conversation: update `last_contact`, and write what was actually said
   into `data/notes/<contact_id>.md`. Facts and commitments, not summaries.
   Prices quoted verbally. Things promised. Things refused.
3. Status means what it says. `lead` has never paid. `active` is current.
   `past` used to be. `dormant` could return. `do_not_contact` is final and is
   honoured by every other tool in the repo without exception.
4. Tags carry the things that change how the operator treats someone:
   `slow-pay`, `referrer`, `commercial`, `price-sensitive`. Keep the vocabulary
   small. Twenty tags means no tags.
5. Once a quarter, look at `active` contacts with a `last_contact` older than
   ninety days. That is the dormant list and it is the cheapest demand the
   business will ever find.

## Writes

`contacts.csv` and note files under `data/notes/`.

```
os add contacts name="Helen Ashworth" role=homeowner email=hashworth@example.com \
  phone=555-0108 source=referral status=lead first_contact=2026-08-28
os set contacts c0005 last_contact=2026-09-06 status=active
```

## Finish line

`os find <name>` returns the person, their note, and every deal and invoice
attached to them.

## Refuses

- To write an inference into a note as if the person said it. Notes record what
  was said. Judgments go in clearly marked as the operator's own.
- To contact anyone marked `do_not_contact`, for any reason, through any tool.
