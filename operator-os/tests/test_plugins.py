#!/usr/bin/env python3
"""
Plugin system tests.

Plain python. No pytest, no fixtures framework, no network. Run it:

    python3 tests/test_plugins.py

Every case builds a real plugin folder under a temporary directory, points the
loader at it with OPERATOR_OS_PLUGINS, and asserts on what the system does. The
cases that matter are the failures: a plugin reaching for a capability it did
not declare, a plugin that will not import, a plugin taking a command name that
is already taken, a manifest with a hole in it, a file that changed after it was
locked, and a plugin that wants a newer product than this one.

Exits non zero if anything fails.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIB = os.path.join(ROOT, "lib")

TMP = tempfile.mkdtemp(prefix="operator-os-plugin-tests-")
PLUGS = os.path.join(TMP, "plugins")
DATA = os.path.join(TMP, "data")
os.makedirs(PLUGS)
os.makedirs(DATA)

os.environ["OPERATOR_OS_DATA"] = DATA
os.environ["OPERATOR_OS_PLUGINS"] = PLUGS

sys.path.insert(0, LIB)
import plugins as P  # noqa: E402
import registry as REG  # noqa: E402

RESULTS = []


def check(name, condition, detail=""):
    RESULTS.append((name, bool(condition), detail))
    print("  {}  {}".format("pass" if condition else "FAIL", name))
    if not condition and detail:
        print("        {}".format(detail))
    return bool(condition)


def head(t):
    print("\n" + t)
    print("-" * 62)


def make(name, manifest=None, entry=None, extra=None):
    """Write a plugin folder under the temporary plugins directory."""
    folder = os.path.join(PLUGS, name)
    os.makedirs(folder, exist_ok=True)
    man = {
        "name": name,
        "version": "1.0.0",
        "title": name,
        "description": "a test plugin",
        "author": "tests",
        "licence": "none",
        "requires": {"operator_os": ">=1.0"},
        "capabilities": ["commands"],
        "entry": "plugin.py",
        "enabled": True,
    }
    if manifest is not None:
        man.update(manifest)
        for k, v in list(manifest.items()):
            if v is None:
                man.pop(k, None)
    with open(os.path.join(folder, "plugin.json"), "w", encoding="utf-8") as fh:
        json.dump(man, fh, indent=2)
    if entry is not None:
        with open(os.path.join(folder, "plugin.py"), "w", encoding="utf-8") as fh:
            fh.write(entry)
    for rel, body in (extra or {}).items():
        path = os.path.join(folder, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(body)
    return P.find(name)


PLAIN = '''
def register(reg, ctx):
    def cmd(args):
        print("ran")
        return 0
    reg.add("{cmd}", cmd, group="plugin", summary="a test command")
'''


# ---------------------------------------------------------------- cases

def test_no_capabilities_no_command():
    head("A plugin that declares no capabilities cannot register a command")
    plug = make("no-caps", {"capabilities": []},
                PLAIN.format(cmd="should-never-appear"))
    reg = REG.Registry()
    problems = P.register_commands(plug, reg)
    check("no command was registered", "should-never-appear" not in reg.commands,
          "registry holds: {}".format(sorted(reg.commands)))
    check("the refusal names the plugin", any("no-caps" in p for p in problems),
          str(problems))
    check("the refusal names the capability",
          any("commands" in p for p in problems), str(problems))
    check("the refusal is on the registry for os help to print",
          any("no-caps" in p for p in reg.problems), str(reg.problems))
    check("all() still lists it", any(p["name"] == "no-caps" for p in P.all()))
    check("enabled() does not", not any(p["name"] == "no-caps" for p in P.enabled()))
    print("        refusal: {}".format(problems[0] if problems else "none"))


def test_writes_capability():
    head("A plugin without the writes capability cannot write the data layer")
    plug = make("no-writes", {"capabilities": ["commands"]}, PLAIN.format(cmd="nw"))
    ctx = P.context(plug)
    rows = ctx.data.load("contacts")
    check("reading is allowed", isinstance(rows, list))
    refused = ""
    try:
        ctx.data.put("contacts", {"id": "c9999", "name": "Should not exist"})
        ok = False
    except P.CapabilityError as exc:
        refused = str(exc)
        ok = True
    check("put() raises CapabilityError", ok, refused or "no exception raised")
    check("the refusal names the plugin and the capability",
          "no-writes" in refused and "writes" in refused, refused)
    check("nothing was written", not os.path.exists(os.path.join(DATA, "contacts.csv"))
          or not any(r.get("id") == "c9999" for r in ctx.data.load("contacts")))
    core = ""
    try:
        ctx.table("contacts", ["id"])
    except P.CapabilityError as exc:
        core = str(exc)
    check("a core registry is not reachable through ctx.table()",
          "contacts" in core, core or "ctx.table('contacts') was allowed")
    print("        refusal: {}".format(refused))


def test_broken_entry_does_not_break_help():
    head("A plugin whose entry raises on import does not stop os help")
    make("boom", {"capabilities": ["commands"]},
         'raise RuntimeError("this plugin is broken on purpose")\n')
    env = dict(os.environ)
    run = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "os.py"), "help"],
                         capture_output=True, text=True, env=env)
    out = run.stdout + run.stderr
    check("os help exits 0", run.returncode == 0, "exit {}".format(run.returncode))
    check("core commands are still listed", "brief" in out and "validate" in out)
    check("the problem is reported by name", "boom" in out, out[-400:])
    check("the reason is reported", "broken on purpose" in out, out[-400:])
    line = [l.strip() for l in out.splitlines() if "boom" in l]
    print("        printed: {}".format(line[0] if line else "nothing"))


def test_duplicate_command_refused():
    head("A plugin taking a command name that already exists is refused")
    plug = make("thief", {"capabilities": ["commands"]}, PLAIN.format(cmd="brief"))
    reg = REG.discover(with_plugins=False)
    core_fn = reg.commands["brief"].fn
    P.register_commands(plug, reg)
    check("the core command still points at core code",
          reg.commands["brief"].fn is core_fn)
    check("the core command is still tagged core", reg.commands["brief"].source == "core")
    said = [p for p in reg.problems if "brief" in p]
    check("the refusal names the command", bool(said), str(reg.problems[-3:]))
    check("the refusal names the plugin", any("thief" in p for p in said), str(said))
    check("the refusal names what already owns it",
          any("core" in p for p in said), str(said))
    print("        refusal: {}".format(said[0] if said else "none"))


def test_manifest_missing_field():
    head("Verify catches a manifest missing a required field")
    plug = make("holey", {"description": None}, PLAIN.format(cmd="holey"))
    problems = P.verify(plug)
    named = [p for p in problems if "description" in p]
    check("verify reports it", bool(named), str(problems))
    check("the plugin is not valid", not plug["valid"])
    check("enabled() excludes it", not any(p["name"] == "holey" for p in P.enabled()))
    print("        problem: {}".format(named[0] if named else "none"))


def test_lock_checksum():
    head("Verify catches a file whose checksum no longer matches plugin.lock")
    plug = make("locked", {"capabilities": ["commands"]}, PLAIN.format(cmd="locked"))
    sums = P.lock(plug)
    check("plugin.lock was written", os.path.exists(P.lock_path(plug)))
    check("every file is in it", set(sums) == set(P.files(plug)),
          "{} vs {}".format(sorted(sums), P.files(plug)))
    check("verify passes while nothing has changed", P.verify(plug) == [],
          str(P.verify(plug)))
    path = os.path.join(plug["path"], "plugin.py")
    with open(path, "a", encoding="utf-8") as fh:
        fh.write("\n# one line added after the lock was written\n")
    problems = P.verify(plug)
    named = [p for p in problems if "plugin.py" in p and "plugin.lock" in p]
    check("verify now fails", bool(problems), "verify returned nothing")
    check("it names the file and the lock", bool(named), str(problems))
    with open(os.path.join(plug["path"], "sneaked-in.txt"), "w", encoding="utf-8") as fh:
        fh.write("a file nobody locked\n")
    extra = [p for p in P.verify(plug) if "sneaked-in.txt" in p]
    check("an unlisted file is reported too", bool(extra), str(P.verify(plug)))
    print("        problem: {}".format(named[0] if named else "none"))


def test_version_range():
    head("version_ok rejects a plugin requiring a newer product version")
    product = P.product_version()
    check("this product reports a version", bool(product), product)
    check(">=99.0 is rejected", not P.version_ok(">=99.0"), product)
    check(">=1.0 is accepted", P.version_ok(">=1.0"), product)
    check("an exact match is accepted", P.version_ok("==" + product))
    check("a bare version means at least", P.version_ok(product))
    check("<1.0 is rejected", not P.version_ok("<1.0"))
    check("a nonsense spec is rejected", not P.version_ok("newest please"))
    check("a missing spec is accepted", P.version_ok(""))
    plug = make("from-the-future", {"requires": {"operator_os": ">=99.0"}},
                PLAIN.format(cmd="future"))
    problems = P.verify(plug)
    named = [p for p in problems if "99.0" in p]
    check("verify reports the version it needs", bool(named), str(problems))
    check("it is not loaded", not any(p["name"] == "from-the-future" for p in P.enabled()))
    print("        problem: {}".format(named[0] if named else "none"))


def test_undeclared_capabilities():
    head("Every capability is refused by name when it is not declared")
    plug = make("shipper", {"capabilities": ["commands"]},
                PLAIN.format(cmd="shipper"),
                {"tools/shipper/SKILL.md": "# not declared\n"})
    refused = ""
    try:
        P.tools(plug)
    except P.CapabilityError as exc:
        refused = str(exc)
    check("tools() is refused", "tools" in refused and "shipper" in refused, refused)
    problems = P.verify(plug)
    check("verify says the folder is there without the capability",
          any("tools/" in p for p in problems), str(problems))
    mig = ""
    try:
        P.run_migrations(plug)
    except P.CapabilityError as exc:
        mig = str(exc)
    check("migrations are refused", "migrations" in mig and "shipper" in mig, mig)
    bad = make("liar", {"capabilities": ["commands", "telepathy"]},
               PLAIN.format(cmd="liar"))
    check("an invented capability is rejected",
          any("telepathy" in p for p in bad["problems"]), str(bad["problems"]))
    print("        refusal: {}".format(refused))


def test_enable_disable():
    head("Enabling and disabling is a file, not a manifest edit")
    plug = make("switchy", {"capabilities": ["commands"], "enabled": False},
                PLAIN.format(cmd="switchy"))
    check("it starts off", not plug["enabled"])
    before = P.checksums(plug)["plugin.json"]
    P.set_state("switchy", True)
    check("it is on now", P.find("switchy")["enabled"])
    check("plugin.json was not touched", P.checksums(plug)["plugin.json"] == before)
    check("the decision is in the data folder",
          os.path.exists(os.path.join(DATA, P.STATE_FILE)))
    P.set_state("switchy", False)
    check("it is off again", not P.find("switchy")["enabled"])


def test_shipped_examples():
    head("The two example plugins verify against the real plugins folder")
    real = dict(os.environ)
    os.environ.pop("OPERATOR_OS_PLUGINS")
    try:
        names = [p["name"] for p in P.all()]
        check("example-quotes-pdf is installed", "example-quotes-pdf" in names, str(names))
        check("example-trade-rates is installed", "example-trade-rates" in names, str(names))
        for name in ("example-quotes-pdf", "example-trade-rates"):
            plug = P.find(name)
            if plug is None:
                continue
            problems = [p for p in P.verify(plug)
                        if "rates.csv is not there" not in p]
            check("{} verifies".format(name), not problems, str(problems))
            check("{} declares only real capabilities".format(name),
                  all(c in P.CAPABILITIES for c in plug["capabilities"]))
    finally:
        os.environ.clear()
        os.environ.update(real)


def main():
    print("\nOperator OS plugin tests")
    print("  plugins: {}".format(PLUGS))
    print("  data:    {}".format(DATA))
    for fn in (test_no_capabilities_no_command,
               test_writes_capability,
               test_broken_entry_does_not_break_help,
               test_duplicate_command_refused,
               test_manifest_missing_field,
               test_lock_checksum,
               test_version_range,
               test_undeclared_capabilities,
               test_enable_disable,
               test_shipped_examples):
        try:
            fn()
        except Exception as exc:
            RESULTS.append((fn.__name__, False, "{}: {}".format(type(exc).__name__, exc)))
            print("  FAIL  {} raised {}: {}".format(fn.__name__, type(exc).__name__, exc))
    failed = [r for r in RESULTS if not r[1]]
    print("\n" + "-" * 62)
    print("{} checks, {} failed".format(len(RESULTS), len(failed)))
    for name, _, detail in failed:
        print("  FAIL  {}   {}".format(name, detail))
    shutil.rmtree(TMP, ignore_errors=True)
    print("  temporary plugins and data removed from {}\n".format(TMP))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
