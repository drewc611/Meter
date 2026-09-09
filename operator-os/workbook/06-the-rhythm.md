# 06 The rhythm

Forty five minutes. The tools are worth nothing without a cadence. This module
installs the cadence and then gets out of the way.

## The finish line

The console opens, a backup exists, and the weekly run is written down somewhere
you will actually see it.

## The cadence, in full

**Every working day, five minutes.**

```
./os brief
```

Pick three. One that protects money, one that moves committed work, one that
keeps next month alive. Say the one thing that must be true by tonight.

**End of every working day, three minutes.** Log time, including the unpaid
hours. This is the entry people skip, and it is the one that makes every other
number honest.

**Every week, one fixed morning, twenty minutes.** In this order, because the
order is the point:

1. chase, money already earned
2. pipeline, every deal gets a next action
3. followup, the loops that close themselves in silence
4. schedule, fit the week into the hours that exist

**Every Friday, twenty minutes.**

```
./os week
```

Six answers, written to a file under `data/notes/weeks/`. Money in, money owed,
work, demand, loops, and one decision.

**Every month, forty minutes.** Pricing, tax set aside, reaper, and update
`manual/01_REGISTRY.md`.

## Say this

```
Run the week tool. Give me the six answers in order and write them to
data/notes/weeks/. Do not list activity. List outcomes. End with one decision,
not a list of decisions.
```

Monthly:

```
Run the reaper tool. Propose removals in five batches: stale tasks, dead deals,
expired quotes, finished projects, and recurring costs. Show me each batch with
the reason before changing anything. For the recurring costs, read every line out
with the annual figure next to it.
```

That last one is the highest yield ten minutes in the system. Almost nobody does
it, and almost everybody finds something.

## The console

```
./os console
```

Then open `console/index.html` in any browser. It reads one file on your disk and
touches nothing else. Bookmark it. On a Mac you can drag the file to your dock.

Refresh it whenever you want the numbers current. If you want that to happen by
itself, add one line to your machine's scheduler:

Mac, in Terminal, `crontab -e`:

```
0 7 * * 1-5 cd ~/operator-os && ./os console
```

Windows, in PowerShell as administrator:

```
schtasks /create /tn "Operator OS console" /tr "cmd /c cd C:\Users\%USERNAME%\operator-os && os.cmd console" /sc daily /st 07:00
```

## Back it up, once, properly

```
./os backup
```

That copies `data/` with today's date. Better, if you have git:

```
git add data && git commit -m "business as of today"
```

Now you have every version of your business you have ever had, and restoring is
copying a folder back. There is no repair mode because there is nothing to
repair. It is files.

## When the rhythm breaks

It will. Recovery is always the same three commands, never "catch up on
everything":

```
./os validate     # then run the reaper on what it shows
./os aging        # then chase
./os brief        # then pick three
```

Dead rows out, money in, three things. You are back inside ten minutes.

## What to do next

Read `manual/08_UPGRADE.md` and add one tool of your own. Copy the six section
shape from any file in `tools/`. Give it a finish line and at least one refusal.
A tool without a refusal has not been thought about yet.
