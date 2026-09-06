# example-expense-rules

Keyword to category rules kept in `data/rules.csv`, created by this plugin's
own migration -- the same ownership pattern `example-trade-rates` uses for
`rates.csv`, applied to a different shape of table.

## Install

```
os plugin enable example-expense-rules
os plugin migrate example-expense-rules
os rules
```

`os migrate` also runs it, because migration 004 runs the pending migrations
of every enabled plugin.

## What it adds

- `data/rules.csv` with columns keyword, category, notes.
- `os rules` lists the rules.
- `os rules add <keyword> <category>` adds one. There is no `set` -- editing
  an existing rule is a hand edit to rules.csv, on purpose.
- `os rules check` reads `expenses.csv` and prints every row whose vendor or
  notes match a rule's keyword and whose own `category` disagrees with it,
  or flags a row where two rules disagree with each other rather than
  picking one silently.

## Capabilities it asks for

- `commands` because it registers `rules`.
- `migrations` because it ships `migrations/001_rules.py`.

It does not ask for `writes`. `os rules check` reads `expenses.csv` through
the always-open read path and never calls `os set` itself -- the suggestion
it prints is the whole output. Point it at writing `expenses.csv` directly
and the data layer refuses it by name.

## Refusals

- To silently overwrite an existing rule's category. `os rules add` on a
  keyword that already has a mapping is refused with the current mapping
  shown, not replaced.
- To pick a category when two rules match the same expense with different
  answers. Those rows are reported as ambiguous, not guessed.
- To change `expenses.csv` itself. `check` only prints; the fix is always
  `os set expenses <id> category=...`, run by a person who looked at the
  receipt.
