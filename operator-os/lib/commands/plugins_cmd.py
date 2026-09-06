"""Plugin commands: what is installed, what it adds, and whether it is intact."""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.dirname(HERE)
ROOT = os.path.dirname(LIB)
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import plugins as P  # noqa: E402

BAR = "-" * 62

USAGE = """
os plugin list                            what is installed
os plugin info <name>                     the manifest, the files, what it adds
os plugin verify [name]                   full check, non zero exit if any fail
os plugin enable <name>                   turn one on
os plugin disable <name>                  turn one off
os plugin new <name> --capabilities commands,tools
os plugin migrate [name]                  run migrations a plugin ships
os plugin lock <name>                     record a checksum of every file
os plugin doctor                          every plugin, every check, one screen

Capabilities: {caps}
"""


def head(t):
    print("\n" + t)
    print(BAR)


def _yes(b):
    return "yes" if b else "no"


def _caps(plug):
    return ", ".join(plug["capabilities"]) or "none"


def cmd_list(args):
    rows = P.all()
    head("Plugins   {} in {}".format(len(rows), P.plugin_dir()))
    if not rows:
        print("  Nothing installed. `os plugin new <name>` starts one.\n")
        return 0
    print("  {:<22} {:<9} {:<8} {:<6} {}".format(
        "name", "version", "enabled", "valid", "capabilities"))
    for p in rows:
        print("  {:<22} {:<9} {:<8} {:<6} {}".format(
            p["name"][:22], p["version"] or "none", _yes(p["enabled"]),
            _yes(p["valid"]), _caps(p)))
    broken = [p for p in rows if not p["valid"]]
    for p in broken:
        print("\n  {} is not valid:".format(p["name"]))
        for problem in p["problems"]:
            print("    " + problem)
    off = [p for p in rows if not p["enabled"]]
    print("")
    if off:
        print("  Off: {}".format(", ".join(p["name"] for p in off)))
    print("  Only the enabled and valid ones are loaded by the CLI.")
    print("  os plugin info <name>   what one of them adds\n")
    return 0


def cmd_info(args):
    if not args:
        print("os plugin info <name>")
        return 1
    try:
        plug = P.need(args[0])
    except P.PluginError as exc:
        print("\n  {}\n".format(exc))
        return 1
    man = plug["manifest"]
    head("{}   {}".format(plug["name"], plug["version"] or "no version"))
    print("  title        {}".format(plug["title"] or "none"))
    print("  description  {}".format(plug["description"] or "none"))
    print("  author       {}".format(man.get("author") or "not stated"))
    print("  licence      {}".format(man.get("licence") or "not stated"))
    print("  requires     {}".format(json.dumps(man.get("requires") or {})))
    print("  entry        {}".format(plug["entry"]))
    print("  enabled      {}".format(_yes(plug["enabled"])))
    print("  valid        {}".format(_yes(plug["valid"])))
    print("  folder       {}".format(plug["path"]))

    print("\n  capabilities")
    for c in P.CAPABILITIES:
        mark = "declared" if c in plug["capabilities"] else "        "
        print("    {:<10} {:<9} {}".format(c, mark, P.CAPABILITY_NOTES[c]))

    print("\n  files")
    sums = P.read_lock(plug) or {}
    for rel in P.files(plug):
        size = os.path.getsize(os.path.join(plug["path"], rel))
        print("    {:<44} {:>7} bytes{}".format(
            rel, size, "  locked" if rel in sums else ""))

    print("\n  what it adds")
    added = False
    if "commands" in plug["capabilities"]:
        names, problems = P.command_names(plug)
        for n in names:
            print("    command   os {}".format(n))
            added = True
        for problem in problems:
            print("    problem   {}".format(problem))
    if "tools" in plug["capabilities"]:
        try:
            for t in P.tools(plug):
                print("    tool      {}".format(os.path.relpath(t, plug["path"])))
                added = True
        except Exception as exc:
            print("    problem   tools() raised {}".format(exc))
    if "migrations" in plug["capabilities"]:
        done = set(P.applied_migrations())
        for f in P.migration_files(plug):
            state = "applied" if "{}/{}".format(plug["name"], f) in done else "pending"
            print("    migration {:<24} {}".format(f, state))
            added = True
    for capability, folder in P.SHIPPED:
        if capability in ("tools", "migrations"):
            continue
        if capability in plug["capabilities"] and os.path.isdir(os.path.join(plug["path"], folder)):
            print("    {:<9} {}/".format(capability, folder))
            added = True
    owned = [f for f, owner in P.owned_files().items() if owner == plug["name"]]
    for f in sorted(owned):
        print("    owns      data/{}".format(f))
        added = True
    if not added:
        print("    nothing yet")
    print("")
    return 0


