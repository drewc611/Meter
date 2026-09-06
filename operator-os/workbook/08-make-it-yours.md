# 08 Make it yours

An hour. Every business has one question the general tools do not answer and one
job that should happen on a Friday whether or not you remember. This module adds
both, and leaves receipts for each.

## The finish line

`os help` lists a command you wrote, `os plugin verify` passes on the plugin that
carries it, `os ticks` lists a tick you wrote, and `os reconcile` has something
real to report about a run you recorded.

## Do this

1. Look at what is already installed before you write anything.

```
./os plugin list
./os plugin verify
./os plugin info example-trade-rates
./os rates
```

Two examples ship. `example-quotes-pdf` declares `commands` and `tools` and turns
a quote into a printable HTML page. `example-trade-rates` declares `commands` and
`migrations`, and its migration creates `data/rates.csv` and adds `os rates`. It
extends the data layer without a line changing in `lib/`. Read both folders. They
are short and they are meant to be copied.

`os plugin verify` checks the manifest, the version range, that every declared
capability is real, that the entry module imports, that the shipped folders match
what was declared, and that every file still matches its lock. It exits non zero
if any plugin fails, which is what makes it worth putting in a script later.

If this is the first thing you have run since version 1, `example-trade-rates`
fails here with "data/rates.csv is not there". That is its own migration not
having run yet. Module 07 step 1 runs it. So does
`./os plugin migrate example-trade-rates`.

2. Scaffold your own. Name it after what it answers, not after your business.

```
./os plugin new callback-cost --capabilities commands
```

It is created switched off. Nothing loads until you turn it on.

3. Decide what it may do. There are seven capabilities and nothing outside the
   list counts. A manifest that invents one does not load.

| Capability | What declaring it grants | What it still withholds |
|---|---|---|
| `commands` | register CLI commands | writing any row, and taking a command that already exists |
| `tools` | ship `tools/<name>/SKILL.md` files | running them. Shipping a tool is not executing one |
| `adapters` | ship an adapter folder | the network, and writing anything without `--apply` |
| `workspaces` | ship a workspace seed | touching the data folder you are already using |
| `reports` | ship report templates | everything else on this list |
| `migrations` | ship migrations that add columns or files | rewriting a core registry. `os validate` is the check that says so |
| `writes` | write to the data layer at all | doing it quietly. Every row it changes lands in the event log tagged with the plugin |

A plugin that does not declare `writes` is handed a data layer that reads
normally and raises on every write. Ask for one anyway and you get this, with
your plugin's name in it:

```
plugin callback-cost tried to call osdata.put() on the data layer. That needs
the 'writes' capability and its manifest does not declare it
```

Declare the shortest list that does the job. Most useful plugins need
`commands` and nothing else, because reading is always allowed.

Here is what the list is not. A plugin is python, running in your process, as
you. Nothing stops a determined one from opening `contacts.csv` itself. The
capability list tells you what a plugin says it needs and stops the accidents. It
is not a sandbox. Read the code, or do not install it.

4. Write one command that answers a question only your trade asks. The question
   below is a field service one: the hours you worked and could not bill. Return
   trips are what turn a good job into an average one, and no general report
   names them.

| If your trade is | The question is usually |
|---|---|
| field service | which jobs cost me unbillable return trips |
| consulting | which clients are over the retainer hours and by how much |
| design studio | which fixed price jobs went past the estimate |
| maker brand | which stock has been sitting longest against what it cost |
| coaching | which clients booked and did not show |

Replace everything in `plugins/callback-cost/plugin.py` with this. It is the
whole file.

