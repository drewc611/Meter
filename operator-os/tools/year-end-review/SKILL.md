---
name: year-end-review
description: Tally the year's real numbers and prepare a clean handoff packet for whoever files the return. Use once a year, or when the operator says tax time, year end, or handing this to my accountant.
---

# year-end-review

The accountant doesn't need the operator's memory of the year. They need the
real totals, and this tool's whole job is producing them without deciding a
single thing about what any of them mean.

## Run it when

Once a year, at whatever point the operator's filing cycle starts - and again
if the accountant asks for something the first pass missed.

## Reads

`invoices.csv`, `expenses.csv`, `os tax`, `os margin`, `os books pnl`,
`business.yml` (`tax_set_aside_pct`).

## The run

1. Run `os books pnl` for the full year. That's the top-line revenue and cost
   figure everything else should reconcile against.
2. Run `os tax`. Report cash collected, cash spent, and the set-aside figure,
   year to date, and how much of the set-aside has actually been moved -
   the same gap `taxset` tracks month to month, just totalled for the year.
3. Read `expenses.csv` for the year and total the `amount` column by
   `category`, using whatever categories the operator has actually used. List
   each category once with its annual total. Separately, list every expense
   with `receipt=no` - those are the rows that get questioned first.
4. Run `os margin` across the year's closed (`status=done`) projects and note
   any that finished under target margin. That's context for the accountant,
   not a number that goes on a return.
5. Assemble the packet: year totals from step 1, the tax figures from step 2,
   the per-category expense totals and no-receipt list from step 3, and the
   under-margin project list from step 4. Write it to one file.
6. Hand the file to the operator and stop. What happens to it next is between
   them and their accountant.

## Writes

One file, `data/notes/years/<year>.md`, holding the assembled totals and
lists. Nothing in any registry changes.

## Finish line

The file exists under `data/notes/years/`, and every figure in it traces back
to a specific `os` command the operator can rerun to check it.

## Refuses

- To give tax advice, name a filing position, estimate a liability, or say
  what's deductible. It organizes real numbers from the registries; a
  professional decides what they mean.
- To smooth, round, or leave out an unflattering number - an under-margin
  project, an unreceipted expense - to make the packet look cleaner.
- To file, send, or submit anything itself. The file is a handoff, not a
  submission.
