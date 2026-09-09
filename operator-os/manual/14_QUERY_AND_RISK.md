# 14 Asking questions

Two commands cover most of what people open a spreadsheet for.

## os query

A small query language over the registries.

```
os query "select number, contact_name, open_amount, days_late
          from invoices
          where status != paid and days_late > 30
          order by open_amount desc"
```

Conditions take `=`, `!=`, `<`, `>`, `<=`, `>=`, `and`, `or`, `not`,
`in (a, b)` and `like '%text%'`. Dates accept `today`, `today-30`, `today+14` or
a plain `2026-09-06`.

### Computed columns

The useful part. These are worked out for you, not stored:

| Registry | Columns you get for free |
|---|---|
| invoices | contact_name, project_name, days_late, open_amount, paid_lag, expected_lag, age |
| contacts | total_billed, outstanding, median_pay_lag, open_deals, days_since_contact |
| projects | contact_name, revenue, cost, profit, margin_pct, hours, days_over |
| deals | contact_name, days_open, weighted_value, days_to_close, action_overdue |
| tasks | project_name, days_overdue, hours |
| time | project_name, hours, value |
| expenses | project_name, age |
| recurring | annual, days_away |

`os query --columns invoices` prints the list for any registry.

`median_pay_lag` and `annual` are the two that change behaviour most often. The
first tells you which customers are actually slow rather than which ones feel
slow. The second turns a monthly subscription into the number you would have to
justify once a year.

## os sim

The deterministic forecast in `os cash` answers "what happens if everything
lands the way it usually does". `os sim` runs that a couple of thousand times and
reports the spread.

What it varies:

- whether each unpaid invoice gets collected at all, weighted by how late it is
- when it lands, sampled from that customer's own payment history where there is
  any, falling back to your terms where there is not
- whether each open deal closes, at the confidence you set yourself
- your weekly overhead, sampled from your own history with the top decile trimmed
  and anything already covered by a recurring row removed, so no cost is counted
  twice

What it reports: the bad case, the middle and the good case at 30, 60 and 90
days, the lowest point, and the percentage of runs in which you run out of money.

## os whatfirst

The one that changes behaviour. It reruns the simulation once per unpaid invoice
with that invoice forced to pay on terms, and ranks them by how much the odds
improve.

```
  invoice    customer                  amount   risk of running out   bad case gain
  INV-4102   Della Frame            $3,120.00      86.2% to  81.5%       $1,948.33
```

That ranking is almost never the same as ranking by size. The biggest invoice is
often from the customer who always pays anyway.

## os anomalies

A statistical pass, not an accusation. It looks for duplicate charges, spend well
outside the pattern for its category, finished work with hours logged and nothing
invoiced, customers who have started paying slower than they used to, revenue
concentrated in one customer, an invoicing gap much longer than your own normal,
and expenses over your threshold with no receipt.

Each flag is a question with the evidence attached. None of them is a conclusion.
