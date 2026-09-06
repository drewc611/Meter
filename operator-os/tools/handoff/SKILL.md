---
name: handoff
description: Close out a finished project properly — last hours logged, final invoice drafted, nothing left open — instead of just walking away from it. Use when the operator says a job is done, wrap it up, close this one out, or final invoice.
---

# handoff

A project that quietly stops being worked on is not the same as a project
that's closed. The difference is whatever's still unbilled or unresolved the
day nobody's looking at it anymore, and that's exactly what this tool checks
before it lets `status=done` get written.

## Run it when

Work on a project is actually finished and the operator wants it closed out,
not just left idle.

## Reads

`projects.csv`, `tasks.csv`, `time.csv`, `invoices.csv`, `business.yml`
(`invoice_terms_days`, `tax_rate_pct`).

## The run

1. Confirm which project. If the operator names it, use it; if not, list
   projects with a status other than `done` or `cancelled` and ask.
2. Check `tasks.csv` for that `project_id`. Any row still `todo`, `doing`, or
   `blocked` stops the close here — list them and ask the operator to resolve
   each one (mark it `done`, `dropped`, or explicitly say it's moving to
   another project) before continuing. Do not decide this for them.
3. Ask if there are any last hours to log. If so, log them to `time.csv` with
   an honest `billable` value before moving on — the final invoice should
   reflect what was actually worked, not what was worked as of last week.
4. Draft the final invoice from the project's billable time and expenses,
   status `draft`. Never `sent` — sending is the operator's call, same as the
   `invoice` tool.
5. Record the wrap-up as one closed task rather than free text nowhere: add a
   row to `tasks.csv` titled `Project wrap: <name>`, `status=done`,
   `done_on=today`, with a one-line `notes` summary of what shipped and
   anything still owed on either side.
6. Only now set the project itself `status=done` and `closed_on=today`.

## Writes

`time.csv` (any final entries), `invoices.csv` (one draft row),
`tasks.csv` (status changes on open tasks, plus one new closing task),
`projects.csv` (`status`, `closed_on`).

```
os add invoices project_id=p0002 contact_id=c0005 number=INV-2061 \
  issued=2026-09-06 due=2026-09-20 subtotal=6015.00 tax=385.00 \
  total=6400.00 status=draft
os add tasks project_id=p0002 title="Project wrap: Ashworth kitchen refit" \
  status=done done_on=2026-09-06 \
  notes="Delivered on scope. Snag list item (tap seal) left with customer, no charge."
os set projects p0002 status=done closed_on=2026-09-06
```

## Finish line

The project's row reads `status=done` with `closed_on` set, every task
against it reads `done` or `dropped`, and `invoices.csv` carries one draft
invoice for it that hasn't been sent.

## Refuses

- To send the final invoice. It drafts it. The operator sends it.
- To mark a project `done` while any linked task still sits in `todo`,
  `doing`, or `blocked`.
- To mark a project `done` while billable time against it isn't reflected in
  the draft invoice, without the operator explicitly saying it's being
  written off instead — that decision belongs to `writeoff-review`, not here.
- To write a wrap note describing work the operator didn't actually confirm.
