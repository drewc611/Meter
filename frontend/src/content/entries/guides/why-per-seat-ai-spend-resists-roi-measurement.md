---
title: 'Why per-seat AI spend resists ROI measurement'
description: >-
  A per-seat AI license is a flat bill attached to wildly uneven value, the
  counterfactual you would need to price it does not exist, and the number most
  teams reach for at renewal is a modeling choice reported as a finding.
kicker: Guide · measurement
lead: >-
  Every renewal cycle produces the same meeting. Someone from finance has a
  figure for what the company spent on AI tools last year and asks what it
  bought. The engineering side has a strong intuition that the answer is "a
  lot," and no way to show it. Both positions are reasonable, and the gap
  between them is not a reporting problem that better dashboards fix. It comes
  from four specific properties of how these tools are billed and used, each of
  which breaks a different step of an ordinary ROI calculation.
wide: true
group: systems-engineering
tileMeta: 'Four reasons the ROI question has no clean answer, and three things that are measurable instead'
---

## The bill is flat and the value is not

A per-seat license charges the same amount for the person who runs the model
all day against production code and the person who opens it twice a week to
rename variables. The invoice records one of those facts and not the other.

That would be a minor accounting annoyance if value were distributed evenly
across seats, and most teams who have looked at their own per-seat telemetry
report that it isn't: a smaller group of seats accounts for a disproportionate
share of the activity, and the tail is long and quiet. Check this on your own
data before believing it, because the shape varies and it is the one premise
everything downstream rests on. Where it holds, the company-level average,
which is the number that reaches the renewal meeting, is an average over a
distribution the average describes badly.

The spread is the part that carries information. Collapsing it to one figure
per company throws away the only signal a renewal decision can act on.

## The tier decision gets made once, for everyone

At rollout, somebody picks a tier. Picking it per person means telling named
colleagues they are getting the cheaper tool, which has the shape of a
performance conversation, and it is a hard thing to schedule in month one of a
deployment when nobody yet has usage data to point at. The path of least
resistance is one tier for everyone, at the top.

Where that happens, the budget ends up set by the requirements of the heaviest
user and then multiplied by headcount. The gap between that and a tiered
rollout is whatever the price difference is, which is a number a company can
compute for itself in an afternoon and mostly has not. It stays invisible for
about a year, because there is no per-person baseline to compare against, then
arrives as a single figure at renewal.

## The input price and the invoice move independently

Model pricing has been falling. Ramp's September index puts the effective price
per million tokens down 41% to $0.68, from a 2026 peak of $1.15 in March
(Ara Kharazian, Lead Economist, Ramp, 9 September 2026).

A seat license is not priced in tokens, so none of that has to reach the bill,
and a falling token price is not evidence that a company's AI spend is getting
more efficient.

The same index is also the source of a figure now in wide circulation, and it
is worth reading carefully rather than quoting. Ramp reports per-employee
monthly spend among the top 1% of companies falling 9.7%, from $7,976 to
$7,205. In the methodological note attached to that sentence, Ramp revises its
own July figure upward, "from approximately $7.4K to $8K per employee per month
after additional July transactions entered our dataset," and adds two cautions
that tend to get dropped: the top 1% estimate "is more volatile than our median
and top 10% estimates," and "These results are also subject to change." Ramp
then offers its own innocuous explanation, which is that engineers take August
off, and notes it has seen similar declines around November and December.

The trap is in pairing. The 9.7% is computed against the revised $7,976, so it
is a like-for-like comparison. Pair August's $7,205 against the $7.4K figure
that was published before the revision and you get about 2.6%, which is a
comparison between two different measurement vintages and means very little.
Either number tells you about the price of an input. Neither tells you what a
seat produced.

## The counterfactual is expensive and it degrades

Return on investment needs a comparison against what would have happened
without the investment. For a software tool used by employees, that means
knowing how long the same work would have taken the same people without it.
Running that experiment on your own staff means asking people to do a portion
of their real work the slow way, which is a cost most companies decline to pay
and which gets harder to arrange every quarter.

METR ran it properly, with volunteers who had agreed to the design, and
reported this on 24 February 2026:

> Developers have become more selective in which tasks they submit. When
> surveyed, 30% to 50% of developers told us that they were choosing not to
> submit some tasks because they did not want to do them without AI.

