# Operator OS

The whole business, on your machine, in files you own.

Nine CSV files, an engine that does the money math the same way every time, an
event log that makes every change reversible, real double entry books, a query
language, a cash simulation with the odds attached, eight import adapters, a
plugin SDK, an agent layer that runs the whole thing on a schedule, thirty-five
tools, eight encoded businesses to start from, and a workbook covering every
step on Mac and Windows.

No account, no server, no subscription, nothing to log into. Python 3.9 and an
optional git install are the entire dependency list, on purpose.

## Five minutes to something real

```
bash scripts/install.sh          # Mac and Linux
                                 # Windows: powershell -ExecutionPolicy Bypass -File scripts\install.ps1
./os doctor                      # check this machine
./os migrate                     # set up the books and the rest of the schema
./os use 01-field-service        # load a real business
./os brief                       # see it running
./os sim                         # the same question, with the odds
./os books check                 # three proofs that the numbers tie
```

Then make it yours:

```
./os use 01-field-service --empty
./os setup
./os brief
```

That last command printing your own business name is the finish line for day one.

## What it does

```
os brief             what needs you today
os cash 90           when you run out, and on what date
os sim               the same forecast, run 2000 times, with the odds
os whatfirst         which single collection changes those odds most
os aging             who owes you and how late they are
os margin            what each job made after your own hours are paid
os anomalies         statistical flags across the whole business
os query "..."       ask the registries anything
os books check       three proofs that the books tie to the reports
os log / undo / asof / rebuild / drift
os pull bank-csv statement.csv --apply
os plugin list / verify / new
os ticks / tick / reconcile
os validate          every row and every link, checked
```

`os help` lists all forty three. `os help <group>` narrows it.

## Why files

You can open every one of them in Excel. Git gives you version history for free.
Nothing proprietary means nothing to migrate away from. The cost is no
concurrency, which does not matter when the business is one person.

## What is in the repo

| Folder | What it holds |
|---|---|
| `data/` | your business. Back this up. Nothing else matters. |
| `manual/` | the control plane, 00 through 14. Start with `00_START_HERE.md`. |
| `tools/` | 35 tools, written to be read by a person and loaded by an assistant |
| `workbook/` | nine modules, every step and every prompt, Mac and Windows |
| `workspaces/` | eight encoded businesses, dates always current |
| `adapters/` | bank, Stripe, PayPal, Square, QuickBooks, calendar, mailbox, generic CSV |
| `plugins/` | the SDK and four working examples |
| `agents/` | the routing table, the roster, and five scheduled runs |
| `lib/` `scripts/` `migrations/` | the engine, the launcher, the upgrades |
| `console/` | a local dashboard. Open the html file. No server. |
| `tests/` | the proofs. Run them yourself. |

## The proofs

```
python3 tests/test_parity.py      the browser engine matches the python engine, line for line
python3 tests/test_adapters.py    imports are read only until you say so, and idempotent
python3 tests/test_plugins.py     the capability model actually refuses things
python3 tests/test_agentops.py    routing refuses, and reconcile sorts risk before waste
./os rebuild                      every registry reconstructed from the log alone
./os books check                  the books tie to the reports
```

## The five workspaces

Pick by failure mode, not by trade.

| Workspace | The leak it teaches |
|---|---|
| `01-field-service` | money earned and never collected |
| `02-fractional-consultant` | scope creep and revenue concentration |
| `03-design-studio` | hours past estimate, revisions given away |
| `04-maker-brand` | cash tied up in stock, wholesale priced off retail |
| `05-coach-practice` | the hours ceiling, and unpaid time between sessions |

## What it will not do

Never sends anything. Never deletes a row. Never contacts anyone marked
`do_not_contact`. Never leaves your machine. Never gives tax or legal advice.
Every tool ends with a finish line you check yourself. Full list in
`manual/07_BOUNDARIES.md`.

## Licence

`LICENCE-PLAIN.md` for what you own, in plain writing. `LICENSE` for the formal
version.
