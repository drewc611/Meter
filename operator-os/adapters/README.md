# adapters/

One folder per adapter. One `adapter.py` in each. Nothing else is required and
nothing else is loaded.

```
adapters/
  bank-csv/adapter.py         a bank export, debit and credit or a signed amount
  stripe-csv/adapter.py       a payouts or balance transaction report
  quickbooks-csv/adapter.py   a general ledger or expense export
  calendar-ics/adapter.py     a calendar file, for hours worked
  mailbox-mbox/adapter.py     a mailbox export, for senders you do not know yet
  samples/                    small fictional files to test all of the above
```

## What an adapter does

It reads a file somebody else's software wrote and returns proposals. A proposal
says what it would add, which registry it belongs in, how sure it is, and why.
It does not write. Writing happens later, only when you pass `--apply`, and it
goes through `D.put` so every row lands in the event log.

```
os adapters                                 what is here and what each one needs
os pull --sniff adapters/samples/inbox.mbox which adapter thinks the file is its
os pull bank-csv <file>                     the proposals, written nowhere
os pull bank-csv <file> --apply             write them, and record every one
os imports                                  what has been imported already
os imports --forget <external_id>           let one be imported again
```

## The rules

**No network.** Every adapter here reads a local file. An adapter that sets
`network` to True in its `ADAPTER` dict will not run at all unless you set
`OPERATOR_OS_ALLOW_NETWORK` yourself, and the refusal says so on screen.

**No second import.** Every proposal carries an `external_id` from its source.
Once that id is in `data/imports.csv` it is never imported again, so running the
same file twice is a no operation rather than a pile of duplicates.

**No silent match.** When an adapter thinks money coming in belongs to an
invoice you already have, it proposes a match. The invoice is not touched. You
mark it paid, or you do not.

Writing your own: `manual/09_ADAPTERS.md` has the contract, the matcher and a
worked example.
