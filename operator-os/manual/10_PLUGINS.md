# 10 Plugins

A plugin is a folder. It has a manifest, an entry module, and a list of things
it is allowed to do. Everything else about it is optional.

This is the part of the system that lets someone else extend it without you
reading their diff against `lib/`. It works because the list of things a plugin
is allowed to do is short, written down in the plugin's own manifest, and
enforced by the loader rather than by good manners.

## The contract

```
plugins/my-thing/
  plugin.json      the manifest
  plugin.py        the entry module
  tools/           optional, one folder per tool, one SKILL.md in each
  migrations/      optional, NNN_name.py, same shape as a core migration
  plugin.lock      optional, a sha256 of every file above
```

```json
{
  "name": "my-thing",
  "version": "1.0.0",
  "title": "My Thing",
  "description": "one line",
  "author": "you",
  "licence": "yours to pick",
  "requires": {"operator_os": ">=1.0"},
  "capabilities": ["commands", "tools"],
  "entry": "plugin.py",
  "enabled": true
}
```

`name` must equal the folder name. `requires.operator_os` is checked against the
version in `brand.json` and accepts `>=`, `>`, `<=`, `<`, `==`, `!=`, a bare
version meaning at least, and a comma separated list meaning all of them. A spec
the loader cannot parse is a no, because a plugin that cannot say what it needs
has not said it works here.

The entry module defines up to three functions:

```python
def register(reg, ctx):   # called only when "commands" is declared
def tools():              # optional, returns paths to SKILL.md files
def check(ctx):           # optional self test, returns a list of problems
```

## The capability list

| Capability | What it permits |
|---|---|
| `commands` | register CLI commands |
| `tools` | ship `tools/<name>/SKILL.md` files |
| `adapters` | ship an adapter folder |
| `workspaces` | ship a workspace seed |
| `reports` | ship report templates |
| `migrations` | ship migrations that add columns or files |
| `writes` | write to the data layer at all |

Nothing outside that list is a capability. A manifest that invents one is
invalid and the plugin does not load.

## Why the list exists

Installing a plugin is a decision about trust, and trust needs something
smaller than the whole codebase to be about. The capability list is that
smaller thing. Reading seven words tells you a rate card plugin can add commands
and a table and cannot touch your invoices.

The refusal is the feature. Ask for something you did not declare and you get:

```
plugin example-trade-rates tried to call osdata.put() on the data layer.
That needs the 'writes' capability and its manifest does not declare it
```

Plugin named, capability named, no stack trace to read. The same shape of
sentence comes back for tools, migrations, adapters, workspaces and reports.

A plugin that does not declare `writes` is handed a data layer that reads
normally and raises on `save`, `put`, `drop`, `bulk`, `write_config`,
`init_empty` and `render_seed`. A plugin that does declare `writes` gets the
real thing, and every row it changes lands in the event log tagged with its
name, so `os log` answers who did this.

## What a plugin can and cannot reach

It can read every registry through `ctx.data`. It can render files into
`data/out/`, which holds output and not records. It can create its own table
with its own migration and then read and write that table. With `writes` it can
change core rows, and every change is logged against it.

It cannot register a command that already exists. The registry refuses the
second claim, names the plugin and names whatever already owns that command, and
the original keeps working.

It cannot take the CLI down. A plugin that raises while importing, or while
registering, becomes a line under "Problems loading commands" at the bottom of
`os help`. Everything else still runs.

It cannot open a core registry through `ctx.table()`. That helper is for tables
a plugin owns, and it refuses any name in `SCHEMA`.

It cannot quietly become enabled. `os plugin enable` and `os plugin disable`
write `data/plugins.state`, which overrides the manifest. Neither one edits
`plugin.json`, so a lock stays true across the decision.

Here is the part that is not a boundary. A plugin is python, running in your
process, as you. The capability model is enforced at the module boundary, not at
the filesystem. Nothing stops a determined plugin from calling `open()` on
`contacts.csv` itself. The list tells you what a plugin says it needs, and stops
the accidents. It is not a sandbox and this manual will not pretend otherwise.
Read the code, or do not install it.

## Writing one

```
os plugin new rate-tweaks --capabilities commands
```

That copies `plugins/_template`, rewrites the manifest, keeps only the folders
your capabilities call for, and leaves the plugin switched off. Then:

