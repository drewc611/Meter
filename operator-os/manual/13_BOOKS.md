# 13 The books

Double entry, derived from the rows you already keep. You never write a journal
entry unless you want to.

## Why bother

Three reasons, and none of them is that an accountant told you to.

1. It catches errors that no report catches. A single sided mistake shows up
   immediately, because the entry will not balance.
2. It ties your reports to each other. The aging report and the balance sheet are
   computed by completely different paths, and `os books check` proves they agree.
   When they do not, one of them is wrong and you find out in seconds.
3. It is what your accountant wants, in the format they expect, without you
   keeping a second set of records.

## How posting works

`os books post` reads the registries and writes `data/journal.csv`. It is
deterministic and idempotent: run it as often as you like. Manual entries you
added yourself are kept and never overwritten.

| Event | Debit | Credit |
|---|---|---|
| invoice sent | money owed to you | sales, and tax set aside |
| invoice paid | bank | money owed to you |
| invoice written off | other | money owed to you |
| expense | its mapped account | bank |
| opening balance | bank | owner capital |

The mapping from your free text expense categories to account codes lives in
`data/category_map.csv`, created once by a migration and yours to edit.

## The three proofs

`os books check` runs all three and names the one that fails.

1. **Every entry balances.** Debits equal credits, entry by entry.
2. **The trial balance nets to zero.** Across the whole journal.
3. **Money owed ties to the aging report.** The books arrive at that figure
   through the journal. `os aging` arrives at it through the invoice registry.
   They should never disagree.

There is a fourth check that runs before the others: whether the journal is out
of date. Change a row and the journal is stale until you post again, and the tool
says exactly that rather than reporting a false disagreement.

## The reports

```
os books                    trial balance
os books pnl [from] [to]    profit and loss
os books balance [asof]     balance sheet, with the balancing check printed
os books accounts           the chart of accounts
os books entry <key>        every line for one entry, source id or account
```

## What it still is not

It is not an accountant, it does not file anything, and it does not touch money.
It does not accrue, depreciate, or handle multiple currencies. It gives you a
clean, provable set of books for one person's business, which is the ninety
percent case, and hands them to whoever does your return.
