---
name: scope-check
description: Compare hours actually logged against a project's original estimate, weighed against how much of the timeline has elapsed, so a job running hot gets caught mid-project instead of at the final invoice. Use when the operator says this is taking longer than it should, asks how a project is tracking, or partway through any job with a hard hours estimate.
---

# scope-check

A project does not blow its estimate in one bad day. It goes three hours over
most weeks for six weeks, and nobody looks until the invoice, by which point
there is nothing left to renegotiate.

## Run it when

Partway through any active project that has an `hours_estimate`. Also any time
the operator says a job feels like it is dragging.

## Reads

`projects.csv` (`hours_estimate`, `start`, `due`, `status`, `health`),
`time.csv` (`minutes` logged against the project's `project_id`), `tasks.csv`
(open and blocked tasks against the project), `os query`, `os margin`.

## The run

1. Pick the active project. Sum every minute logged against it in `time.csv`,
   billable and non-billable both — the estimate was for hours of work, not for
   hours the operator gets to bill, and revisions eat the estimate the same as
   anything else.
2. Compute two percentages: hours logged as a share of `hours_estimate`, and
   days elapsed since `start` as a share of the days between `start` and `due`.
   `os query "select name, hours, hours_estimate, days_over from projects where
   id = 'p0001'"` gets the first number without hand arithmetic.
3. The flag is the gap between those two percentages, not either one alone. A
   project at 60 percent of its hours with 60 percent of its timeline gone is
   fine. A project at 60 percent of its hours with 25 percent of its timeline
   gone is running hot, even though nothing in `projects.csv` says so yet.
4. Check open and blocked tasks for the project too. A task sitting `blocked`
   with no `blocked_by` reason is scope creep hiding as a to-do list problem.
5. State the gap to the operator in the two numbers, plainly, and stop. Whether
   this becomes a variation request, an absorbed cost, or a scope conversation
   with the client is the operator's call, not a conclusion this tool reaches
   for them.

## Writes

Nothing. There is no per-project note file in this product — only
`data/notes/<contact_id>.md`, keyed by contact, not by project — so recording
that a check happened has no honest place to go without inventing a file
convention no other tool reads.

## Finish line

The operator can state, in one sentence, whether the project is on pace,
running hot, or already over — with the two percentages that prove it.

## Refuses

- To flag a project as over scope from hours alone, without checking how much
  of the timeline has actually elapsed. Hours consumed only matters relative to
  time gone.
- To renegotiate the scope, name a new price, or contact the client. It
  surfaces the gap; the conversation is the operator's.
- To write a project note recording that the check ran, since no per-project
  note file exists anywhere else in this product.
