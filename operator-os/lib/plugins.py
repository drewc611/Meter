"""
Plugin system.

A plugin is a folder under plugins/ with a plugin.json manifest and an entry
module. Plugins add commands, tools, adapters, workspaces, reports and
migrations. They do it through the same registry the core commands use, so a
plugin command is not a second class command.

The manifest declares capabilities. A capability the manifest does not name is
refused at the point of use, by name, with the plugin named too. That refusal is
the whole contract. Everything else here is bookkeeping around it.

Enforcement is at the module boundary, not at the filesystem. A plugin is python
running in your process. Read manual/10_PLUGINS.md before you install one you
did not write.
"""

import hashlib
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import osdata as D  # noqa: E402

# ---------------------------------------------------------------- constants

CAPABILITIES = (
    "commands",     # may register CLI commands
    "tools",        # may ship tools/<name>/SKILL.md files
    "adapters",     # may ship an adapter folder
    "workspaces",   # may ship a workspace seed
    "reports",      # may ship report templates
    "migrations",   # may ship migrations that add columns or files
    "writes",       # may write to the data layer at all
)

CAPABILITY_NOTES = {
    "commands": "may register CLI commands",
    "tools": "may ship tools/<name>/SKILL.md files",
    "adapters": "may ship an adapter folder",
    "workspaces": "may ship a workspace seed",
    "reports": "may ship report templates",
    "migrations": "may ship migrations that add columns or files",
    "writes": "may write to the data layer at all",
}

REQUIRED_FIELDS = ("name", "version", "title", "description", "entry", "capabilities")

# Folders a plugin may ship, and the capability each one needs.
SHIPPED = (
    ("tools", "tools"),
    ("adapters", "adapters"),
    ("workspaces", "workspaces"),
    ("reports", "reports"),
    ("migrations", "migrations"),
)

# Every osdata function that changes a file on disk.
WRITE_ATTRS = ("save", "put", "drop", "bulk", "write_config", "init_empty",
               "render_seed")
CAUSE_ATTRS = ("put", "drop", "bulk")

STATE_FILE = "plugins.state"
MIG_STATE = ".plugin-migrations"
OWNED_FILE = ".plugin-files"
SKIP_NAMES = ("__pycache__", ".DS_Store", "plugin.lock")


class CapabilityError(Exception):
    """Raised when a plugin reaches for something its manifest does not declare."""


class PluginError(Exception):
    """Raised when a plugin cannot be found or cannot be loaded at all."""


def refusal(name, capability, what):
    return "plugin {} tried to {}. That needs the '{}' capability and its manifest does not declare it".format(
        name, what, capability)


# ---------------------------------------------------------------- locations

def plugin_dir():
    """Where plugins live. The environment override exists so the test suite can
    point the loader at a folder of deliberately broken plugins."""
    return os.environ.get("OPERATOR_OS_PLUGINS", os.path.join(ROOT, "plugins"))


def product_version():
    try:
        with open(os.path.join(ROOT, "brand.json"), "r", encoding="utf-8") as fh:
            return str(json.load(fh).get("version") or "0")
    except Exception:
        return "0"


# ---------------------------------------------------------------- versions

def _parts(v):
    out = []
    for chunk in re.split(r"[.\-+]", str(v).strip().lstrip("vV")):
        out.append(int(chunk) if chunk.isdigit() else 0)
    return out or [0]


def _compare(a, b):
    pa, pb = _parts(a), _parts(b)
    while len(pa) < len(pb):
        pa.append(0)
    while len(pb) < len(pa):
        pb.append(0)
    return (pa > pb) - (pa < pb)


