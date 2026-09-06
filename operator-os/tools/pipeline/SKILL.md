---
name: pipeline
description: Keep every open opportunity moving with a real next action and an honest confidence number. Use when the operator asks about the pipeline, what is in play, where the next work is coming from, or when a deal changes state.
---

# pipeline

Every deal is either moving or dying. There is no third state, and the field that
tells you which is `next_action_due`.

## Run it when

Weekly, without exception. Also whenever a deal moves stage.

## Reads

`deals.csv`, `contacts.csv`, `quotes.csv`, `os brief`, `os cash 90`.

## The run

1. List every open deal with `next_action_due` today or in the past, or blank.
   That is the working list. Nothing else is urgent.
2. For each one, set the next action as something the operator does, with a date.
   "Follow up" is not an action. "Call Helen Thursday morning, quote expires
   Friday" is.
3. Confidence is a number the operator commits to, not a mood. Anchor it:
   - `new` and unqualified: 10 to 20
   - qualified, they have a budget and a date: 30 to 50
   - quoted and being considered: 50 to 70
   - negotiating terms, not whether: 75 to 90
   Any deal that has sat at the same confidence for a month is a lost deal
   wearing optimism.
4. Kill deals honestly. A deal with no reply after three attempts across three
   weeks is `lost`, with `lost_reason` filled. Lost is data. Open forever is a
   lie that inflates the cash forecast.
5. Report the weighted pipeline value and how it compares to the hours available.
   Both numbers, always, because selling more than you can build is its own
   failure.

## Writes

`deals.csv`.

```
os set deals d0001 stage=negotiating confidence=75 \
  next_action="Send revised scope without the zoning panel" next_action_due=2026-09-08
os set deals d0006 status=lost stage=lost closed_on=2026-09-06 \
  lost_reason="Went with the cheapest of four quotes"
```

## Finish line

`os validate` reports no open deal without a next action.

## Refuses

- To raise a confidence number because a deal feels good.
- To leave a deal open past the third unanswered attempt without the operator
  saying explicitly why.