1. Edit `plugin.py`. `register(reg, ctx)` gets the same registry the core
   commands use. `reg.add(name, fn, group=, summary=, group_blurb=)` is the
   whole interface. Your command function takes a list of arguments and returns
   an exit code.
2. Print something a person can check. Every core command ends with a fact, not
   a claim, and a plugin command that says "done" is worse than one that says
   nothing.
3. If you ship a tool, follow the six section shape in `manual/03_TOOLS.md`,
   including a finish line and at least one refusal.
4. If you need a file that does not exist yet, ship a migration. Same shape as
   a core one: a `DESCRIPTION` and one `up(data_dir)` that returns a line saying
   what it did. Files it creates are recorded in `data/.plugin-files` as
   belonging to your plugin, which is what lets `ctx.table()` write them later
   without the `writes` capability.
5. Turn it on, then verify it.

```
os plugin enable rate-tweaks
os plugin verify rate-tweaks
os help
```

Plugin commands appear in `os help` tagged with the plugin they came from.

## Verifying one

```
os plugin verify           every plugin, non zero exit if any fail
os plugin verify <name>    one of them
os plugin lock <name>      record a sha256 of every file
os plugin doctor           every plugin, every check, one screen
```

`verify` checks the manifest fields, that the name matches the folder, the
version range, that every declared capability is real, that shipped folders
match declared capabilities, that the entry imports, that `register` exists when
`commands` is declared, that `tools()` points at files that are there, that a
plugin declaring `migrations` ships some, and that every file still matches
`plugin.lock`. Then it runs the plugin's own `check(ctx)` and adds whatever that
returns.

`lock` is how you find out later that a file changed. Write the lock when you
install a plugin you trust. After that, `verify` fails on any edit, including
your own, until you lock it again.

## Migrations a plugin ships

Plugin migrations run at three moments: when core `os migrate` runs migration
`004_plugins.py`, when you enable a plugin, and when you run `os plugin migrate`.
Applied ones are recorded in `data/.plugin-migrations` by plugin and file name,
so a rerun does nothing.

They may add files and columns. They may not rewrite a core registry, and
`os validate` is the check that says so.

## The four examples

`plugins/example-quotes-pdf` declares `commands` and `tools`. It adds
`os quote-sheet <quote_id>`, which renders one row of `quotes.csv` into a self
contained HTML page in `data/out/` that prints to PDF from any browser, with no
network and no libraries. It ships `tools/quote-sheet/SKILL.md`. It never
changes a row and does not ask for `writes`.

`plugins/example-trade-rates` declares `commands` and `migrations`. Its
migration creates `data/rates.csv` with code, label, unit, rate and notes, and
it adds `os rates` and `os rates set <code> <rate>`. It extends the data layer
without a line changing in `lib/osdata.py`. It does not ask for `writes` either,
because the only table it writes is the one it created.

`plugins/example-recurring-reminders` declares `commands` and `tools`. It adds
`os reminders [days]`, a read-only view over `recurring.csv` split into
overdue, due-soon and no-`next_date` sections, and ships
`tools/renewal-reminder/SKILL.md`. It only reads through `ctx.data`, so it does
not ask for `writes` either.

`plugins/example-expense-rules` declares `commands` and `migrations`. Its
migration creates `data/rules.csv` with keyword, category and notes, and it
adds `os rules`, `os rules add <keyword> <category>` and `os rules check`.
`check` reads `expenses.csv` and prints where a rule disagrees with a row's
own category; it never rewrites `expenses.csv` itself, which is why it does
not ask for `writes` despite touching two files.

All four are meant to be copied. Read them before you write your own.

## The commands

| Command | What it does |
|---|---|
| `os plugin list` | name, version, enabled, valid, capabilities |
| `os plugin info <name>` | the manifest, the files, and what it adds |
| `os plugin verify [name]` | the full check, non zero exit on any failure |
| `os plugin enable <name>` | turn one on, and run any migrations it ships |
| `os plugin disable <name>` | turn one off |
| `os plugin new <name> --capabilities commands,tools` | scaffold from the template |
| `os plugin migrate [name]` | run migrations a plugin ships |
| `os plugin lock <name>` | record a checksum of every file |
| `os plugin doctor` | every plugin, every check, one screen |
