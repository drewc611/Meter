# Architecture map

Working name: **Operator OS**. The name lives in one file (`brand.json`) and one
script (`scripts/rename.sh`) changes it everywhere. Nothing else hardcodes it.

## What this is

A business operating system that ships as a repo. The buyer clones it, runs one
installer, picks a starting workspace, and by the end of the first sitting has
their own contacts, jobs, invoices and cash forecast running as files on their
own disk. No SaaS login. No data held hostage. No chat scroll to lose.

## The five layers

```
  WORKBOOK        written steps and exact prompts, Mac and Windows
      |
  TOOLS           20 skills that read and write the data layer
      |
  ENGINE          deterministic python: money math, aging, forecast, validate
      |
  DATA            plain CSV plus one YAML config, git tracked, Excel openable
      |
  WORKSPACES      5 encoded businesses to fork from, personas included
```

Judgment lives in the tools. Arithmetic lives in the engine. Truth lives in the
data. That separation is the whole design: a language model can be wrong about
what to do next and still never be wrong about what you are owed.

## Why CSV and not a database

Three reasons, in order of how much they matter to a solo operator.

1. The buyer can open every file in Excel, Numbers or Google Sheets without
   asking permission from anything. If the software dies, the business does not.
2. Git gives version history for free. Every change to a price, a stage, an
   invoice is a diff with a date on it.
3. Any tool, any model, any script can read it. There is no migration path to be
   trapped in because there is nothing proprietary to migrate.

The cost is no concurrency and no enforced foreign keys. `os validate` covers the
second. The first does not matter for one person.

## The data layer

Nine registries plus one config file. Every row has a stable `id`. Every link is
an id reference validated by `os validate`.

| File | Holds | Written by |
|---|---|---|
| `business.yml` | rates, tax, terms, capacity, targets | setup, you |
| `contacts.csv` | people and companies | crm, inbox |
| `deals.csv` | open and closed opportunities | pipeline, quote |
| `quotes.csv` | estimates sent | quote |
| `projects.csv` | committed work | projects |
| `tasks.csv` | the doing | tasks, day |
| `time.csv` | hours against work | time |
| `invoices.csv` | billing and payment state | invoice, chase |
| `expenses.csv` | money out | expenses |
| `recurring.csv` | fixed income and fixed costs | money |

Notes live as markdown under `data/notes/` named by record id, so a contact's
history is a file you can read without any tool at all.

## The 20 tools

Grouped by what they protect.

**Money (6)** invoice, chase, expenses, cashflow, taxset, pricing
**Work (5)** projects, tasks, time, schedule, capacity
**Demand (5)** crm, pipeline, quote, followup, content
**Control (4)** day, week, reaper, doctor

Every tool follows the same contract, documented in `manual/03_TOOLS.md`:
it names its inputs, it names the exact files it writes, it ends with a finish
line the operator can verify without trusting the tool.

## The engine

`lib/osdata.py` loads and saves registries and validates references.
`scripts/os.py` is the command line: `os cash 90`, `os aging`, `os margin`,
`os brief`, `os validate`, `os add`, `os set`.

Money is handled in integer cents throughout. Nothing rounds twice.

## Delivery

Self serve. Install, workbook, recordings. No live sessions, so nothing about the
product depends on the author's calendar. The pre flight clinic from the cohort
model becomes `os doctor`, which checks the machine and prints exactly what is
missing and the one command that fixes it.

## What ships to the buyer

```
operator-os/
  README.md              start here, 5 minutes to first result
  LICENCE-PLAIN.md       what you own, before you pay
  LICENSE                the legal version
  brand.json             the one name file
  manual/               the control plane, 00 through 08
  tools/                 20 skills
  lib/  scripts/         the engine and the installers
  workspaces/            5 encoded businesses with personas
  workbook/              every step, every prompt, Mac and Windows
  console/               a local dashboard, no server, no account
  data/                  yours, created at install, git ignored by default
```
