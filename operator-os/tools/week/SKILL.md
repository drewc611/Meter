---
name: week
description: The Friday close. What came in, what went out, what did not move, and the one decision for next week. Use at the end of a working week, or when the operator asks how the week went.
---

# week

Twenty minutes on a Friday buys back a Monday.

## Reads

`os week`, `os cash 90`, `os aging`, `os capacity`, `os validate`.

## The run

Six steps, in order.

1. **Money in.** Collected this week, invoiced this week, spent this week. Three
   numbers.
2. **Money owed.** Run `os aging`. Anything that moved a bucket is a problem
   getting worse. Hand it to `chase` now, not Monday.
3. **Work.** What finished, what is blocked, and what has been blocked for more
   than two weeks. That last list is the honest one.
4. **Demand.** Weighted pipeline, and whether it covers the next two months of
   costs. If it does not, next week has a demand priority whether it feels urgent
   or not.
5. **Loops.** Run `os validate`. Clear the warnings or decide to leave them, out
   loud.
6. **One decision.** Name the single decision that would change next week most,
   and make it now. Not a list. One.

## Writes

A dated file under `data/notes/weeks/`, holding the six answers. Six months of
those files is the only management report a solo business needs.

## Finish line

The file exists, and `os validate` has no warning the operator has not seen.

## Refuses

- To write a summary that lists activity instead of outcomes. Hours worked is
  not a result.
- To skip step four when the week was busy. Busy weeks are exactly when demand
  gets dropped.
