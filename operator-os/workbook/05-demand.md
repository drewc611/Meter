# 05 Demand

An hour. Everything up to now has been about the work you already have. This is
about the month after this one.

## The finish line

`os validate` reports no open deal without a next action, and no sent quote past
its expiry with no decision.

## Do this

1. Every person becomes a contact with a `source`.

```
./os add contacts name="Helen Ashworth" role=homeowner \
  email=hashworth@example.com phone=555-0108 source=referral status=lead \
  first_contact=2026-08-28
```

`source` is the field that later tells you which of your marketing is real. Most
solo operators discover that ninety percent of their revenue came from referral
and they have been spending money and evenings on something else entirely.

2. Every opportunity becomes a deal with a confidence number and a dated next
   action.

```
./os add deals contact_id=c0005 title="Full system swap" value=9400.00 \
  stage=quoted confidence=60 opened=2026-08-28 expected_close=2026-09-17 \
  next_action="Call Helen, quote expires Friday" next_action_due=2026-09-15 \
  status=open
```

"Follow up" is not a next action. A next action is something you do, on a day.

3. Every price you have given becomes a quote with an expiry.

```
./os add quotes deal_id=d0001 contact_id=c0005 number=Q-1042 \
  issued=2026-08-30 expires=2026-09-13 subtotal=8785.00 tax=615.00 \
  total=9400.00 status=sent
```

An expiry is the only thing that creates a reason to answer. Fourteen days.

## Say this

```
Run the pipeline tool. List every open deal with a next action due today, in the
past, or blank. For each one give me a next action I do, with a date. Then
anchor every confidence number against the stage and tell me which deals have sat
at the same confidence for a month, because those are lost deals wearing
optimism.
```

Then, once a week from now on:

```
Run the followup tool. Four lists in order: quotes with no answer, deals with a
past due next action, finished jobs with no review asked for, and active
customers not spoken to in ninety days. Draft one message per item in my voice.
Nothing that says "just checking in".
```

## The quote that actually closes

Three things, in this order, and most solo operators do none of them.

1. Price from the bottom. Direct cost, plus your hours at your rate, plus your
   target margin. Then decide whether the market bears it. Working backwards from
   a guess is how the losing jobs in module 03 got priced.
2. Say what is not included. Every scope dispute starts in the gap the quote
   left.
3. Put a date on it.

## Check it

```
./os validate
```

No open deal without a next action. No expired quote left unresolved. If there
are twelve of them, that is normal for a first run and you should close most of
them as lost rather than pretending.

Losing a deal is data. Leaving it open forever inflates your cash forecast and
makes you feel busy while nothing happens.

## When it goes wrong

**The pipeline looks huge and no money arrives.** Your confidence numbers are
mood, not judgment. Anything quoted more than sixty days ago with no reply is
not at 60 percent. It is lost.

**You have no pipeline at all.** That is the honest result and it is better than
a fake one. Module 06 puts the content and followup tools on a schedule so this
does not happen again.
