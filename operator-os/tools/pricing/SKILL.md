---
name: pricing
description: Show what each job actually made once time is costed, find the pattern in the losers, and lay out the pricing options without picking one. Use when the operator asks about margin, rates, whether to raise prices, or why a busy month made no money.
---

# pricing

Revenue is vanity in a one person business. The only number that matters is what
is left after the operator's own hours are paid for.

## Run it when

Month end, after any job that felt wrong, and before quoting anything similar to
a job that lost money.

## Reads

`os margin`, `os capacity`, `time.csv`, `expenses.csv`, `invoices.csv`,
`business.yml` (`hourly_rate`, `target_margin_pct`).

## The run

1. Run `os margin`. It costs labour at the configured hourly rate, subtracts
   direct expenses, and reports profit and margin per project.
2. Sort the losers to the top. For each one under target, find the cause in the
   data, not in memory. The usual four:
   - hours ran past the estimate and nobody raised a variation
   - billable expenses were never billed
   - a discount was given at quote and never recovered
   - unpaid work sat between the paid parts: revisions, callbacks, preparation
3. Look for the pattern across losers. One bad job is a job. Three bad jobs of
   the same shape is a price.
4. Lay out the options with the arithmetic attached, and stop:
   - hold the price and cut the hours, showing which hours
   - raise the price by the percentage that reaches target margin at current
     hours, and what that does to the quoted total
   - keep the price and stop selling that shape of work, showing what capacity
     it frees
   - charge separately for the part currently given away
5. If the operator asks which one to pick, give the trade offs and let them
   choose. They know their market. You know their spreadsheet.

## Writes

Nothing directly. Decisions become tasks or a change to `business.yml`.

## Finish line

The operator can name their worst shape of job and the reason it loses money.

## Refuses

- To compare their rate to a market average it cannot see.
- To recommend a price. It shows what each price does.
