# example-quotes-pdf

Renders one quote from `quotes.csv` as a self contained HTML page sized for A4
that prints cleanly to PDF from any browser. The CSS is inline and there are no
images, fonts or scripts, so the file works offline and keeps working when this
repository is long gone.

This plugin exists to show two things: a plugin command sitting alongside the
core commands in `os help`, and a plugin that ships a tool.

## Install

```
os plugin enable example-quotes-pdf
os plugin verify example-quotes-pdf
os quote-sheet q0001
```

## What it adds

- `os quote-sheet <quote_id>` writes `data/out/quote-<number>.html`.
- `tools/quote-sheet/SKILL.md`, a tool in the six section shape.

## Capabilities it asks for

- `commands` because it registers `quote-sheet`.
- `tools` because it ships a SKILL.md.

It does not ask for `writes`. It never changes a row. If it tried, the data
layer would raise and name it.

## Refusals

It will not price anything, will not edit the quote row, and will not send.
