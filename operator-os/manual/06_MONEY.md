# 06 Money

Everything the system does with money, in one place, so you can check it rather
than trust it.

## Cents, not floats

Every amount is parsed to integer cents on read and formatted once on write.
There is no accumulated rounding error, and `1250.00` in a file is exactly
125000 in the engine.

## Cash, not accruals

`os cash`, `os tax` and `os week` work on money that moved. An invoice raised is
not income until `paid_on` has a date in it. This is deliberate. A solo business
dies of cash, not of profit.

`os margin` is the exception and works on billed revenue, because the question
it answers is whether the job was priced right, not whether the customer paid.

## How the forecast decides when an invoice lands

Not the due date. The date that customer actually pays, taken as the median of
their own paid history in your own file. With no history it falls back to
`invoice_terms_days`. A customer who has taken 46 days four times will be
forecast at 46 days, and the number stops flattering you.

## Confidence weighting

| Situation | Weight |
|---|---|
| invoice not yet due | 95% |
| invoice 1 to 30 days late | 85% |
| 31 to 60 days late | 60% |
| more than 60 days late | 35% |
| open deal | the confidence you set, or nothing |

Recurring income and costs are certain. Weighted is the planning number. Best
case exists only so you can see the gap between them.

## The low point

The forecast reports the lowest weighted balance in the window and its date.
That single figure is the most useful number in the system. If it is negative,
the date it happens is the only deadline that matters that month.

## Margin

```
profit  = revenue billed
        - direct expenses on the job
        - hours logged on the job costed at hourly_rate
margin% = profit / revenue
```

Your own time is a cost. A job that "made money" because you did not pay
yourself did not make money.

## Tax set aside

`tax_set_aside_pct` applied to cash collected minus cash spent, year to date.
This is a planning figure you chose. It is not a calculation of what you owe, it
is not advice, and it is not a substitute for whoever does your return. Move the
money anyway.

## What the system deliberately does not do

No bank feeds, no payment processing, no filing, no payroll. It never touches
money. It tells you what is true about it, which is the part that was missing.
