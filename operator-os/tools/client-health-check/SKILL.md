---
name: client-health-check
description: Pull one contact's staleness, open deals, and outstanding balance into a single view so the operator can judge if the relationship needs attention. Use when the operator names a client and asks how are we doing with them, or is this account okay.
---

# client-health-check

`os anomalies` watches the whole book for patterns worth a question. This tool
does the same job for one relationship, on demand, because the client the
operator is worried about right now doesn't wait for a monthly pass.

## Run it when

The operator names a specific contact and asks how the relationship stands, or
before a renewal or renegotiation conversation.

## Reads

`contacts.csv`, `deals.csv`, `os aging`, `data/notes/<contact_id>.md`, and the
computed contact columns via `os query` (`days_since_contact`, `outstanding`,
`median_pay_lag`, `open_deals`, `total_billed`).

## The run

1. Confirm the contact. If the operator names someone ambiguously, run
   `os find <name>` and confirm which row before reading anything else.
2. Run
   `os query "select name, status, days_since_contact, outstanding, median_pay_lag, open_deals, total_billed from contacts where id = 'c0005'"`
   for that one id.
3. Cross-check `outstanding` against `os aging` filtered to that contact - the
   query gives the total, aging gives the age of each unpaid invoice behind
   it.
4. Read the most recent entries in `data/notes/<contact_id>.md`. Facts that
   were written down, not the operator's memory of them.
5. Lay the numbers out together and say what they mean in plain terms: quiet
   and paying on time is a healthy dormant account; quiet and slow-paying is
   a risk worth watching; active and slow-paying is the one that needs a
   conversation before more work is committed. Name which one this is - don't
   just list the numbers and stop.
6. If `status` is `do_not_contact`, report that and stop there. No further
   judgment is needed or offered.

## Writes

Nothing.

## Finish line

The operator can state, for this one contact, whether the relationship needs
an action this week and what it is - or that it doesn't.

## Refuses

- To recommend contacting anyone marked `do_not_contact`.
- To render a single health score as if it were authoritative. It shows the
  numbers and the reasoning behind them; the operator can disagree with the
  read.
- To guess why a client has gone quiet. Absence of contact is a fact drawn
  from the file. The reason for it is a guess, and it's labelled as one if
  offered at all.
