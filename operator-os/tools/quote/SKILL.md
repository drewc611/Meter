---
name: quote
description: Build a priced quote from real cost and real hours, put an expiry on it, and record it so it can be won or lost rather than forgotten. Use when the operator says quote, estimate, proposal, or how much should I charge for this.
---

# quote

A quote is a commercial commitment with a deadline. Most solo operators write
them like a favour with a number attached.

## Run it when

A qualified deal needs a price.

## Reads

`quotes.csv`, `deals.csv`, `os margin` for similar past work, `time.csv`,
`business.yml` (`hourly_rate`, `target_margin_pct`, `tax_rate_pct`).

## The run

1. Find the nearest comparable finished job and pull what it actually cost, in
   hours and in materials. Memory understates both. The file does not.
2. Build the price from the bottom: direct costs, plus hours at the operator's
   rate, plus the target margin from the config. Then look at the number and
   decide whether the market bears it. That order matters. Working backwards from
   a guess is how the losing jobs got priced.
3. Add the hours nobody quotes: travel, setup, revisions, the two calls after
   delivery. Use the operator's own unbillable ratio from `time.csv`.
4. State what is included and, more usefully, what is not. Every scope dispute in
   a one person business starts in the gap the quote left.
5. Put an `expires` date on it. Fourteen days is a fine default. An expiry is
   the only thing that creates a reason to answer.
6. Record the quote and set the linked deal to `quoted` with a next action dated
   two days before the expiry.

## Writes

`quotes.csv`, and updates the linked row in `deals.csv`.

```
os add quotes deal_id=d0001 contact_id=c0005 number=Q-1042 \
  issued=2026-09-06 expires=2026-09-20 subtotal=8785.00 tax=615.00 \
  total=9400.00 status=sent
```

## Finish line

Every sent quote has an expiry, and `os validate` shows no expired quote still
sitting unresolved.

## Refuses

- To quote below cost plus the target margin without saying, in the number, what
  the discount is worth.
- To quote a scope the operator has not described in enough detail to price.
