---
name: reaper
description: Remove what is dead so the live things are visible. Closes stale deals, drops rotted tasks, archives finished projects, and cancels costs nobody uses. Use monthly, or when the operator says the list is overwhelming.
---

# reaper

A file full of things that will never happen is worse than an empty one, because
it hides the four things that matter behind forty that do not.

## Run it when

Monthly, on a fixed date. Also the moment a list stops being read because it is
too long.

## Reads

Every registry, plus `os validate`.

## The run

Work these five lists. Propose each removal with its reason and let the operator
confirm in batches, not one by one.

1. **Tasks** with a due date more than thirty days past, still `todo`, never
   touched. Ask once: is this real. If the answer takes more than a second, it is
   not. Set `status=dropped`, keep the row. Dropped is history. Deleted is
   amnesia.
2. **Deals** open more than sixty days with no next action and no contact. Close
   as `lost` with `lost_reason` "went quiet". These are the rows inflating the
   cash forecast.
3. **Quotes** past expiry with no decision. Mark `expired`. If the operator wants
   it alive, it needs a new quote with a new number, not a stale one kept warm.
4. **Projects** finished and fully invoiced and fully paid, older than ninety
   days. `status=done`, `closed_on` set, and out of every active view.
5. **Recurring costs.** Read the list out loud, one line at a time, with the
   annual figure next to each. This is the highest yield ten minutes in the whole
   system and almost nobody does it. Anything the operator cannot immediately say
   the purpose of goes on a cancel list.

## Writes

Status changes across `tasks.csv`, `deals.csv`, `quotes.csv`, `projects.csv`.
Cancellation tasks in `tasks.csv`.

## Finish line

`os brief` fits on one screen and every row on it is real.

## Refuses

- To delete any row. It changes status. The history stays.
- To drop anything in a batch the operator has not seen listed.
