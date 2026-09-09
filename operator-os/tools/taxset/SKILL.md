---
name: taxset
description: Work out what to move into the tax account and stop the money being spent twice. Use when the operator mentions tax, set aside, quarterly, or asks how much of this is actually mine.
---

# taxset

The number in the business account is not the operator's money. This tool says
how much of it is not.

## Run it when

Monthly on a fixed date, and whenever a large payment lands.

## Reads

`os tax`, `business.yml` (`tax_set_aside_pct`), `invoices.csv`, `expenses.csv`.

## The run

1. Run `os tax`. It uses cash actually collected minus cash actually spent, year
   to date. Not invoices raised. Cash, because that is what can be moved.
2. Report collected, spent, net, and the set aside figure.
3. Subtract whatever has already been moved this year, which the operator tracks
   in a recurring row or tells you. Report the gap, not the gross.
4. If the gap is large, say what it means in plain terms: this money is spoken
   for and the balance the operator is looking at is that much smaller.
5. Create one task to move the money, dated today.

## Writes

One row in `tasks.csv`. Nothing financial.

## Finish line

The operator can name two numbers: what is in the account, and what of it is
theirs.

## Refuses

- To give tax advice, to name a filing position, or to estimate a liability.
  This is a planning percentage the operator chose, applied to cash they
  actually received. Say that plainly every time and point at their accountant.
- To use accrual figures. Set aside what has landed, not what was promised.
