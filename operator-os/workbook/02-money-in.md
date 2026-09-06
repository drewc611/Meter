# 02 Money in

An hour. This is the module that pays for the system, usually on the same day.

## The finish line

Every unpaid invoice is in the file, `os aging` shows the true total, and a
drafted message exists for every one that is late.

## Do this

1. Load every unpaid invoice. Not the paid ones. The ones outstanding right now.

```
./os add invoices contact_id=c0002 project_id=p0004 number=INV-2038 \
  issued=2026-07-14 due=2026-07-28 subtotal=3645.00 tax=255.00 total=3900.00 \
  status=sent
```

On Windows the line continuation is a backtick, not a backslash, or just put it
all on one line.

2. Add the paid ones from the last six months too. This feels pointless and is
   not. The forecast learns each customer's real payment lag from their own
   history, so six paid invoices turn "due in 14 days" into "this one pays in
   46 days, like it always does".

```
./os add invoices contact_id=c0002 number=INV-2019 issued=... due=... \
  total=1200.00 status=paid paid_on=...
```

3. Look at the damage:

```
./os aging
```

Read the bottom line first. That number is money you have already earned and
already spent time on.

## Say this

```
Run the chase tool. Work `os aging` top down by days late, not by amount. For
each unpaid invoice check the customer's payment history and note file first,
pick the right escalation step, and draft one message in my voice. Short, one
ask, one number, one date, no apology for asking to be paid. Do not send
anything. When you are done, write what you drafted into each invoice's notes
field and create a dated follow up task for the next step.
```

Then read every draft before it goes anywhere. The tool is good at the ordering
and the arithmetic. You are the one who knows that Ray always pays after the
second text and that Curtis genuinely did not get the invoice.

## The four steps, so you can overrule them

| Days late | What goes out |
|---|---|
| 1 to 7 | a nudge that assumes it slipped |
| 8 to 21 | the amount, the due date, and how to pay, in three lines |
| 22 to 45 | a consequence you are actually willing to apply |
| 45 plus | a request for a payment date in writing, or a partial |

The one that matters is 22 to 45. Never name a consequence you will not apply.
One empty threat teaches a customer that none of them are real.

## Check it

```
./os aging
./os brief
```

Every late invoice has a chase task against it, dated. Tomorrow's brief will show
them.

## Then do the part nobody does

Set the terms so this happens less.

```
./os setup
```

Change `invoice_terms_days`. Fourteen days is normal for a solo business. Thirty
is you lending money for free. If a customer needs thirty, that is a price, and
it belongs in the quote.

## When it goes wrong

**An invoice you are sure you sent is not in the aging report.** Check its
`status`. Draft invoices are excluded from every money report on purpose. If it
says `draft`, it was never sent, and that has happened to everyone reading this.

**The forecast still uses 14 days for a customer who takes 45.** It needs at
least one paid invoice from that customer to learn the lag. Add their history.

**A customer disputes a line.** Do not chase the whole invoice. Split it: invoice
the undisputed part again with a new number, write off or park the disputed part,
and get the majority paid this week.
