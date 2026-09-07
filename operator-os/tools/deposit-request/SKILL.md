---
name: deposit-request
description: Raise a deposit invoice due before a new project starts, especially for a new or slow-paying client. Use when the operator says new job starting, take a deposit, or get some money up front.
---

# deposit-request

The riskiest money in the business is the money spent before any of it has
been collected. A deposit due before the first day of work turns that risk
into a known, priced decision instead of a hope.

## Run it when

A project is about to start, before the first billable hour is logged -
especially for a contact who is new or has a slow payment history.

## Reads

`projects.csv` (`start`, `budget`), `contacts.csv` (`status`, `tags`),
`invoices.csv` and the computed contact columns via `os query`
(`median_pay_lag`, `total_billed`), `business.yml` (`invoice_terms_days`,
`currency_symbol`).

## The run

1. Confirm the project and its `start` date. If the project row doesn't exist
   yet, this tool doesn't create one - hand off to `projects` first.
2. Check the contact's payment history: `median_pay_lag` from the computed
   contacts columns, whether `tags` carries `slow-pay`, and whether `status`
   is `lead` (never paid before) rather than `active`.
3. If the history shows repeated lateness (`median_pay_lag` well past
   `invoice_terms_days`, or the `slow-pay` tag) or the contact is new, a
   deposit is the default move. If the operator wants to skip it anyway,
   that's their call to make explicitly - not this tool's to assume on their
   behalf.
4. Size the deposit as a plain percentage of `budget` that the operator states
   out loud. This tool doesn't pick the number.
5. Number it the same way any invoice is numbered: highest existing number in
   `invoices.csv`, incremented, prefix kept.
6. Set `issued` to today and `due` to the project's `start` date or earlier -
   never after. Set `status=draft` until the operator confirms it's actually
   going out.
7. Keep it distinct from whatever invoice will bill the rest of the project -
   its own row, its own number, not a line item folded into the first
   progress invoice.

## Writes

One row in `invoices.csv`.

```
os add invoices project_id=p0009 contact_id=c0021 number=INV-2061 \
  issued=2026-09-06 due=2026-09-10 subtotal=1000.00 tax=70.00 \
  total=1070.00 status=draft notes="deposit, 25% of budget"
```

## Finish line

The project's `start` date has a deposit invoice in `invoices.csv` with a
`due` date on or before it.

## Refuses

- To skip the deposit for a contact whose payment history shows repeated
  lateness, without the operator explicitly overriding that call.
- To set the deposit amount itself. It sizes the invoice from a percentage
  the operator states.
- To mark the deposit `sent` before the operator confirms it's actually going
  out today.