def version_ok(spec, product=None):
    """Does the running product satisfy a requires string like '>=1.0'?

    Accepts >=, >, <=, <, ==, !=, a bare version meaning >=, a comma separated
    list meaning all of them, and '*' meaning anything. An unparseable spec is
    a no, because a plugin that cannot say what it needs has not said it works.
    """
    product = product or product_version()
    spec = "" if spec is None else str(spec).strip()
    if not spec or spec in ("*", "any"):
        return True
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"^(>=|<=|==|!=|=|>|<)?\s*v?([0-9][0-9A-Za-z.\-+]*)$", part)
        if not m:
            return False
        op = m.group(1) or ">="
        if op == "=":
            op = "=="
        c = _compare(product, m.group(2))
        ok = {">=": c >= 0, ">": c > 0, "<=": c <= 0, "<": c < 0,
              "==": c == 0, "!=": c != 0}[op]
        if not ok:
            return False
    return True


# ---------------------------------------------------------------- state

def _state_path():
    return os.path.join(D.DATA, STATE_FILE)


def state():
    """Enable and disable decisions the operator made, which override the
    manifest. The manifest is what the author shipped. This is what you chose."""
    out = {}
    p = _state_path()
    if not os.path.exists(p):
        return out
    with open(p, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.split("#", 1)[0].strip()
            if not line or ":" not in line:
                continue
            k, v = line.split(":", 1)
            out[k.strip()] = v.strip().lower() in ("enabled", "yes", "true", "on", "1")
    return out


def set_state(name, on):
    cur = state()
    cur[name] = bool(on)
    os.makedirs(D.DATA, exist_ok=True)
    with open(_state_path(), "w", encoding="utf-8") as fh:
        fh.write("# Plugin on and off switches. The manifest is the default, this wins.\n")
        for k in sorted(cur):
            fh.write("{}: {}\n".format(k, "enabled" if cur[k] else "disabled"))
    return cur[name]


# ---------------------------------------------------------------- manifests

def _read_manifest(folder):
    path = os.path.join(folder, "plugin.json")
    if not os.path.exists(path):
        return None, ["no plugin.json in {}".format(folder)]
    try:
        with open(path, "r", encoding="utf-8") as fh:
            man = json.load(fh)
    except ValueError as exc:
        return None, ["plugin.json is not valid JSON: {}".format(exc)]
    if not isinstance(man, dict):
        return None, ["plugin.json holds a {}, expected an object".format(
            type(man).__name__)]
    return man, []


def _manifest_problems(folder_name, man):
    problems = []
    for field in REQUIRED_FIELDS:
        if field not in man or man.get(field) in (None, "", []):
            problems.append("manifest is missing the required field '{}'".format(field))
    name = man.get("name") or folder_name
    if man.get("name") and man["name"] != folder_name:
        problems.append("manifest name '{}' does not match the folder name '{}'".format(
            man["name"], folder_name))
    caps = man.get("capabilities")
    if caps is not None and not isinstance(caps, list):
        problems.append("capabilities must be a list, not a {}".format(type(caps).__name__))
        caps = []
    for c in (caps or []):
        if c not in CAPABILITIES:
            problems.append("'{}' is not a capability. The list is: {}".format(
                c, ", ".join(CAPABILITIES)))
    req = man.get("requires") or {}
    if not isinstance(req, dict):
        problems.append("requires must be an object like {\"operator_os\": \">=1.0\"}")
    else:
        spec = req.get("operator_os")
        if spec and not version_ok(spec):
            problems.append("needs Operator OS {} and this is {}".format(
                spec, product_version()))
    entry = man.get("entry")
    if entry and (os.path.isabs(entry) or ".." in entry.replace("\\", "/").split("/")):
        problems.append("entry '{}' points outside the plugin folder".format(entry))
    del name
    return problems, [c for c in (caps or []) if isinstance(c, str)]


def _describe(folder):
    folder_name = os.path.basename(folder.rstrip(os.sep))
    man, problems = _read_manifest(folder)
    caps = []
    if man is not None:
        more, caps = _manifest_problems(folder_name, man)
        problems = problems + more
    man = man or {}
    plug = {
        "name": man.get("name") or folder_name,
        "folder": folder_name,
        "path": folder,
        "manifest": man,
        "capabilities": caps,
        "version": str(man.get("version") or ""),
        "title": man.get("title") or "",
        "description": man.get("description") or "",
        "entry": man.get("entry") or "plugin.py",
        "problems": problems,
        "valid": not problems,
    }
    declared = man.get("enabled", True)
    plug["enabled"] = bool(state().get(plug["name"], declared is not False))
    return plug


def all():
    """Every plugin folder with its manifest, valid or not, in name order."""
    root = plugin_dir()
    out = []
    if not os.path.isdir(root):
        return out
    for entry in sorted(os.listdir(root)):
        if entry.startswith("_") or entry.startswith("."):
            continue
        folder = os.path.join(root, entry)
        if not os.path.isdir(folder):
            continue
        out.append(_describe(folder))
    return sorted(out, key=lambda p: p["name"])


def enabled():
    """The enabled and valid ones, in name order. This is what the CLI loads."""
    return [p for p in all() if p["valid"] and p["enabled"]]


def find(name):
    for p in all():
        if p["name"] == name or p["folder"] == name:
            return p
    return None


def need(name):
    p = find(name)
    if p is None:
        known = ", ".join(x["name"] for x in all()) or "none installed"
        raise PluginError("no plugin called '{}'. Installed: {}".format(name, known))
    return p


# ---------------------------------------------------------------- files

def files(plug):
    """Every file that belongs to the plugin, relative to its folder."""
    out = []
    base = plug["path"]
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_NAMES)
        for f in sorted(filenames):
            if f in SKIP_NAMES or f.endswith(".pyc"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, f), base)
            out.append(rel.replace(os.sep, "/"))
    return sorted(out)


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def checksums(plug):
    return {rel: _sha256(os.path.join(plug["path"], rel)) for rel in files(plug)}