```python
"""Unbillable hours per job, and what they cost."""


def register(reg, ctx):
    def cmd_callbacks(args):
        D = ctx.data
        rate = float(ctx.config().get("hourly_rate") or 0)
        names = {p["id"]: p["name"] for p in D.load("projects")}
        lost = {}
        for t in D.load("time"):
            if (t.get("billable") or "").lower() != "yes":
                job = t.get("project_id") or "no job"
                lost[job] = lost.get(job, 0) + int(t.get("minutes") or 0)
        if not lost:
            print("\nNo unbillable time logged. Either the jobs ran clean, or the")
            print("return trips were never written down.\n")
            return 0
        print("\nUnbillable hours per job")
        print("-" * 62)
        for job, mins in sorted(lost.items(), key=lambda kv: -kv[1]):
            hours = mins / 60.0
            print("  {:<34} {:>6.1f} h {:>11}".format(
                names.get(job, job)[:34], hours,
                D.money(int(hours * rate * 100), D.sym())))
        hours = sum(lost.values()) / 60.0
        print("  {:<34} {:>6.1f} h {:>11}".format(
            "total", hours, D.money(int(hours * rate * 100), D.sym())))
        print("\n  Priced at your hourly_rate. Finish line: every job above has a")
        print("  cause written in its notes, or it happens again next month.\n")
        return 0

    reg.add("callbacks", cmd_callbacks, group="plugin",
            summary="unbillable hours per job, and what they cost",
            group_blurb="added by plugins")


def check(ctx):
    if not ctx.config().get("hourly_rate"):
        return ["hourly_rate is blank in business.yml, so the money column is zero"]
    return []
```

Two things in there are not decoration. The command prints a fact and a finish
line, not the word done. And `check(ctx)` is your own self test, which
`os plugin verify` runs and adds to its own list. A plugin that cannot say when
it is misconfigured will be wrong silently.

5. Turn it on and run it.

```
./os plugin enable callback-cost
./os callbacks
./os help
```

`os help` lists it under `plugin`, tagged with the plugin it came from, so nobody
later mistakes it for something the core ships.

6. Lock it, then verify it.

```
./os plugin lock callback-cost
./os plugin verify callback-cost
```

`lock` records a sha256 of every file. From then on `verify` fails on any change
to any of them, including yours. That is the point. When you edit the plugin
again, verify will fail, you read what changed, and then you lock it again on
purpose.

### The same sequence on Windows

```
.\os.cmd plugin list
.\os.cmd plugin verify
.\os.cmd plugin new callback-cost --capabilities commands
.\os.cmd plugin enable callback-cost
.\os.cmd callbacks
.\os.cmd plugin lock callback-cost
.\os.cmd plugin verify callback-cost
```

## Now the part that runs without you

The rhythm in module 06 works and needs you to start it every time. The agent
layer writes the schedule down instead, and keeps a record of what actually ran.

7. Read the routing table before you read anything else.

```
./os routing
```

Three tiers and a wall. `probe` collects facts and has no opinion. `analyst` does
bounded analysis against a rubric written before the work started, and drafts
only. `judge` gets anything hard to reverse, anything that costs money, and
anything going out under your name. The fourth entry, `never`, is not a tier. It
is the work no agent does at any price: sending, paying, signing, deleting a row,
giving professional advice.

The table lives in `agents/routing.yml`. It is a file for one reason. A routing
decision made in the moment cannot be reviewed later, and the moment is exactly
when the pressure to use the cheap one is highest. `os routing` also names any
task class a tick uses that the table has never heard of, which is how this rots.

8. Read the plans that ship.

```
./os ticks
./os tick money-tick
```

`os tick` prints the resolved plan: every step, its task class, the tier the
table assigns it, and a finish line you can check. Then it stops. It does not run
any of it. A person or an agent runs the steps.

9. Write one of your own. Save this as `agents/ticks/callback-tick.yml`.

```yaml
name: callback-tick
when: "weekly, friday, before the week close"
goal: Find the hours nobody paid for and decide what changes next week.
guardrails:
  - reports only, never edits a job
  - stops if os books check reports a problem
steps:
  - id: unbilled
    task_class: collect_facts
    run: "os callbacks"
    finish_line: "the unbillable hours total is printed"
  - id: books
    task_class: check_data
    run: "os books check"
    finish_line: "all three proofs read ok"
  - id: cause
    task_class: rank_work
    finish_line: "every job in the list has a one line cause written in its notes"
  - id: price
    task_class: set_price
    finish_line: "either a rate change is written down, or a stated reason to leave it"
```

Every step needs an id, a task class the routing table already names, and a
finish line a person can check. A step calls a command with `run`, a tool with
`tool`, or neither when the work is judgment with no tool behind it. Note that
the last two steps call nothing. That is allowed and it is honest: deciding a
rate is not a command.

```
./os routing
./os tick callback-tick
```

`routing` should still say every task class a tick uses is in the table. `tick`
should print four steps, with `price` assigned to judge.

10. Run the steps yourself, then record what actually happened. Say what really
    ran, not what should have.

