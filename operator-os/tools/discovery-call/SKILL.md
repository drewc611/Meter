---
name: discovery-call
description: Pull a contact's history, prior deals and projects, and notes into one short brief before a sales call, so the operator walks in already knowing what was said last time. Use before any call with a contact or deal, when the operator says prep me for this call, or asks what do I know about this person.
---

# discovery-call

The second conversation with someone is only useful if it doesn't start from
zero. Most solo operators re-ask a question the person already answered,
because the answer lived in a memory of a call from four months ago instead
of on a screen open in the ten minutes before this one.

## Run it when

Before any call, meeting, or sales conversation with a contact — new or
returning — where money might change hands.

## Reads

`contacts.csv` (full row), `deals.csv` (every row for that `contact_id`),
`projects.csv` (every row for that `contact_id`), `quotes.csv` and
`invoices.csv` (for those deals and projects), `data/notes/<contact_id>.md`.

## The run

1. Find the contact. If the operator names a deal instead of a person, resolve
   it to the `contact_id` on that deal first.
2. Pull every deal against that `contact_id`, open and closed. Note the
   pattern: how many times they have been quoted, what stage past deals died
   at, and the `lost_reason` if any did.
3. Pull every project against that `contact_id` — what was delivered, at what
   `health`, and whether it closed clean (paid on time) or ugly (overrun,
   chased for payment). A past customer who ran every job over budget is a
   fact the operator should walk in with, not rediscover mid-call.
4. Read `data/notes/<contact_id>.md` in full and pull forward anything that
   reads as a standing fact or commitment: a price mentioned verbally, a
   constraint they stated, a reason they gave for going quiet.
5. Assemble the brief as five things, in this order: who they are and how they
   found the business (`source`), the commercial history in one line per
   deal/project, anything outstanding right now (open deal stage, unpaid
   invoice, open `next_action`), the two or three facts from notes worth
   holding in mind, and the specific thing this call needs to accomplish, from
   the deal's `next_action` if there is one.
6. If there is no history at all — a genuinely new contact — say so plainly
   instead of padding the brief with inference. An empty brief is a correct
   brief.

## Writes

Nothing, for the brief itself. What was actually said on the call belongs in
`data/notes/<contact_id>.md` afterward, and updating `last_contact` — that is
the `crm` tool's job, run separately once the call is over, so the record of
what was said lives in exactly one place rather than two tools racing to own
the same note file.

## Finish line

The operator can start the call without asking the contact a single question
the record already answered.

## Refuses

- To guess at a fact not present in the record and present it as if it were.
  A gap in the brief says "no note on this," it does not get filled in.
- To prep a call for anyone marked `do_not_contact`. If the contact is
  `do_not_contact`, there is no call to prep for — it says so instead.
- To write the after-call notes itself as part of this run. That is `crm`'s
  job, and doing it here too would leave two competing records of the same
  conversation.