def lock_path(plug):
    return os.path.join(plug["path"], "plugin.lock")


def read_lock(plug):
    p = lock_path(plug)
    if not os.path.exists(p):
        return None
    out = {}
    with open(p, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            bits = line.split(None, 1)
            if len(bits) == 2:
                out[bits[1].strip()] = bits[0].strip()
    return out


def lock(plug):
    """Record a sha256 of every file in the plugin. Verify compares against it."""
    sums = checksums(plug)
    with open(lock_path(plug), "w", encoding="utf-8") as fh:
        fh.write("# {} {} file checksums. Rerun `os plugin lock {}` after any edit.\n".format(
            plug["name"], plug["version"], plug["name"]))
        for rel in sorted(sums):
            fh.write("{}  {}\n".format(sums[rel], rel))
    return sums


def lock_problems(plug):
    recorded = read_lock(plug)
    if recorded is None:
        return []
    now = checksums(plug)
    problems = []
    for rel in sorted(recorded):
        if rel not in now:
            problems.append("{} is in plugin.lock and is no longer on disk".format(rel))
        elif now[rel] != recorded[rel]:
            problems.append("{} does not match plugin.lock. It changed since the lock was written".format(rel))
    for rel in sorted(now):
        if rel not in recorded:
            problems.append("{} is on disk and not in plugin.lock".format(rel))
    return problems


# ---------------------------------------------------------------- loading

_LOADED = {}


def entry_path(plug):
    return os.path.join(plug["path"], plug["entry"])


def load(name):
    """Import the entry module. Raises whatever the plugin raises."""
    plug = need(name) if isinstance(name, str) else name
    path = entry_path(plug)
    if not os.path.exists(path):
        raise PluginError("plugin {} declares entry '{}' and that file is not there".format(
            plug["name"], plug["entry"]))
    key = os.path.abspath(path)
    stamp = os.path.getmtime(path)
    cached = _LOADED.get(key)
    if cached and cached[0] == stamp:
        return cached[1]
    modname = "osplugin_" + re.sub(r"[^0-9a-zA-Z_]", "_", plug["name"])
    spec = importlib.util.spec_from_file_location(modname, path)
    mod = importlib.util.module_from_spec(spec)
    if plug["path"] not in sys.path:
        sys.path.insert(0, plug["path"])
    spec.loader.exec_module(mod)
    _LOADED[key] = (stamp, mod)
    return mod


# ---------------------------------------------------------------- data layer

class DataLayer(object):
    """What a plugin gets instead of the osdata module.

    Reading is always allowed. Writing is allowed only with the writes
    capability, and every write it does make is tagged in the event log with the
    plugin that made it, so `os log` shows who did what.
    """

    def __init__(self, plug):
        self._name = plug["name"]
        self._writes = "writes" in plug["capabilities"]

    def _tag(self, fn):
        tag = "plugin " + self._name
        def call(*args, **kwargs):
            if "cause" in kwargs:
                kwargs["cause"] = "{}: {}".format(tag, kwargs["cause"]) if kwargs["cause"] else tag
            elif len(args) >= 3 and isinstance(args[2], str):
                args = list(args)
                args[2] = "{}: {}".format(tag, args[2]) if args[2] else tag
                args = tuple(args)
            else:
                kwargs["cause"] = tag
            return fn(*args, **kwargs)
        return call

    def __getattr__(self, attr):
        if attr in WRITE_ATTRS:
            if not self._writes:
                raise CapabilityError(refusal(
                    self._name, "writes", "call osdata.{}() on the data layer".format(attr)))
            fn = getattr(D, attr)
            return self._tag(fn) if attr in CAUSE_ATTRS else fn
        return getattr(D, attr)


class Table(object):
    """A CSV a plugin owns, next to the core registries and not part of them.

    A plugin owns a table if one of its own migrations created the file. Reading
    is open. Writing needs ownership, or the writes capability. Core registries
    are never reachable through here.
    """

    def __init__(self, plug, name, cols):
        self.plugin = plug["name"]
        self.name = name
        self.cols = list(cols)
        self._writes = "writes" in plug["capabilities"]

    @property
    def path(self):
        return os.path.join(D.DATA, self.name + ".csv")

    def exists(self):
        return os.path.exists(self.path)

    def read(self):
        import csv
        if not self.exists():
            return []
        with open(self.path, "r", encoding="utf-8-sig", newline="") as fh:
            rows = list(csv.DictReader(fh))
        return [{c: (r.get(c) or "").strip() for c in self.cols} for r in rows]

    def write(self, rows):
        import csv
        owner = owned_files().get(self.name + ".csv")
        if owner != self.plugin and not self._writes:
            if owner:
                raise CapabilityError(
                    "plugin {} tried to write {}.csv, which plugin {} owns. That needs the "
                    "'writes' capability and its manifest does not declare it".format(
                        self.plugin, self.name, owner))
            raise CapabilityError(refusal(
                self.plugin, "writes",
                "write {}.csv, a table no migration of its own created".format(self.name)))
        os.makedirs(D.DATA, exist_ok=True)
        with open(self.path, "w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=self.cols, extrasaction="ignore")
            w.writeheader()
            for r in rows:
                w.writerow({c: r.get(c, "") for c in self.cols})
        return len(rows)


class Context(object):
    """The ctx handed to register(reg, ctx) and check(ctx)."""

    def __init__(self, plug):
        self.plugin = plug
        self.name = plug["name"]
        self.version = plug["version"]
        self.title = plug["title"]
        self.path = plug["path"]
        self.root = ROOT
        self.capabilities = list(plug["capabilities"])
        self.data = DataLayer(plug)

    def has(self, capability):
        return capability in self.capabilities

    def require(self, capability, what=None):
        if capability not in CAPABILITIES:
            raise CapabilityError("'{}' is not a capability. The list is: {}".format(
                capability, ", ".join(CAPABILITIES)))
        if capability not in self.capabilities:
            raise CapabilityError(refusal(
                self.name, capability, what or "use {}".format(capability)))
        return True

    def config(self):
        return D.config()

    def table(self, name, cols):
        if name in D.SCHEMA:
            raise CapabilityError(
                "plugin {} tried to open the core registry {} as its own table. Core "
                "registries go through ctx.data and need the 'writes' capability".format(
                    self.name, name))
        return Table(self.plugin, name, cols)

    def out_path(self, filename):
        """A path under data/out/. Rendered output, not the data layer. Anything
        here can be deleted without losing a business record."""
        clean = os.path.basename(str(filename).strip())
        if not clean or clean in (".", ".."):
            raise ValueError("out_path needs a file name, got '{}'".format(filename))
        out = os.path.join(D.DATA, "out")
        os.makedirs(out, exist_ok=True)
        return os.path.join(out, clean)


def context(plug):
    return Context(plug)


# ---------------------------------------------------------------- commands

def register_commands(plug, reg):
    """Called by registry.discover for every enabled plugin.

    Enforces the commands capability, tags the source so `os help` shows where a
    command came from, and turns any exception the plugin raises into a line in
    reg.problems. A broken plugin makes the help output uglier. It does not stop
    the CLI.
    """
    problems = []

    def fail(msg):
        problems.append(msg)
        if msg not in reg.problems:
            reg.problems.append(msg)

    name = plug["name"]
    if "commands" not in plug["capabilities"]:
        fail(refusal(name, "commands", "register a command"))
        return problems
    previous = getattr(reg, "_source", "core")
    reg._source = "plugin " + name
    try:
        mod = load(plug)
        fn = getattr(mod, "register", None)
        if fn is None:
            fail("plugin {} declares commands and its entry {} has no register(reg, ctx)".format(
                name, plug["entry"]))
        else:
            fn(reg, context(plug))
    except Exception as exc:
        fail("plugin {} failed while registering commands: {}: {}".format(
            name, type(exc).__name__, exc))
    finally:
        reg._source = previous
    return problems


def command_names(plug):
    """Which commands this plugin adds, found by registering it into a throwaway
    registry rather than by asking it."""
    import registry as REG
    scratch = REG.Registry()
    before = set(scratch.commands)
    register_commands(plug, scratch)
    return sorted(set(scratch.commands) - before), scratch.problems


# ---------------------------------------------------------------- tools

def tools(plug):
    """SKILL.md paths the plugin ships. Refused without the tools capability."""
    if "tools" not in plug["capabilities"]:
        raise CapabilityError(refusal(plug["name"], "tools", "ship a tool"))
    mod = load(plug)
    fn = getattr(mod, "tools", None)
    found = list(fn()) if fn else []
    if not found:
        tdir = os.path.join(plug["path"], "tools")
        if os.path.isdir(tdir):
            for entry in sorted(os.listdir(tdir)):
                skill = os.path.join(tdir, entry, "SKILL.md")
                if os.path.exists(skill):
                    found.append(skill)
    return [p if os.path.isabs(p) else os.path.join(plug["path"], p) for p in found]


def shipped_folder(plug, capability, folder):
    """An adapter, workspace or report folder the plugin ships."""
    if capability not in plug["capabilities"]:
        raise CapabilityError(refusal(
            plug["name"], capability, "ship a {} folder".format(folder)))
    path = os.path.join(plug["path"], folder)
    return path if os.path.isdir(path) else None


# ---------------------------------------------------------------- migrations

def _mig_state_path():
    return os.path.join(D.DATA, MIG_STATE)


def applied_migrations():
    p = _mig_state_path()
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8") as fh:
        return [l.strip() for l in fh if l.strip()]


def migration_files(plug):
    mdir = os.path.join(plug["path"], "migrations")
    if not os.path.isdir(mdir):
        return []
    return [f for f in sorted(os.listdir(mdir)) if re.match(r"^\d{3}_.+\.py$", f)]


def pending_migrations(plug):
    done = set(applied_migrations())
    return [f for f in migration_files(plug)
            if "{}/{}".format(plug["name"], f) not in done]


def owned_files():
    """Which plugin created which file in the data folder."""
    p = os.path.join(D.DATA, OWNED_FILE)
    out = {}
    if not os.path.exists(p):
        return out
    with open(p, "r", encoding="utf-8") as fh:
        for line in fh:
            bits = line.split()
            if len(bits) == 2:
                out[bits[1]] = bits[0]
    return out


def _record_owned(plug, new_files):
    if not new_files:
        return
    with open(os.path.join(D.DATA, OWNED_FILE), "a", encoding="utf-8") as fh:
        for f in sorted(new_files):
            fh.write("{} {}\n".format(plug["name"], f))


def _data_listing():
    if not os.path.isdir(D.DATA):
        return set()
    return set(os.listdir(D.DATA))


def run_migrations(plug, dry=False):
    """Run the plugin's pending migrations against the live data folder.

    Files a migration creates are recorded as owned by that plugin, which is
    what later lets ctx.table() write them without the writes capability.
    """
    if "migrations" not in plug["capabilities"]:
        raise CapabilityError(refusal(plug["name"], "migrations", "run a migration"))
    todo = pending_migrations(plug)
    if not todo:
        return []
    os.makedirs(D.DATA, exist_ok=True)
    mdir = os.path.join(plug["path"], "migrations")
    done = []
    for f in todo:
        path = os.path.join(mdir, f)
        spec = importlib.util.spec_from_file_location(
            "osplugmig_{}_{}".format(re.sub(r"[^0-9a-zA-Z_]", "_", plug["name"]), f[:-3]),
            path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        note = getattr(mod, "DESCRIPTION", "")
        if dry:
            done.append((f, note, "would run"))
            continue
        before = _data_listing()
        result = mod.up(D.DATA)
        _record_owned(plug, _data_listing() - before)
        with open(_mig_state_path(), "a", encoding="utf-8") as fh:
            fh.write("{}/{}\n".format(plug["name"], f))
        done.append((f, note, result or "done"))
    return done


def run_all_migrations(dry=False):
    out = []
    for plug in enabled():
        if "migrations" not in plug["capabilities"]:
            continue
        for row in run_migrations(plug, dry=dry):
            out.append((plug["name"],) + row)
    return out


# ---------------------------------------------------------------- verify

def verify(plug):
    """Every check there is, as a list of problems. An empty list is a pass."""
    problems = list(plug["problems"])

    entry = entry_path(plug)
    if not os.path.exists(entry):
        problems.append("entry '{}' is declared and is not on disk".format(plug["entry"]))
    else:
        try:
            mod = load(plug)
        except Exception as exc:
            mod = None
            problems.append("entry '{}' does not import: {}: {}".format(
                plug["entry"], type(exc).__name__, exc))
        if mod is not None:
            if "commands" in plug["capabilities"] and not hasattr(mod, "register"):
                problems.append("declares commands and has no register(reg, ctx)")
            if hasattr(mod, "register") and "commands" not in plug["capabilities"]:
                problems.append("defines register(reg, ctx) and does not declare the 'commands' capability, so it will never be called")
            if hasattr(mod, "tools") and "tools" not in plug["capabilities"]:
                problems.append("defines tools() and does not declare the 'tools' capability")

    for capability, folder in SHIPPED:
        present = os.path.isdir(os.path.join(plug["path"], folder))
        if present and capability not in plug["capabilities"]:
            problems.append("ships a {}/ folder and does not declare the '{}' capability".format(
                folder, capability))

    if "tools" in plug["capabilities"]:
        try:
            found = tools(plug)
        except Exception as exc:
            found = []
            problems.append("tools() raised {}: {}".format(type(exc).__name__, exc))
        if not found:
            problems.append("declares the 'tools' capability and ships no SKILL.md")
        for p in found:
            if not os.path.exists(p):
                problems.append("tools() names {} which is not on disk".format(p))
            elif os.path.basename(p) != "SKILL.md":
                problems.append("{} is not a SKILL.md. Tools are folders with one SKILL.md".format(p))

    if "migrations" in plug["capabilities"] and not migration_files(plug):
        problems.append("declares the 'migrations' capability and ships no migrations/NNN_name.py")

    problems.extend(lock_problems(plug))

    try:
        mod = load(plug)
        check = getattr(mod, "check", None)
        if check:
            for line in (check(context(plug)) or []):
                problems.append(str(line))
    except CapabilityError as exc:
        problems.append("check(ctx) was refused: {}".format(exc))
    except Exception as exc:
        if os.path.exists(entry) and "does not import" not in " ".join(problems):
            problems.append("check(ctx) raised {}: {}".format(type(exc).__name__, exc))

    return problems


def verify_all():
    return [(p, verify(p)) for p in all()]


# ---------------------------------------------------------------- scaffold

TEMPLATE = "_template"
NAME_RE = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$")
TOKENS = ("__PLUGIN_NAME__", "__PLUGIN_TITLE__")


def scaffold(name, capabilities):
    """Copy _template into a new plugin folder and rewrite its manifest."""
    if not NAME_RE.match(name or ""):
        raise PluginError(
            "'{}' is not a plugin name. Lower case letters, digits and single "
            "hyphens, starting with a letter. For example: trade-rates".format(name))
    caps = [c.strip() for c in capabilities if c and c.strip()]
    bad = [c for c in caps if c not in CAPABILITIES]
    if bad:
        raise PluginError("not a capability: {}. The list is: {}".format(
            ", ".join(bad), ", ".join(CAPABILITIES)))
    if not caps:
        caps = ["commands"]
    root = plugin_dir()
    src = os.path.join(root, TEMPLATE)
    if not os.path.isdir(src):
        raise PluginError("no template at {}. That folder is what `os plugin new` copies".format(src))
    dest = os.path.join(root, name)
    if os.path.exists(dest):
        raise PluginError("{} already exists. Pick another name or delete that folder yourself".format(dest))

    title = name.replace("-", " ")
    # The template ships one folder per shipped capability. Keep the ones asked
    # for and drop the rest, so a new plugin verifies clean on its first run.
    drop = [folder for capability, folder in SHIPPED if capability not in caps]
    written = []
    for dirpath, dirnames, filenames in os.walk(src):
        dirnames[:] = [d for d in dirnames if d not in SKIP_NAMES]
        rel = os.path.relpath(dirpath, src)
        if rel != "." and rel.replace(os.sep, "/").split("/")[0] in drop:
            dirnames[:] = []
            continue
        rel = rel.replace("__PLUGIN_NAME__", name)
        target_dir = dest if rel == "." else os.path.join(dest, rel)
        os.makedirs(target_dir, exist_ok=True)
        for f in filenames:
            if f in SKIP_NAMES or f.endswith(".pyc"):
                continue
            with open(os.path.join(dirpath, f), "r", encoding="utf-8") as fh:
                body = fh.read()
            body = body.replace("__PLUGIN_NAME__", name).replace("__PLUGIN_TITLE__", title)
            out = os.path.join(target_dir, f)
            with open(out, "w", encoding="utf-8") as fh:
                fh.write(body)
            written.append(os.path.relpath(out, dest).replace(os.sep, "/"))

    mpath = os.path.join(dest, "plugin.json")
    man = {}
    if os.path.exists(mpath):
        with open(mpath, "r", encoding="utf-8") as fh:
            man = json.load(fh)
    man.update({
        "name": name,
        "version": man.get("version") or "0.1.0",
        "title": title,
        "description": man.get("description") or "one line about what it does",
        "capabilities": caps,
        "entry": man.get("entry") or "plugin.py",
        "enabled": False,
    })
    man.setdefault("author", "")
    man.setdefault("licence", "")
    man.setdefault("requires", {"operator_os": ">=" + ".".join(product_version().split(".")[:2])})
    order = ["name", "version", "title", "description", "author", "licence",
             "requires", "capabilities", "entry", "enabled"]
    ordered = {}
    for k in order:
        if k in man:
            ordered[k] = man[k]
    for k in man:
        if k not in ordered:
            ordered[k] = man[k]
    with open(mpath, "w", encoding="utf-8") as fh:
        json.dump(ordered, fh, indent=2)
        fh.write("\n")
    return {"path": dest, "files": sorted(written), "capabilities": caps}
