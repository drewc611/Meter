# 03 Money out

An hour. At the end of it you will know which of your jobs actually made money,
and it will not be the ones you thought.

## The finish line

`os margin` shows your last five finished jobs with your own hours costed in, and
you can name the shape of work that loses money.

## Do this

1. Log expenses against jobs. Six months is plenty. The field that matters is
   `project_id`, and it is the one everybody leaves blank.

```
./os add expenses date=2026-08-14 vendor="Supplier Co" category=materials \
  amount=2840.00 project_id=p0001 billable=yes method=card receipt=yes
```

Anything with no job is overhead. Log it with a blank `project_id` and a
category. Overhead is a real answer. Blank is not.

2. Log time against jobs, including the hours nobody paid for.

```
./os add time date=2026-08-14 project_id=p0001 minutes=420 billable=yes rate=95.00
./os add time date=2026-08-19 project_id=p0001 minutes=180 billable=no \
  notes="Return trip, wrong part"
```

The `billable=no` rows are the whole point of this module. Travel. Revisions.
The callback. The forty minute phone call. If you only log the billable hours,
every margin figure is a flattering lie.

3. Look:

```
./os margin
```

Finished work is judged against your target. Work still running is shown
separately and judged against nothing, because a half billed job always looks
terrible.

## Say this

```
Run the pricing tool. Take `os margin` and for every finished job under target,
find the cause in the data rather than from memory: hours past estimate,
billable expenses never billed, a discount at quote, or unpaid work between the
paid parts. Then tell me whether the losers share a shape. Give me the options
with the arithmetic attached and do not tell me which to pick.
```

## What you are looking for

One bad job is a job. Three bad jobs of the same shape is a price. The pattern is
usually one of four things and you will recognise yours immediately:

- emergency or rush work quoted fast, in person, under pressure
- one customer who is pleasant and expensive
- a service you offer because you always have, at a price set years ago
- the small job, where the fixed cost of showing up eats the whole fee

## Check it

```
./os margin
./os capacity
```

You should be able to finish this sentence with a specific answer: "the work that
loses me money is ____, and it loses it because ____."

## Then set the number

```
./os setup
```

`target_margin_pct` is what you want left after your own hours are paid. Thirty
to forty percent is a working range for a solo service business. Setting it makes
`os margin` flag the losers automatically from now on, forever, without you
remembering to check.

## When it goes wrong

**Everything is under target.** Either your hourly rate is set too high, or your
prices are genuinely too low. Check the rate first. Then believe the report.

**A job with good margin felt awful.** Look at the `billable=no` hours on it.
Margin does not capture misery, and a job that pays well and costs you your
weekends is still a job worth repricing or refusing.

**You cannot face six months of expenses.** Do three. The pattern shows up in
three.
