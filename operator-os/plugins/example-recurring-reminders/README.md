# example-recurring-reminders

A read-only view over `recurring.csv`: what's overdue, what's due within a
window, and what has no `next_date` at all so it can't be judged either way.
Pairs with the `retainer` tool, which is where an actual renewal gets priced
and written.

## Install

```
os plugin enable example-recurring-reminders
os reminders
```

## What it adds

- `os reminders [days]` — recurring rows due within that many days (default
  14), split into overdue, upcoming, and undated sections.
- `tools/renewal-reminder/SKILL.md` — the weekly/monthly review walkthrough.

## Capabilities it asks for

- `commands` because it registers `reminders`.
- `tools` because it ships `tools/renewal-reminder/SKILL.md`.

It does not ask for `writes`. It only reads `recurring.csv` through
`ctx.data.load`; it never calls `os set` or `os add` itself.

## Refusals

None at the command level — a read-only listing has nothing to refuse. The
tool it ships refuses to reprice or re-date a row itself; that's `retainer`,
`vendor-audit`, or a plain `os set recurring` away.
