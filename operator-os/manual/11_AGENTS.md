# 11 Agents

The rhythm in chapter 05 works. The problem is that it needs you every time. This
chapter is the layer that runs the rhythm on a schedule, and the accounting that
tells you when it ran the wrong way.

## Three tiers

Models are not interchangeable and pretending they are is how a cheap one ends up
setting a price. So the work is sorted into three tiers, named for what they do.

**probe.** Collects facts. Runs read only commands. Reports what came back and
nothing else. It has no opinion and is never asked for one. Cheapest, used most.

**analyst.** Bounded analysis against a rubric that was written down before the
work started. Drafts messages a human reads before anyone else does. Given the
same rows and the same rubric, two analysts reach the same answer. If they would
not, the work belongs a tier up.

**judge.** Anything hard to reverse. Anything that costs money. Anything that goes
out under your name. Most capable, used least, and worth every cent when it runs.

There is a fourth entry, `never`, and it is not a tier. It is the work no agent
does at any price: sending, paying, signing, deleting a row, giving professional
advice. The loader treats it as a wall. A tick step that routes to `never` refuses
to plan at all and says which step and why. It does not quietly fall back to a
judge, because a fallback is just a slower yes.

## The table is a file

`agents/routing.yml` maps a task class to a tier. `collect_facts: probe`.
`set_price: judge`. `send_anything: never`.

It is written down for one reason. A routing decision made in the moment cannot
be reviewed later, and the moment is exactly when the pressure to use the cheap
one is highest. In a file, the decision has a date, a diff and an argument. Run
`os routing` to read it, and it also names any task class a tick uses that the
table has never heard of, which is the usual way this rots.

## Ticks

A tick is one scheduled run in one file under `agents/ticks/`. It has a name, a
`when` a person can act on, one sentence of goal, guardrails, and steps. Each step
has an id, a task class, the command or tool it calls, and a finish line you can
check.

| Tick | When | What it protects |
|---|---|---|
| `money-tick` | weekly | money earned and not yet collected |
| `work-tick` | daily | the three things that must be true tonight |
| `demand-tick` | weekly | every open deal having a next action |
| `close-tick` | monthly | pricing, tax set aside, reaper, the registry |
| `prove-tick` | weekly | the claims this OS makes that stopped being true |

`prove-tick` is the odd one and the important one. Every OS accumulates
statements about itself: a registry table, a finish line, a rule in a manual.
Data moves and the statements do not. `prove-tick` rereads those claims against
the CSVs and lists the ones that no longer hold. It lists them. It does not fix
them, because a system that quietly edits its own record of what it promised is
worse than one that is out of date.

## Plan, record, reconcile

`os tick money-tick` prints the resolved plan: every step, its task class, the
tier the table assigns it, and its finish line. Then it stops. This command plans
and reports, and it never executes a tool by itself. Something else runs the
steps, you or an agent reading the plan.

Afterwards you record what actually happened:

```
os tick money-tick --record --step aging=probe,chase=judge
```

One line lands in `data/runs.jsonl`. Steps you did not name are recorded as not
run, and the run's outcome becomes `blocked` rather than `clean`, because a run
that half happened is not a run that worked.

Then `os reconcile` compares the tier each step actually ran on against the tier
the table assigns, and reports two things:

**RISK.** A cheaper tier ran work assigned to judge. A price set by a probe, a
deal closed by an analyst. This is the failure that costs you a customer, and it
is listed first, always, sorted by how far the step fell.

**WASTE.** A judge ran work a probe could do. This costs money and nothing else.

They are never added together and there is no combined score, because the single
number would let a week of cheap savings hide one expensive mistake. Two lists,
in that order, forever.

## The work registry

`data/work.csv` is the list of things the ticks opened and have not closed. Ten
columns, five statuses, four kinds that match the four tool families: money, work,
demand, control.

```
os work
os work add "Chase Okonkwo" kind=money
os work close w0001
```

A tick that finds something and does not open a work row has not finished. This
is the file that survives the tick that produced it.

Adding and closing a work row writes to the event log with its cause, so `os log`
shows it. `os undo` does not reverse it. Undo only covers the nine registries in
`SCHEMA`, and `work.csv` is not one of them. Change a work row by closing it, not
by winding time back.

## The boundary

The agent layer plans, records and reports.

It does not send. It does not merge. It does not spend. Everything in chapter 07
still holds, and it holds harder here, because a scheduled thing does its wrong
work at three in the morning while you are asleep. Every draft a tick produces
waits for you. Every price a judge proposes waits for you. Every removal a reaper
step suggests waits for you.

The receipts are the point. `os runs` shows what ran. `os reconcile` shows what
ran on the wrong tier. `os log` shows every row that changed and what caused it.
If the layer ever tells you something worked without leaving one of those behind,
that is a defect, and it is the same defect as a tool marking its own homework.
