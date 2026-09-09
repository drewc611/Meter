# 01 Install

Forty five minutes. At the end of this you are looking at your own business, with
your own numbers, on your own machine.

## The finish line

`os brief` prints your business name, your cash position, and your own work.

## Do this

1. Look at the eight encoded businesses before you build yours. Twenty minutes
   here saves an hour later, because you will see the shape of a filled in system
   instead of guessing at an empty one.

```
./os use
./os use 01-field-service
./os brief
./os aging
./os margin
./os cash 90 --detail
```

Windows: `.\os.cmd use`, and so on for each line.

2. Pick which one to fork. Not by trade. By failure mode.

| If your problem is | Fork |
|---|---|
| people owe you money and you never chase | `01-field-service` |
| clients ask for more inside the same fee | `02-fractional-consultant` |
| fixed prices that run over on hours | `03-design-studio` |
| cash tied up in stock before revenue | `04-maker-brand` |
| you are at the ceiling of your own hours | `05-coach-practice` |

3. Take its shape, drop its data:

```
./os use 03-design-studio --empty
```

Your data folder is backed up first, automatically, with today's date on it.

4. Answer nine questions:

```
./os setup
```

Two of them decide more than the rest.

**Your hourly rate.** Not what you charge. What your time costs the business.
If you have no idea, take what you want to earn in a year, divide by 46 weeks,
divide by the hours you can actually bill in a week, and use that. You can change
it later and every margin figure recalculates.

**Hours you can actually work per week.** Actually. Not the hours you are at
work. A solo operator who says 40 is almost always at 25 once quoting, driving,
admin and the phone are taken out. An honest low number makes every plan built on
it true.

5. Put in the last ninety days. This is the only tedious part of the whole
   system and it takes about thirty minutes. Do it in this order, because each
   step depends on the one before:

```
./os add contacts name="..." status=active source=referral
./os add projects contact_id=c0001 name="..." status=active due=2026-10-01 budget=4500.00
./os add invoices project_id=p0001 contact_id=c0001 number=INV-001 issued=... due=... total=... status=sent
```

You do not need every historical record. You need every **unpaid invoice**, every
**live project**, and every **open deal**. Nothing else changes a decision this
month.

## Say this

To get through the data entry faster, hand it over:

```
Read manual/02_DATA_MODEL.md. I am going to paste my open invoices, live jobs
and open deals as messy text. Turn each into the right `os add` command, ask me
about anything ambiguous rather than guessing, and show me the commands before
running them.
```

Then paste whatever you have. A photo of a whiteboard, a screenshot of a
spreadsheet, an email thread. Messy is fine. Guessed is not, which is why the
prompt says to ask.

## Check it

```
./os validate
./os brief
```

`validate` should report no broken rows. It may report open loops. Those are
real, and module 05 deals with them.

`brief` should print your business name at the top and numbers you recognise. If
the cash figure is wrong, the usual cause is `opening_cash` in
`data/business.yml`. Open the file and fix the number. It is a text file. You are
allowed to edit it.

## When it goes wrong

**"points at c0003 which is not in contacts.csv".** You referenced an id that
does not exist. Run `./os find <name>` to get the real id and fix the row.

**Every margin is negative.** Your hourly rate is set high and your revenue is
low because you have only entered open invoices, not paid ones. Add the last
sixty days of paid invoices and it will settle.

**The brief is empty.** You loaded a workspace with `--empty` and then did not add
anything. That is what empty means. Go back to step 5.
