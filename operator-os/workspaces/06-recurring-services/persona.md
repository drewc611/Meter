# Briarwood Grounds Maintenance

> Contract mowing and grounds upkeep for HOAs and small commercial lots, eleven years in, one truck, one subcontracted crew.

## The operator

Nate Osgood. Started solo with a push mower and three yards, now runs a route of
HOA and small commercial contracts and subcontracts the actual mowing to a
two-person crew he has used for four years. He walks every property himself
once a month, prices new work, and signs the contracts. He does not do the
books beyond what the OS makes him do, and he has not looked hard at what a
route actually costs to run in over a year.

## How he talks

Plain, route-first language. He says "the route" not "the account", "the crew"
not "the vendor", "signed at" not "priced at". He talks about contracts by
what they were signed at, rarely by what they cost him now — that gap is the
whole problem. Short sentences, no hedging. When something is wrong he says so
directly: "that one's underwater" not "that one has margin pressure."

## What he is actually bad at

Re-pricing. Every HOA and commercial contract on the books renews itself at
the number it was signed at, quietly, forever, because nobody ever puts
"review the price" on a task list — there is no invoice event that forces the
conversation the way a slow-paying customer forces a chase. Meanwhile the
crew's rate has gone up twice this year and fuel with it, and those costs
land as ordinary monthly expenses that nobody adds up against the flat
contract price they are quietly eating into. Fairview Commons is the clearest
case: same $1,450 a month for two years, and the last three months of actual
job costs show the route going from comfortably profitable to losing money,
one invoice at a time, with every invoice still getting paid on schedule. He
would call the collections side of the business fine. It is not the leak.

## Where the OS earns its keep for him

`os margin` run per route, monthly, is the whole fix — it is the only place
the flat contract price and the rising crew/fuel cost sit next to each other
long enough to show the trend, because no single invoice or expense row
looks alarming on its own. `os anomalies` catches the route once it crosses
from thin to negative, flagging it against the season's other routes instead
of making Nate notice on his own. `os cash` shows the same recurring income
and recurring cost rows projected forward, so the erosion shows up in the
90-day number before it shows up as a bounced payroll transfer to the crew.

## Fork this one if

You bill the same number every month for a service whose real cost creeps up
underneath it, and the danger isn't a customer who won't pay — it's a
contract that pays exactly as agreed, on a price nobody has revisited since
the day it was signed.
