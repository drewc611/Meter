# plugins/

Every folder in here that does not start with an underscore is a plugin. A
plugin is a folder with a `plugin.json` manifest and an entry module. Nothing
registers itself anywhere else. Delete the folder and the plugin is gone.

```
plugins/
  _template/              what `os plugin new` copies
  example-quotes-pdf/     commands, tools
  example-trade-rates/    commands, migrations
```

## Start here

```
os plugin list
os plugin info example-trade-rates
os plugin verify
os plugin new my-thing --capabilities commands
```

The full account is in `manual/10_PLUGINS.md`. The short version follows.

## The manifest

```json
{
  "name": "example-trade-rates",
  "version": "1.0.0",
  "title": "Trade rate card",
  "description": "one line",
  "author": "you",
  "licence": "yours to pick",
  "requires": {"operator_os": ">=1.0"},
  "capabilities": ["commands", "migrations"],
  "entry": "plugin.py",
  "enabled": true
}
```

`name` must match the folder name. Every field above is required except
`author`, `licence` and `requires`.

## Capabilities

| Capability | What it permits |
|---|---|
| `commands` | register CLI commands |
| `tools` | ship `tools/<name>/SKILL.md` files |
| `adapters` | ship an adapter folder |
| `workspaces` | ship a workspace seed |
| `reports` | ship report templates |
| `migrations` | ship migrations that add columns or files |
| `writes` | write to the data layer at all |

A capability the manifest does not declare is refused at the point of use, and
the refusal names the plugin and the capability. A plugin without `writes` gets
a data layer that reads and raises on every write.

## The entry module

```python
def register(reg, ctx):   # only called when "commands" is declared
    ...

def tools():              # optional, paths to SKILL.md files
    return ["tools/thing/SKILL.md"]

def check(ctx):           # optional self test, run by os plugin verify
    return []             # a list of problems, empty means fine
```

## Turning one on and off

`os plugin enable <name>` and `os plugin disable <name>` write
`data/plugins.state`. The manifest is what the author shipped. The state file is
what you decided, and it wins. Neither command edits `plugin.json`, so the
checksums in `plugin.lock` stay true.

## Before you trust one

A plugin is python running in your process, with your files. `os plugin verify`
checks the manifest, the version range, the capability list, that the entry
imports, that the declared files are there, and that every file still matches
`plugin.lock`. It cannot tell you the code is safe. Read it, or do not install
it.