def cmd_verify(args):
    targets = []
    if args:
        try:
            targets = [P.need(args[0])]
        except P.PluginError as exc:
            print("\n  {}\n".format(exc))
            return 1
    else:
        targets = P.all()
    if not targets:
        print("\n  No plugins installed. Nothing to verify.\n")
        return 0
    head("Verify   {} plugin{}".format(len(targets), "" if len(targets) == 1 else "s"))
    failed = 0
    for plug in targets:
        problems = P.verify(plug)
        checks = "manifest, version, capabilities, entry, files, checksums"
        if problems:
            failed += 1
            print("  FAIL  {:<24} {} problem{}".format(
                plug["name"], len(problems), "" if len(problems) == 1 else "s"))
            for problem in problems:
                print("        " + problem)
        else:
            print("  ok    {:<24} {}".format(plug["name"], checks))
    print("")
    if failed:
        print("  {} of {} failed. Nothing was changed.\n".format(failed, len(targets)))
        return 1
    print("  All {} verified against their manifests and their locks.\n".format(len(targets)))
    return 0


def _switch(args, on):
    word = "enable" if on else "disable"
    if not args:
        print("os plugin {} <name>".format(word))
        return 1
    try:
        plug = P.need(args[0])
    except P.PluginError as exc:
        print("\n  {}\n".format(exc))
        return 1
    was = plug["enabled"]
    P.set_state(plug["name"], on)
    after = P.need(plug["name"])
    print("\n{}   was {}, now {}".format(
        plug["name"], "on" if was else "off", "on" if after["enabled"] else "off"))
    print("  written to {}".format(os.path.join(P.D.DATA, P.STATE_FILE)))
    if on:
        if not after["valid"]:
            print("  It is on and it is not valid, so the CLI will not load it:")
            for problem in after["problems"]:
                print("    " + problem)
        elif "migrations" in after["capabilities"] and P.pending_migrations(after):
            for f, note, result in P.run_migrations(after):
                print("  migration {:<22} {}".format(f, result or note))
        names = []
        if "commands" in after["capabilities"] and after["valid"]:
            names, problems = P.command_names(after)
            for problem in problems:
                print("  problem: " + problem)
        if names:
            print("  adds: {}".format(", ".join("os " + n for n in names)))
    print("\n  Finish line: run `os plugin list` and read the enabled column.\n")
    return 0


def cmd_enable(args):
    return _switch(args, True)


def cmd_disable(args):
    return _switch(args, False)


def cmd_new(args):
    if not args:
        print("os plugin new <name> --capabilities commands,tools")
        print("Capabilities: {}".format(", ".join(P.CAPABILITIES)))
        return 1
    name = args[0]
    caps = []
    rest = args[1:]
    for i, a in enumerate(rest):
        if a.startswith("--capabilities="):
            caps = a.split("=", 1)[1].split(",")
        elif a == "--capabilities" and i + 1 < len(rest):
            caps = rest[i + 1].split(",")
    try:
        made = P.scaffold(name, caps)
    except P.PluginError as exc:
        print("\n  {}\n".format(exc))
        return 1
    head("Made {}".format(made["path"]))
    for f in made["files"]:
        print("  {}".format(f))
    print("\n  capabilities: {}".format(", ".join(made["capabilities"])))
    print("  It is off. Nothing loads until you turn it on.")
    print("\n  Next:")
    print("    edit {}/plugin.py".format(made["path"]))
    print("    os plugin enable {}".format(name))
    print("    os plugin verify {}".format(name))
    print("\n  Finish line: `os plugin list` shows {} with valid yes.\n".format(name))
    return 0


def cmd_lock(args):
    if not args:
        print("os plugin lock <name>")
        return 1
    try:
        plug = P.need(args[0])
    except P.PluginError as exc:
        print("\n  {}\n".format(exc))
        return 1
    before = P.read_lock(plug)
    sums = P.lock(plug)
    head("Locked {}   {} file{}".format(
        plug["name"], len(sums), "" if len(sums) == 1 else "s"))
    for rel in sorted(sums):
        mark = ""
        if before is not None:
            if rel not in before:
                mark = "  new"
            elif before[rel] != sums[rel]:
                mark = "  changed"
        print("  {}  {}{}".format(sums[rel][:16], rel, mark))
    print("\n  Written to {}".format(P.lock_path(plug)))
    print("  `os plugin verify {}` now fails if any of these files changes.\n".format(
        plug["name"]))
    return 0


