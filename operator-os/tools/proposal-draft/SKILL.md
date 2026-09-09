---
name: proposal-draft
description: Write the narrative scope of work — what's included, what's not, timeline, assumptions — that a quote's line items should match, before the numbers get built. Use when the operator says I need to write up a proposal, draft the scope, or before running quote on anything that isn't a small, obvious job.
---

# proposal-draft

A quote is a price. It is not, by itself, an agreement about what the price
buys. Most scope disputes trace back to a proposal that never got written
down, so both sides remember a different job.

## Run it when

A qualified deal is complex enough that the price alone won't settle what is
included — before `quote` builds the numbers, or whenever the operator says
the scope needs writing down.

## Reads

`deals.csv` (`title`, `value`, `stage`, `next_action`), `contacts.csv` (the
named contact), `os query` against `projects` for the nearest comparable
finished job — the same lookup `quote` does for cost — and
`data/notes/<contact_id>.md` for anything the contact has already specified
verbally.

## The run

1. Confirm the deal is `qualified` or later. Drafting a scope for a `new`,
   unqualified deal is writing fiction before there is a real conversation to
   draft from.
2. Find the nearest comparable finished project the same way `quote` does,
   and use its actual delivered scope as the starting shape, not a blank page.
3. Write four sections, in this order: what's included (specific — "the
   kitchen, not the adjoining laundry," not "the kitchen"), what's explicitly
   excluded (the gap every scope dispute lives in), the timeline (start,
   duration, anything the customer needs to supply first), and the
   assumptions the price rests on (access, site condition, decisions the
   customer still owes).
4. Pull anything the contact has already said verbally from
   `data/notes/<contact_id>.md` into the draft as a stated fact, not as the
   operator's inference. If the note says they asked for tile in the shower
   only, the draft says that — it does not guess whether they meant the whole
   bathroom.
5. Flag anywhere the draft is guessing rather than quoting a fact back to the
   operator explicitly, and stop there rather than paper over the gap with
   confident-sounding language.
6. Hand the draft to the operator to review before `quote` runs. The line
   items in the eventual quote should match this document section for
   section — if `quote` prices something this draft never mentions, one of
   the two is wrong.

## Writes

One draft file at `data/notes/proposals/<deal_id>.md`, following the same
per-entity note-file convention as `data/notes/<contact_id>.md`. Nothing in
`deals.csv`, `quotes.csv`, or any registry — it is a document, not a row.
Optionally, one reminder task:

```
os add tasks title="Review proposal draft for Whitcombe kitchen before quoting" \
  priority=normal due=2026-09-09 status=todo
```

## Finish line

A file exists at `data/notes/proposals/<deal_id>.md` with all four sections
filled in or explicitly marked as a gap the operator still owes an answer to,
and the operator has reviewed it before `quote` runs.

## Refuses

- To send the proposal to the contact. It drafts a document for the operator
  to review and send themselves, the same boundary every drafting tool in
  this repo keeps.
- To invent an inclusion, exclusion, or assumption not traceable to the
  comparable project, a note, or something the operator just said. A gap gets
  flagged, not filled with confident-sounding filler.
- To write anything into `quotes.csv` or `deals.csv`. This produces the
  narrative the quote should match; `quote` is the only tool that touches
  pricing rows.
