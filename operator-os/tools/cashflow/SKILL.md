---
name: cashflow
description: Read the cash forecast and turn it into the one decision it implies. Use when the operator asks about cash, runway, whether they can afford something, whether they can pay themselves, or says money is tight.
---

# cashflow

The forecast is arithmetic and lives in the engine. The judgment is what to do
about the low point, and that is this tool.

## Run it when

Before spending anything large. Before taking on work at a discount. Weekly, as
part of the week close. Any time the operator asks whether they can afford
something.

## Reads

`os cash 90 --detail`. That is the whole input. Do not recompute anything by
hand and do not adjust the engine's numbers in your head.

## How the forecast works, so you can explain it honestly

- Unpaid invoices land on the date that customer historically pays, not the due
  date. Median of their own history, falling back to the configured terms.
- Confidence weighting: on time 95 percent, up to 30 days late 85, to 60 days
  60, past that 35.
- Open deals land at expected close plus terms, weighted by the confidence
  number the operator set. If they set no confidence, the deal contributes
  nothing.
- Recurring income and costs are certain and land on schedule.
- Weighted is the number to plan on. Best case is the number to ignore.

## The run

1. Report three figures and stop: cash now, weighted cash at day 30, and the low
   point with its date.
2. If the low point is negative, that is the headline. Say the date. Then work
   the levers in this order, because this is the order of least damage:
   collect what is owed, delay a cost, invoice work already done, ask for a
   deposit on work about to start, cut a subscription, defer the operator's own
   pay, borrow. Borrowing is last, not first.
3. If the low point is comfortable, say the amount of slack and the date it
   peaks, and ask what it is for. Idle cash in a solo business is usually a
   pricing signal or a deferred investment, not a win.
4. Name the single biggest line in the forecast and what happens if it does not
   land. Concentration risk is invisible until it is not.

## Writes

Nothing. This tool reads and advises. Any action becomes a task through the
`tasks` tool.

## Finish line

The operator can say the date of their low point and the number without looking.

## Refuses

- To present the best case number without the weighted number next to it.
- To include a deal at a confidence the operator did not set themselves.
