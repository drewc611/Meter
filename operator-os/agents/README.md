# agents/

The layer that lets the OS run itself on a schedule. Four files types, no code.

```
routing.yml     which tier of model does which class of work
roster/         what each tier may read, may write, owns, and must escalate
ticks/          the scheduled runs, one yml file each
```

The code that reads all of this is `lib/agentops.py`, and the commands are
`os ticks`, `os tick`, `os runs`, `os reconcile`, `os routing` and `os work`.

## The three tiers

| Tier | Does | Costs |
|---|---|---|
| `probe` | collects facts, runs read only commands, no judgment | least |
| `analyst` | bounded analysis against a stated rubric, drafts only | some |
| `judge` | hard to reverse, costs money, goes out in the operator's name | most |

There is a fourth entry in the table, `never`, and it is not a tier. It is the
list of work no agent does at any price. The loader treats it as a wall: a tick
step whose task class routes to `never` refuses to plan at all, and says so.

## A tick

One scheduled run, one file.

```yaml
name: money-tick
when: "weekly, monday morning"
goal: one sentence
guardrails:
  - drafts only, never sends
  - stops if os validate reports broken data
steps:
  - id: aging
    task_class: collect_facts
    run: "os aging"
    finish_line: "the outstanding total is printed"
```

Every step needs an `id`, a `task_class` that the routing table names, and a
`finish_line` a person can check. A step calls either a command (`run`) or a
tool (`tool`), or neither when the work is judgment with no tool behind it.

The five shipped ticks:

| Tick | When | For |
|---|---|---|
| `money-tick` | weekly | money earned and not yet collected |
| `work-tick` | daily | what has to be true by tonight |
| `demand-tick` | weekly | every open deal has a next action |
| `close-tick` | monthly | pricing, tax set aside, reaper, registry |
| `prove-tick` | weekly | the claims the OS makes that are no longer true |

## What the layer does and does not do

It plans, it records, and it reports. `os tick <name>` prints the plan and stops.
Nothing in this folder executes a tool, sends a message, or spends money. The
steps are run by a person or by an agent reading the plan, and what actually ran
gets recorded with `os tick <name> --record --step <id>=<tier>`.

That record is the whole point. `os reconcile` compares the tier each step really
ran on against the tier the table assigns, and reports two things that are never
added together:

- **RISK**, a cheaper tier ran work assigned to judge. This is the one that costs
  you a customer.
- **WASTE**, a judge ran work a probe could do. This only costs money.

Risk is listed first, always.

## The work registry

`data/work.csv` holds what the ticks opened and have not closed. Ten columns,
five statuses, and four kinds that match the four tool families: money, work,
demand, control. Every add and close is written to the event log with its cause,
so `os log` shows it. `os undo` does not reverse it, because undo covers the nine
registries in `SCHEMA` and this is not one of them.

## Adding a tick

Copy an existing file. Give it a name, a `when` a person can act on, one sentence
of goal, at least two guardrails, and steps whose task classes are already in
`routing.yml`. Then run `os routing`, which names any task class a tick uses that
the table does not.

## Adding a task class

Add it to `routing.yml` under the tier that owns it, and add it to that tier's
roster file under "Run it when". A class in the table that no roster claims is a
class nobody has thought about.
