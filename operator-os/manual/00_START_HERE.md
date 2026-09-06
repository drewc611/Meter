# 00 Start here

You are holding a business operating system that lives in files on your own
machine. There is no account, no server, and nothing to log in to. If this
project disappeared tomorrow your business would keep running, because the
business is the files, not the software.

## The five ideas

1. **The data is the truth.** Nine CSV files and one config. Everything else,
   including every tool, is a way of reading or changing those files. If a tool
   and the data disagree, the data wins.
2. **Arithmetic is not judgment.** Money math happens in python, in `lib/`, the
   same way every time. Judgment happens in the tools, where a model helps you
   decide. Never let the two swap places.
3. **Every tool has a finish line.** Something you can check that proves the tool
   did what it said. If you cannot verify it, it did not happen.
4. **State beats memory.** A commitment with no date and no row does not exist.
5. **Nothing is destroyed.** Every change appends to a log before it writes a file,
   so undo, an audit trail and a time machine come free and history is never lost.

## The first thirty minutes

```
os doctor                 does this machine have what it needs
os migrate                set up the books and the rest of the schema
os use                    look at the eight encoded businesses
os use 01-field-service   load the closest one and look around
os brief                  see what a live business looks like
os sim                    the same question, with the odds attached
os books post && os books check
os use <name> --empty     keep its shape, drop its data
os setup                  nine questions about yours
os brief                  your own business, on your own screen
```

That last command is the finish line for day one. If it prints your business
name and your own numbers, you are installed.

## Where everything is

| Folder | What is in it |
|---|---|
| `data/` | your business. Back this up. Nothing else matters. |
| `manual/` | this control plane, 00 through 14 |
| `tools/` | 35 tools, one folder each |
| `lib/` `scripts/` | the engine, the kernel, and the command line |
| `adapters/` | eight ways to bring outside data in |
| `plugins/` | the extension point, with four working examples |
| `agents/` | the routing table and the scheduled runs |
| `migrations/` | numbered, applied once, backed up first |
| `workspaces/` | eight encoded businesses to start from |
| `workbook/` | every step and every prompt, Mac and Windows |
| `console/` | a local dashboard. Open the html file. No server. |
| `tests/` | the proofs. Run them yourself. |

## The chapters

00 to 08 are the product. 09 to 14 are the machinery underneath it.

| | |
|---|---|
| 01 Registry | the human index of the business |
| 02 Data model | nine registries, one config, what the columns mean |
| 03 Tools | the thirty-five tools and the contract they all follow |
| 04 Workspaces | the eight encoded businesses |
| 05 Rhythm | the cadence, about ninety minutes a week |
| 06 Money | every calculation, so you can check it |
| 07 Boundaries | what the system will not do |
| 08 Upgrade | changing it without breaking the business inside it |
| 09 Adapters | bringing outside data in |
| 10 Plugins | the capability model and how to write one |
| 11 Agents | three tiers, a routing table, and the reconciliation |
| 12 Kernel | the event log, undo, time travel, migrations |
| 13 Books | double entry, and the three proofs |
| 14 Query and risk | asking questions, and the odds |

## The rule that keeps this working

Anything a tool decides gets written to the data layer. Nothing important lives
in a conversation. Close the window, lose nothing.