def cmd_migrate(args):
    targets = []
    if args:
        try:
            targets = [P.need(args[0])]
        except P.PluginError as exc:
            print("\n  {}\n".format(exc))
            return 1
    else:
        targets = P.enabled()
    dry = "--dry" in args
    head("Plugin migrations")
    ran = 0
    for plug in targets:
        if "migrations" not in plug["capabilities"]:
            if args:
                print("  {} does not declare the 'migrations' capability.".format(plug["name"]))
            continue
        todo = P.pending_migrations(plug)
        if not todo:
            print("  {:<24} up to date, {} applied".format(
                plug["name"], len(P.migration_files(plug))))
            continue
        for f, note, result in P.run_migrations(plug, dry=dry):
            ran += 1
            print("  {:<24} {:<22} {}".format(plug["name"], f, result or note))
    if not ran:
        print("\n  Nothing to run. Data folder: {}\n".format(P.D.DATA))
        return 0
    print("\n  {} migration{} ran against {}.".format(
        ran, "" if ran == 1 else "s", P.D.DATA))
    print("  Finish line: the files listed above exist in that folder.\n")
    return 0


def cmd_doctor(args):
    rows = P.all()
    head("Plugin doctor   {} installed   {}".format(len(rows), P.plugin_dir()))
    if not rows:
        print("  Nothing installed.\n")
        return 0
    import registry as REG
    core = REG.discover(with_plugins=False)
    failed = 0
    for plug in rows:
        problems = P.verify(plug)
        extras = []
        if plug["valid"]:
            if "commands" in plug["capabilities"]:
                names, found = P.command_names(plug)
                extras.append("commands: " + (", ".join("os " + n for n in names) or "none"))
                clash = [n for n in names if core.get(n)]
                if clash:
                    problems.append("takes a command core already provides: " + ", ".join(clash))
                for problem in found:
                    if problem not in problems:
                        problems.append(problem)
            if "tools" in plug["capabilities"]:
                try:
                    extras.append("tools: {}".format(len(P.tools(plug))))
                except Exception as exc:
                    problems.append("tools() raised {}".format(exc))
            if "migrations" in plug["capabilities"]:
                extras.append("migrations pending: {}".format(len(P.pending_migrations(plug))))
        if P.read_lock(plug) is None:
            extras.append("not locked")
        bits = ["{:<22}".format(plug["name"][:22]),
                "{:<8}".format(plug["version"] or "none"),
                "on " if plug["enabled"] else "off",
                "{:<28}".format(_caps(plug)[:28])]
        if problems:
            failed += 1
            print("  FAIL  " + " ".join(bits))
            for problem in problems:
                print("        " + problem)
        else:
            print("  ok    " + " ".join(bits))
            if extras:
                print("        " + "   ".join(extras))
    print("")
    print("  data folder   {}".format(P.D.DATA))
    print("  state file    {}".format(
        os.path.join(P.D.DATA, P.STATE_FILE) if os.path.exists(
            os.path.join(P.D.DATA, P.STATE_FILE)) else "none yet, manifests decide"))
    owned = P.owned_files()
    if owned:
        print("  plugin files  {}".format(", ".join(
            "{} ({})".format(f, owner) for f, owner in sorted(owned.items()))))
    print("")
    if failed:
        print("  {} of {} failed. Fix them or disable them.\n".format(failed, len(rows)))
        return 1
    print("  Every installed plugin passed every check.\n")
    return 0


SUB = {
    "list": cmd_list,
    "info": cmd_info,
    "verify": cmd_verify,
    "enable": cmd_enable,
    "disable": cmd_disable,
    "new": cmd_new,
    "lock": cmd_lock,
    "migrate": cmd_migrate,
    "doctor": cmd_doctor,
}


def cmd_plugin(args):
    if not args or args[0] in ("-h", "--help", "help"):
        print(USAGE.format(caps=", ".join(P.CAPABILITIES)))
        return 0 if args else 1
    sub = args[0]
    fn = SUB.get(sub)
    if fn is None:
        near = [s for s in sorted(SUB) if s[0] == sub[:1]]
        print("\n  No plugin subcommand '{}'.".format(sub))
        if near:
            print("  Did you mean: {}".format(", ".join(near)))
        print(USAGE.format(caps=", ".join(P.CAPABILITIES)))
        return 1
    return fn(args[1:])


def register(reg):
    reg.add("plugin", cmd_plugin, group="platform",
            summary="list, verify, enable and scaffold plugins",
            group_blurb="extending the system")
