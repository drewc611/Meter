# 08 Upgrade

How to change the system without breaking the business inside it.

## The line that must not be crossed

`data/` is yours. Nothing in an update ever writes to it. Updates change `manual/`,
`tools/`, `lib/`, `scripts/`, `workspaces/` and `workbook/`. If an update asks
you to replace `data/`, something has gone wrong. Stop.

## Updating

```
os backup
git pull
os doctor
os validate
```

Four commands, in that order, every time. `os backup` first is not optional.

## Adding a field to a registry

1. Add the column name to `SCHEMA` in `lib/osdata.py`.
2. Add it to the end of the `cols` list, never the middle. Existing files keep
   working because the reader is column name based, but humans read positionally
   and a moved column causes mistakes.
3. If it is money, add it to `MONEY_COLS`. If it is a date, make sure the name
   ends with one of the date hints so the validator checks it.
4. Run `os validate`. Existing rows get a blank in the new column, which is fine.

## Adding a tool

Copy the six section shape from any existing `SKILL.md`. Give it a finish line
and at least one refusal. Put it in `tools/<name>/SKILL.md`. Add it to the table
in `manual/03_TOOLS.md` so it exists in the index a human reads, not just the folder
a machine reads.

## Adding a command

Deterministic work belongs in `scripts/os.py`, not in a tool. If it is
arithmetic, a filter, or a report, write it as a command. If it needs judgment,
write it as a tool. When in doubt: could two people disagree about the right
answer? If no, it is a command.

## Renaming the product

```
python3 scripts/rename.py "Your Name Here"
```

Changes `brand.json` and every visible reference. The data layer is untouched.

## When something breaks

`os doctor` first, `os validate` second, and the backup third. Restoring is
copying a folder back. There is no migration, no repair mode, and nothing to
reinstall, because the whole system is files.
