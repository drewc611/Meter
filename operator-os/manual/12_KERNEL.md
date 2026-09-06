# 12 The kernel

Version 1 wrote CSV files. Version 2 writes an event first, then the file. That
one change is where undo, the audit trail and the time machine come from, and it
cost the product no database and no server.

## The log

`data/events.jsonl`, one JSON object per line, appended before any registry is
written.

```
{"seq":84,"ts":"2026-09-06T07:26:11Z","actor":"you","op":"add",
 "entity":"contacts","id":"c0011","before":null,"after":{...},
 "cause":"os add","tick":null,"prev":"1f0c...","hash":"9ab3..."}
```

`hash` covers the line's own content plus the previous line's hash. Remove a
line, or edit one after the fact, and the chain no longer joins up. `os drift`
reports that as a problem with the log itself, separately from anything to do
with your data.

This is tamper evident, not tamper proof. Anyone with the file can rewrite the
whole chain. The point is that they cannot rewrite one line of it quietly, which
is the failure that actually happens.

## What it buys

| Command | What it does |
|---|---|
| `os log [n] [registry]` | the last n changes, with the fields that moved |
| `os undo [n]` | reverses the last n changes, and logs the reversal |
| `os asof <date>` | writes the whole business as it stood, into its own folder |
| `os rebuild` | reconstructs every registry from the log alone |
| `os drift` | which rows you edited outside the tools, and which fields |
| `os adopt` | writes those hand edits into the log so the two agree again |

`os rebuild` is the one that matters. If the log can reproduce your data exactly,
the log is complete. If it cannot, the difference is printed and you know
precisely what is missing. Nothing here asks you to trust it.

## Hand edits are allowed

The files are yours and they are CSV on purpose. Open one in Excel, change a
price, save it. Nothing breaks. `os drift` will tell you what you did, and
`os adopt` folds it into the history so the next `os rebuild` still matches.

The alternative, locking the files, would make the product a database with extra
steps.

## Time travel

```
os asof 2026-06-30
OPERATOR_OS_DATA=data.asof-2026-06-30 os brief
```

Every command works against any data folder, because the data folder is just a
path. That is how the parity tests, the workspaces and the point in time copies
all work with no special cases.

## Migrations

`migrations/NNN_name.py`, each with one function `up(data_dir)` and a
`DESCRIPTION`. They run in order, once, and `data/.migrations` records what has
been applied. Every run copies `data/` to `data.before-migrate` first.

```
os migrate --list     what exists and what has run
os migrate --dry      what would run, changing nothing
os migrate            run the pending ones
```

An upgrade never asks you to export and reimport, because there is nothing
holding your data that could refuse to give it back.

## The one rule

Nothing in an update writes to `data/`. Updates change `manual/`, `tools/`,
`lib/`, `scripts/`, `adapters/`, `plugins/`, `agents/`, `workspaces/` and
`workbook/`. If an update asks you to replace `data/`, something has gone wrong.
Stop and ask.
