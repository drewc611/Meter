# 09 Adapters

Other people's software has your data in it. Adapters bring it here without
letting it write behind your back.

An adapter reads one file, a bank export, a Stripe report, a calendar, a
mailbox, and returns proposals. A proposal is a suggestion with a reason
attached. Nothing is written until you say so.

## The three commands

```
os adapters                      what is installed and what each one needs
os pull --sniff <file>           which adapter thinks the file is its
os pull <adapter> <file>         the proposals, written nowhere
os pull <adapter> <file> --apply write them, and record every one
os imports                       the ledger, newest first
os imports --forget <id>         let one record be imported again
```

`os pull` without `--apply` writes nothing at all. It says so at the end, with
the row count, so the claim is checkable rather than trusted.

## The eight that ship

| Adapter | Reads | Proposes |
|---|---|---|
| `bank-csv` | expenses, invoices | money out as expenses, money in as invoice matches |
| `stripe-csv` | expenses, invoices | the fee as a cost, the gross as an invoice match |
| `paypal-csv` | expenses, invoices | the fee as a cost, the gross as an invoice match |
| `square-csv` | expenses, invoices | the fee as a cost, the gross as an invoice match |
| `quickbooks-csv` | expenses | expenses, bills, checks and card charges |
| `calendar-ics` | time | hours against projects whose names match the event |
| `mailbox-mbox` | contacts | senders who are not in your contacts yet |
| `generic-csv` | expenses | a conservative, low-confidence fallback for a date/amount/description CSV that matches no named platform |

Sample files for all eight are in `adapters/samples/`. They are fictional, with
555 numbers and example.com addresses, and the tests and the workbook use them.

## The contract

An adapter is a folder under `adapters/` with one `adapter.py`:

```python
ADAPTER = {
    "name": "bank-csv",
    "title": "Bank statement CSV",
    "reads": ["expenses", "invoices"],   # registries it can propose rows for
    "writes": [],                        # registries it can push back to
    "needs": "a CSV exported from your bank",
    "network": False,
}

def sniff(path) -> float          # 0 to 1, how sure it is this file is for it
def pull(path, ctx) -> [Proposal] # never writes anything
def push(ctx) -> [str]            # optional, most adapters do not have one
```

A proposal is a plain dict:

```python
{"external_id": "bank-csv:890a6f131379",  # stable id from the source, required
 "entity": "expenses",                     # which registry
 "row": {...},                             # columns from SCHEMA only
 "action": "create" | "match" | "ignore",
 "match_id": "i0002" or None,              # set when action is match
 "confidence": 0.0 to 1.0,
 "why": "one short sentence a human can check"}
```

`lib/adapters.py` checks every one of those before you see it. A proposal with
no `external_id` is rejected, because it could be imported twice. One that sets
a column no registry has is rejected. One with no `why` is rejected, because a
suggestion nobody can check is not a suggestion.

The three actions:

- **create** writes a new row through `D.put`.
- **match** writes nothing. It records in the ledger that this external record
  belongs to a row you already have, and leaves the decision with you.
- **ignore** writes nothing and records nothing. It is on screen so you know the
  adapter saw the line and chose not to act, and why.

## The ledger

`data/imports.csv`, created by migration 003.

```
id, adapter, external_id, entity, row_id, imported_on, amount, summary, status
```

`status` is `linked`, `pending` or `ignored`.

- **linked**: a row was created for this external record.
- **pending**: a match was recorded and is waiting on you. `os imports` lists
  these separately, because they are the ones still owed a decision.
- **ignored**: set by `os imports --forget`. It clears the block so the same
  record can be pulled in again.

Every external record has an id from its source. Stripe gives you one. Bank
exports do not, so `bank-csv` builds a digest of the date, the description and
the amount, and appends a counter when a day genuinely holds two identical
lines. Once that id is in the ledger it is never imported again. That is the
whole of the idempotency guarantee and it is one column wide.

Redoing an import is two steps on purpose:

```
os imports --forget bank-csv:890a6f131379
os pull bank-csv statement.csv --apply
```

The row the first import created is still there. Forgetting does not delete
anything, which is why the second pull usually comes back as a match rather than
a create: the matcher recognises the money it already put in the books.

## The matcher

`find_existing(entity, row)` answers one question: is this already here?

Same money, a date within three days, and a vendor or contact name that looks
like the same one. It returns the row id and a confidence, or nothing when
nothing is close enough to be worth a human's attention. Contacts are matched on
email address instead, exactly, because a name is not an identity.

Money coming in is matched differently, against unpaid invoices, by total. A
credit of 3900.00 when invoice INV-2038 is sitting at 3900.00 unpaid is a match,
not a new row. The invoice is left exactly as it was. The command prints the one
line that would change it:

```
os set invoices i0002 status=paid paid_on=2026-09-06 method=transfer
```

You run that, or you do not. An adapter marking your invoices paid on the
strength of a coincidence in the second decimal place is not a feature anyone
should want.

## No network

No adapter here makes a network call. They read files on your disk.

An adapter that declares `"network": True` will not run. `lib/adapters.py`
refuses it, names it, and says the one thing that would let it through:

```
OPERATOR_OS_ALLOW_NETWORK=1 os pull some-api-adapter <file>
```

The switch exists so the refusal is visible rather than convenient. If you set
it, you have read that adapter's code and you accept where the data goes. It is
also excluded from `os pull --sniff` until you do, so a network adapter cannot
quietly win the argument over which one owns a file.

`pull` is checked, not trusted. `lib/adapters.py` takes the size and modified
time of every file in `data/` before the adapter runs and again after. If
anything moved, the pull fails and says the adapter is not to be trusted until
that is fixed.

## Writing your own

1. `mkdir adapters/my-thing` and write `adapter.py` in it.
2. Fill in `ADAPTER`. Name the registries you read. Say what the operator has to
   go and export, in their words, in `needs`.
3. Write `sniff(path)`. Look at the header row or the first few bytes. Return a
   number you can defend. Return a low number when another adapter's marker
   columns are present, rather than fighting over the file: the five here all
   stand down for each other, which is why `os pull --sniff` is decisive.
4. Write `pull(path, ctx)`. Read the file. Build proposals. Write nothing.
   `ctx` gives you `config`, `today`, the loaded `contacts`, `projects`,
   `invoices` and `expenses`, plus `find_existing` and `digest`.
5. Use `ctx["find_existing"]` before proposing a create. A duplicate expense is
   worse than a missed one, because you will not notice it.
6. Give every proposal a `why` that a person can check against the file it came
   from. "Looks like a cost" is not one. "money out on 2026-08-03 to NORTHGATE
   SUPPLY CO, filed as materials" is.
7. Add a sample to `adapters/samples/` and a case to `tests/test_adapters.py`.

```
python3 tests/test_adapters.py
```

Sixty four checks. Sniff picks the right adapter for every sample, pull changes
no file on disk, applying twice imports nothing the second time, a bank credit
equal to an open invoice comes back as a match rather than a create, and the
mailbox adapter refuses an address marked do_not_contact.

## What adapters will not do

They will not send anything. `push` exists in the contract and none of the five
implement it, because pushing means writing into somebody else's system and that
is a decision, not an import.

They will not touch the network.

They will not mark an invoice paid, change a status, or delete a row. The most
an adapter can do to a row you already have is point at it.

They will not read a message body. `mailbox-mbox` stops at the blank line that
ends the headers. Subject lines and addresses reach a row. Nothing else does,
and the test asserts it.

They will not propose anything for a contact marked `do_not_contact`. That check
runs before the check for whether the address is known at all, so the refusal is
explicit rather than a side effect.
