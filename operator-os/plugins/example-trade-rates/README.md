# example-trade-rates

A rate card kept in `data/rates.csv`. The file is created by this plugin's own
migration, not by the core schema, which is the point of the example: a plugin
can add a table to the data folder without anyone editing `lib/osdata.py`.

## Install

```
os plugin enable example-trade-rates
os plugin migrate example-trade-rates
os rates
```

`os migrate` also runs it, because migration 004 runs the pending migrations of
every enabled plugin.

## What it adds

- `data/rates.csv` with columns code, label, unit, rate, notes.
- `os rates` lists the card.
- `os rates set <code> <rate>` changes one rate and prints the before and after.

## Capabilities it asks for

- `commands` because it registers `rates`.
- `migrations` because it ships `migrations/001_rates.py`.

It does not ask for `writes`. It writes only `rates.csv`, a table its own
migration created, and `data/.plugin-files` records that ownership. Point it at
`contacts.csv` and it is refused by name.

## Refusals

It will not set a rate of zero or less, and it will not create a code that is
not already on the card. Adding a code is a hand edit to a five column CSV,
which is the honest amount of work that change deserves.

## What it does not get you

A rate change here does not appear in `os log`. The event log covers the core
registries. Tables a plugin owns are outside it.
