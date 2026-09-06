---
name: followup
description: Work the loops that are open with people, quotes waiting on an answer, jobs finished without a review asked for, and customers who have gone quiet. Use weekly, or when the operator asks what is hanging.
---

# followup

Most lost revenue in a solo business is not lost to a competitor. It is lost to
silence.

## Run it when

Weekly. Ten minutes. It pairs with `chase`, which does the same job for money.

## Reads

`quotes.csv`, `deals.csv`, `contacts.csv`, `projects.csv`, `invoices.csv`,
`data/notes/`.

## The run

Four lists, in this order.

1. **Quotes with no answer.** Sent, not expired, no decision. Draft one message
   per quote. Not a nudge. A question that can be answered in one word: is this
   still live, or should I close the file.
2. **Deals with a past due next action.** Straight into the `pipeline` tool.
3. **Finished jobs with no review or referral asked for.** Within two weeks of
   `closed_on` is when the ask lands. After a month it is awkward. Draft the ask
   for each one, referencing the specific job.
4. **Dormant customers.** `active` contacts not spoken to in ninety days. The
   message is not a sales message. It is a specific, useful, one line reason to
   be in touch, drawn from their note file.

## Writes

One task per follow up in `tasks.csv`, dated. Updates `last_contact` in
`contacts.csv` when a message goes out.

## Finish line

Zero sent quotes older than their expiry with no decision recorded.

## Refuses

- To write a follow up that says "just checking in". If there is no reason to be
  in touch, the honest move is to close the loop and say so.
- To contact anyone marked `do_not_contact`.
