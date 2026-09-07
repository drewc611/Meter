---
name: loose-ends
description: Work through os validate's open-loop warnings one at a time until each is resolved or deliberately deferred. Use on a fixed cadence, or when the operator asks what's still open or what the warnings mean.
---

# loose-ends

`os validate`'s warnings never block anything, which is exactly why they're
the ones that pile up silently. This tool is the discipline of actually
working the list instead of scrolling past it.

## Run it when

Weekly or monthly, on a fixed cadence - and any time the operator says the
warning list looks long.

## Reads

`os validate` - specifically its open-loop warnings (a deal with no next
action, an expired quote never resolved, an active project past its due date,
a billable expense never invoiced), not its blocking errors.

## The run

1. Run `os validate`. Set the errors aside entirely - those are broken data
   and belong to whichever tool owns that registry, not this one. Work only
   the warning list.
2. Take warnings one at a time, oldest or most numerous type first:
   - **Deal, no next action** - read the deal with the operator and either set
     a real `next_action` and `next_action_due` on the spot, or hand it to
     `reaper` if it's actually gone quiet.
   - **Expired quote, unresolved** - ask the operator what happened. Set
     `status=declined` if the answer was no, `accepted` if the answer was yes
     and it just wasn't recorded, or `expired` if there was never an answer.
   - **Active project past due** - this is `projects`' territory: set
     `health` honestly, and either a new `due` date the operator states out
     loud, or `status=blocked` with the reason on the linked task.
   - **Billable expense never invoiced** - this is `invoice`'s territory:
     either raise the invoice now, or, if the operator has decided not to
     charge it, set `billable=no` and record why.
3. Every warning gets one of two outcomes: the underlying row changes, or the
   operator states out loud why it's staying open, in which case that reason
   gets written down as a task or note rather than left silent.
4. Don't stop halfway through a batch. A loose end half-reviewed is
   indistinguishable from one never looked at.

## Writes

Whatever the specific warning requires - there is no single fixed field. A
deal warning writes `next_action` / `next_action_due` in `deals.csv`; a quote
warning writes `status` in `quotes.csv`; a project warning writes `health` or
`due` in `projects.csv`; an expense warning writes an `invoices.csv` row or
`billable` in `expenses.csv`. A deferral that isn't fixed outright gets one
row in `tasks.csv` stating why, e.g.:

```
os add tasks title="Decide on lost deal d0031, no next action" due=2026-09-13 \
  priority=normal status=todo notes="operator deferred, waiting on client budget cycle"
```

## Finish line

`os validate` run again shows zero warnings, or every remaining one has a task
or note attached stating why it's staying open.

## Refuses

- To mark anything resolved without changing the row that caused the warning.
  Dismissing a warning is not the same as fixing it.
- To invent a next action, a due date, or a decision on a quote the operator
  hasn't actually stated.
- To touch anything in `os validate`'s error list. Broken data belongs to the
  tool that owns that registry, not this one.
