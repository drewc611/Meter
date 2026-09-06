# 02 Data model

Nine registries, one config, plain CSV, UTF-8, comma separated, header row
first. Open them in anything. Edit them by hand if you want, then run
`os validate`.

## Identity

Every row has an `id` with a fixed prefix and four digits: `c0001` contacts,
`d0001` deals, `q0001` quotes, `p0001` projects, `t0001` tasks, `h0001` time,
`i0001` invoices, `e0001` expenses, `r0001` recurring. Ids are never reused and
never renumbered.

## Links

```
contacts ─┬─ deals ── quotes
          ├─ projects ─┬─ tasks ── time
          │            ├─ expenses
          │            └─ invoices
          └─ notes/<contact_id>.md
```

`os validate` checks every link. A reference to a row that does not exist is a
broken row and it will say so by file and line number.

## Money

Money is a plain decimal string in the file: `1250.00`. No symbols, no
thousands separators. The engine parses it to integer cents, does all arithmetic
in cents, and formats once at the end. That is why totals here always add up and
spreadsheet totals sometimes do not.

## Dates

ISO format, `2026-09-06`. The engine also reads `06/09/2026` and similar, but
writes ISO. Sort order and correctness both come free.

## Status vocabularies

Fixed, small, and enforced.

| Field | Allowed |
|---|---|
| contacts.status | lead, active, past, dormant, do_not_contact |
| deals.stage | new, qualified, quoted, negotiating, won, lost |
| deals.status | open, won, lost |
| quotes.status | draft, sent, accepted, declined, expired |
| projects.status | planned, active, blocked, done, cancelled |
| projects.health | green, amber, red |
| tasks.status | todo, doing, blocked, done, dropped |
| tasks.priority | low, normal, high, now |
| invoices.status | draft, sent, part_paid, paid, written_off |
| time.billable, expenses.billable | yes, no |
| recurring.type | income, cost |
| recurring.cadence | weekly, fortnightly, monthly, quarterly, yearly |

Nothing is ever deleted. `dropped`, `lost`, `cancelled` and `written_off` exist
so history stays intact.

## Two kinds of problem

`os validate` separates them and only one of them blocks.

- **Broken data**: a bad date, a bad number, a duplicate id, a link to nothing,
  an invoice marked paid with no payment date. Fix these.
- **Open loops**: a deal with no next action, an expired quote never resolved, an
  active project past its due date, a billable expense on an unbilled job. These
  are not bugs. They are the business asking for a decision.

## What else lives in data/

The nine registries are the business. These sit beside them and are created by
migrations, never by hand.

| File | What it holds | Chapter |
|---|---|---|
| `events.jsonl` | every change ever made, hash chained | 12 |
| `accounts.csv` `journal.csv` | the books | 13 |
| `category_map.csv` | expense category to account code | 13 |
| `imports.csv` | external ids already imported, so nothing arrives twice | 09 |
| `work.csv` `runs.jsonl` | the work registry and the tick run log | 11 |
| `.migrations` | which schema upgrades have been applied | 12 |
| `notes/` | markdown per contact, project and week |  |

## Backups

`os backup` copies `data/` with today's date. If the repo is a git repo, commit
`data/` and you have every version of the business you have ever had. That is
the closest thing to an undo button a business gets.