```
./os tick callback-tick --record --step unbilled=probe,books=probe,cause=analyst,price=probe
```

That last pair is deliberately wrong, so you can see what the next command does
with it. Steps you leave out are recorded as not run, and the outcome becomes
`blocked` rather than `clean`, because a run that half happened is not a run that
worked.

11. Reconcile.

```
./os reconcile
```

Two lists, never one number.

**RISK** is a cheaper tier running work the table assigns higher. `price` was
assigned judge and ran on probe, so it is listed here. This is the failure that
costs you a customer.

**WASTE** is a dearer tier running work a cheaper one was assigned. This costs
money and nothing else.

They are never added together. A single score would let a month of cheap savings
hide one expensive mistake. Fix every risk before you touch a single waste.

`os reconcile` exits non zero while any risk is listed, and zero when the only
finding is waste. That is the difference put where a script can read it.

### The same sequence on Windows

```
.\os.cmd routing
.\os.cmd ticks
.\os.cmd tick money-tick
.\os.cmd tick callback-tick
.\os.cmd tick callback-tick --record --step unbilled=probe,books=probe,cause=analyst,price=probe
.\os.cmd reconcile
.\os.cmd runs
```

## Say this

```
Read manual/10_PLUGINS.md and plugins/example-trade-rates/. I want one command
that answers this question about my business: <your question>. Write it as a
plugin that declares the smallest capability list that can do the job, and tell
me which capabilities you chose and what each one lets it do. The command must
print a fact I can check, not a status. Give it a check(ctx) that returns a
problem when the config it depends on is blank. Do not enable it, do not lock
it, and do not write to any registry. Show me the file first.
```

Then, for the tick:

```
Read manual/11_AGENTS.md and agents/routing.yml. Draft one tick as a yml file
under agents/ticks/. Use only task classes already in the routing table, and
tell me which tier each step lands on and why. At least two guardrails. Every
step needs a finish line I can check without asking you. Do not put a step in
that would route to never. Do not run anything.
```

Read the capability list and the routing table yourself before you accept
either draft. That is the whole review. Seven capabilities and one screen of
task classes, which is why it is worth doing every time and not once.

## Check it

```
./os plugin verify
./os ticks
./os runs
./os reconcile
```

`plugin verify` passes on all three plugins including yours. `ticks` lists your
tick with a real last outcome instead of "never run". `runs` shows the run you
recorded. `reconcile` names the misrouted step.

Then fix the routing you got wrong, in the record and not just in your head. Run
the step again on the right tier and record it honestly. `os reconcile` reads
what is in `data/runs.jsonl`, so an honest log is the only kind that is worth
anything.

## When it goes wrong

**"No command 'callbacks'."** Either the plugin is off or its entry module
raised. `./os plugin list` answers the first, and the bottom of `./os help`
answers the second, under "Problems loading commands", with the exception on one
line. `./os plugin verify callback-cost` names the same exception. Nothing else
stops working while a plugin is broken, which is why the CLI still ran.

**`verify` says "plugin.py does not match plugin.lock. It changed since the lock
was written".** Usually that change was you, five minutes ago. Confirm it was,
then `./os plugin lock callback-cost` again. If you did not touch it, do not lock
it. Read the file first.

**`os tick` refuses to plan.** Two versions of this. A message that a task
class is not in your `routing.yml`, followed by every class that is, means you
invented one. Run `./os routing`, which names it and the step using it, then
either use a class that exists or add yours to the table under a tier on
purpose. A message starting REFUSED, saying the class is one the table marks
`never`, means you wrote a step that sends, pays, signs or deletes. It does not
fall back to a judge, because a fallback is a slower yes.

## What to change next

`manual/08_UPGRADE.md` is the file for changes that belong in the core rather
than in a plugin. Adding a command, for deterministic work that belongs in
`scripts/os.py`. Adding a column to a registry, at the end of the `cols` list and
never in the middle. Adding a tool, with a finish line and at least one refusal.
It also has the four commands to run in order every time you update, and
`os backup` is the first of them.

A migration is the other half. If your change needs a file or a column that does
not exist yet, ship it as a migration inside your plugin rather than asking
anyone to edit a CSV by hand. `plugins/example-trade-rates/migrations/001_rates.py`
is under forty lines and it is the pattern.