(metr.org, contributors Joel Becker, Nate Rush, Tom Cunningham, David Rein and
Khalid Mahamud.)

Read METR's own reading of it rather than mine. METR says the withheld tasks
are the ones with "high expected uplift from AI," which is the developers'
expectation rather than a measured result, and concludes that the effect makes
its published estimate "a lower-bound on the true productivity effects." It
also says the selection effects "seem to affect a minority share of developers
and of tasks, which limits the degree of bias," and names a second cause that
has nothing to do with enthusiasm: "We additionally believe there have been
selection effects due to a lower pay rate (we reduced the pay from $150/hr to
$50/hr)."

So this is not a proof that the counterfactual is unobtainable. It is a
well-run experiment reporting that its own design degraded, from two causes,
one of which is a budget decision. METR's response is to redesign rather than
to abandon. What it costs a research organization with volunteers and a
protocol to get a clean answer here is a reasonable lower bound on what it
would cost a company with neither.

One footnote, because the number keeps getting quoted. METR's earlier study,
the source of the widely repeated claim that AI made experienced developers
slower, now carries a banner from METR reading "These results are out of date,"
pointing at the 2026 continuation. Citing the 2025 figure today means citing a
result the authors have superseded.

## An inventory nobody checked

The last problem is arithmetic. A total that omits rows is wrong in one
direction only.

A survey of 700 technology professionals, conducted by Sapio Research for
Harness in July 2026 and published as a press release with no individual
byline, found that "77% are confident they have a complete inventory of every
agent, MCP server, and LLM in their environment, but only 44% run active
discovery tooling to verify it." Read it with its limits attached. It is
vendor-commissioned and self-reported, respondents were screened for
organizations above 1,000 employees, 100 developers and $100 million in
revenue that had already deployed agents in production, in pilot or in a live
proof of concept, and the publisher says plainly that the figures "reflect how
far committed adopters have progressed rather than how widespread adoption is
across enterprises generally."

Inside that population, read the gap rather than either number. Most of these
organizations have an inventory. Fewer have checked it. What that measures
directly is governance coverage, not money, and the step from one to the other
is an inference worth stating as an inference: an unverified inventory can be
wrong in the direction of unbilled free tools just as easily as expensive
ones. The point is narrower than a dollar figure. A company that has not
verified what is running cannot tell you which of those two it is holding.

## What a value-per-dollar number can and cannot tell you

It can rank seats inside one company against each other, over one period, using
that company's own definition of output. That is enough to find the seats where
a tier change is safe.

It cannot show that a tool caused an outcome. Spend and outcome are correlated
through a dozen things that are not the tool, starting with which people were
assigned the hard work. It does not travel between companies unless they happen
to define output identically, which in practice they do not, so a benchmark
built from these numbers is comparing definitions rather than performance. And
it will move when a company changes what it counts, which is a property of the
definition rather than of anyone's work.

Any report that gives a single unqualified ROI percentage for AI spend is
presenting a modeling choice as a finding. The honest form of the number is a
spend-weighted estimate carrying an explicit confidence tier, and it should say
which tier it is sitting in.

## Three things that are measurable

Start with spend concentration, meaning what share of the bill sits in the top
decile of seats. This needs nothing but billing data, and it answers the first
thing a renewal asks, which is where the money actually went.

Then the rework-adjacent signals: reverts, reopened tickets, second attempts at
the same change. These are quality proxies rather than quality measures and
they should be labeled that way wherever they are reported, but they are
observable and they move.

Last, tier mismatch, meaning seats on the top tier whose usage pattern never
requires it. This is the one with money attached to it directly, and it stays a
decision about a seat rather than a judgment about a person, which is what
keeps the exercise from turning into a performance review by other means.

None of the three is ROI. All three are checkable against systems a company
already runs, and together they answer the question a renewal actually poses.
That question is rarely "was this worth it." It is "what can we stop paying for
without breaking anything that's working."

---

Merit is being built to compute those three, and two of them exist today. It
calls itself a pre-launch prototype on its own homepage, and the dashboard runs
on illustrative demo data until someone connects their own, with a sample
tenant that is an example rather than a customer. You can create an account and
look at it. The consultation and subscription listed on the pricing page take
an email address rather than a card, because neither is open yet.

If you own an AI budget line and would rather argue with these three numbers on
an export of your own data than read another guide about them, that is the
conversation worth having.
