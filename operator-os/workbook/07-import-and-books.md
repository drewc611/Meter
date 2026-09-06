# 07 Import and books

Forty five minutes. Everything up to now you typed in yourself. This module takes
a file another system wrote, gets it in exactly once, and then proves the numbers
agree with each other.

## The finish line

Your bank export is in the file, running the import a second time adds nothing,
and `os books check` prints three proofs with no line marked WRONG.

## Do this

1. Make the books and the import ledger exist. Version 1 had neither, so this is
   the step people skip and then wonder why nothing works.

```
./os backup
./os migrate
```

`migrate` copies your data folder before it touches anything, and tells you
where. Five migrations run: the chart of accounts, the category map, the import
ledger, the plugin state, and the run log.

2. Export a CSV from your bank. Ninety days is plenty. In most banks it is under
   statements, transactions or download. What you need in the file is a date
   column, a description column, and either one signed amount column or a debit
   and credit pair. Save it where you can type the path to it.

If you would rather rehearse on something fictional first, one ships with the
system: `adapters/samples/bank-statement.csv`.

3. Ask which adapter thinks the file is its.

```
./os pull --sniff adapters/samples/bank-statement.csv
```

You get a score per adapter and a best fit. If the best is under 50 percent it
stops and says no adapter is confident about this file, which is the honest
answer rather than a guess about your money.

4. Look at what it would do. This writes nothing.

```
./os pull bank-csv adapters/samples/bank-statement.csv
```

Read every line before you go further. Each proposal carries an action, an
amount, a confidence, and a reason you can check against the file it came from.
The last lines of the output say how many rows exist right now, so the claim that
nothing was written is something you can test rather than trust.

5. Apply it.

```
./os pull bank-csv adapters/samples/bank-statement.csv --apply
```

6. Now run that exact same line again, on purpose.

```
./os pull bank-csv adapters/samples/bank-statement.csv --apply
```

Every line that created or matched something the first time comes back as
`skipped, already imported on <date>`. The two set aside lines are set aside
again, because ignoring a line writes nothing and records nothing. Zero rows
created. That is the one thing you most need to be true about an importer, so
watch it be true once rather than believing a sentence in a manual.

7. Read the ledger.

```
./os imports
```

Newest first. One line per external record, the row it created, and a status.
`linked` means a row exists for it. `pending` means a match was recorded and is
waiting on you. An id in this list is never imported again, and
`./os imports --forget <external id>` is the only way to clear one.

### The same sequence on Windows

```
.\os.cmd backup
.\os.cmd migrate
.\os.cmd pull --sniff adapters\samples\bank-statement.csv
.\os.cmd pull bank-csv adapters\samples\bank-statement.csv
.\os.cmd pull bank-csv adapters\samples\bank-statement.csv --apply
.\os.cmd pull bank-csv adapters\samples\bank-statement.csv --apply
.\os.cmd imports
```

If your own export lives somewhere with a space in the path, put the whole path
in double quotes.

## What a match is, and what it refuses to do

Three actions come back from a pull.

| Action | What happens |
|---|---|
| create | a new row is written, through the same code path as `os add` |
| match | nothing is written. It says this money is already in your books |
| ignore | nothing is written and nothing is recorded. It is on screen so you know the line was seen |

A credit of 3,900.00 landing on a day when INV-2038 is sitting unpaid at
3,900.00 is a match. The invoice is not touched. It is still `sent`. What you get
instead is the one line that would change it, printed for you to run or not:

```
./os set invoices i0002 status=paid paid_on=2026-09-06 method=transfer
```

Change the date to the day the money actually landed. The default in that line is
today, which is usually wrong.

This is deliberate and it is worth knowing why. Two invoices for the same amount
to the same customer is normal in a trade business. A refund, a part payment and
a deposit all look like a credit. If the adapter marked invoices paid on the
strength of two numbers agreeing, you would find out months later that a job was
never paid for, and the aging report that would have told you had already been
told the debt was settled. So the adapter points, and you decide.

The same applies to money going out. If you already typed an expense for that
purchase, the pull comes back as a match against the row you have, not a second
copy of it. A duplicate expense is worse than a missed one, because you will
never notice it.

## Then the books

The registries you have been keeping are enough to derive proper accounts. You do
not write journal entries.

```
./os books post
./os books check
```

`post` rebuilds the journal from your invoices, payments and expenses. Run it
after any change to those. `check` gives you three proofs.

**Every entry balances.** Each thing that happened wrote the same money to two
places. If one entry is out, one row that fed it has a number missing or a
category the map has never heard of.

**The trial balance nets to zero.** Every debit in the file against every credit
in the file, as a whole rather than entry by entry. This is the one that catches
`journal.csv` being edited or truncated outside the tools.

**Money owed ties to the aging report.** This is the proof that matters. The two
figures come from different places: one from the journal, one from
`invoices.csv`. When they agree, the books and the reports are describing the
same business. When they do not, one of them is stale, and it is almost always
the books, because you changed an invoice and did not post again.

Then read the two statements.

```
./os books pnl
./os books balance
```

`pnl` is income, costs by account, and the margin. `balance` is what you have,
what you owe, what is yours, and one line at the bottom saying whether it
balances. If that line says NO, stop and run `os books check`.

### The books on Windows

```
.\os.cmd books post
.\os.cmd books check
.\os.cmd books pnl
.\os.cmd books balance
```

## Say this

```
I have exported a bank CSV to <path>. Run `os pull --sniff <path>` and then
`os pull <adapter> <path>` without --apply. Do not use --apply yourself. Go
through the proposals line by line against the file and tell me three things:
which creates are wrong or duplicated, which matches point at the right invoice
or expense, and which ignored lines were ignored for a bad reason. For anything
you are not sure about, say so and quote the line from the file. When we agree,
I will run --apply myself, and then I will decide invoice by invoice which ones
are paid.
```

The division of labour here is the point. Reading eighty lines of bank export
against your own records is work an assistant is good at. Deciding that a payment
settles an invoice is not, because being wrong is expensive and quiet.

## Check it

```
./os books check
./os drift
```

`books check` should print three `ok` lines and "The books agree with the
reports."

`drift` should print "Every row on disk matches the log. Nothing was edited by
hand." That sentence is the whole reason the import can be trusted. It compares
every row on disk against the event log, so if the adapter had written something
it did not report, or if a spreadsheet had touched a file behind your back, this
is where it shows up.

If drift does list something, read it. Editing files by hand is allowed. Run
`./os adopt` to write those edits into the log so the two agree again.

## When it goes wrong

**"There is no import ledger yet, so nothing could be kept honest."** You are on
version 1 data. Run `./os migrate`. The same cause gives you "The books are not
set up yet" from any `os books` command.

**`books check` says money owed disagrees.** You marked the matched invoice paid,
which is what you were told to do, and the journal has not been rebuilt since.
Run `./os books post`, then check again. If it still disagrees after a post, the
difference is real and it is in `invoices.csv`.

**No adapter is confident about your bank file.** Open it in a text editor and
look at the header row. `bank-csv` matches on the header text, so a column called
`Trans. Dt` is not recognised and `Date` is. Rename the header row to `Date`,
`Description`, and either `Amount` or `Debit` and `Credit`, save it, and sniff it
again. Nothing below the header row needs touching.
