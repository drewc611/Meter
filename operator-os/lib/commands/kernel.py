"""Kernel commands: the log, undo, time travel, drift, and migrations."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.dirname(HERE)
ROOT = os.path.dirname(LIB)
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402
import events as E  # noqa: E402
import migrate as M  # noqa: E402

BAR = "-" * 62


def head(t):
    print("\n" + t)
    print(BAR)


def cmd_log(args):
    limit = 20
    entity = None
    for a in args:
        if a.isdigit():
            limit = int(a)
        elif a in D.SCHEMA:
            entity = a
    rows = E.read(limit=limit, entity=entity)
    if not rows:
        print("\nNothing in the log yet. It fills as you change things.\n")
        return 0
    head("Last {} change{}{}".format(len(rows), "" if len(rows) == 1 else "s",
                                     " to " + entity if entity else ""))
    for e in rows:
        what = ""
        if e["op"] == "set" and e.get("before") and e.get("after"):
            diffs = [c for c in D.SCHEMA.get(e["entity"], {}).get("cols", [])
                     if (e["before"].get(c) or "") != (e["after"].get(c) or "")]
            what = ", ".join("{}: {} to {}".format(
                c, e["before"].get(c) or "blank", e["after"].get(c) or "blank")
                for c in diffs[:3])
        elif e["op"] == "add" and e.get("after"):
            label = e["after"].get("name") or e["after"].get("title") or \
                e["after"].get("number") or e["after"].get("label") or ""
            what = label
        elif e["op"] == "delete":
            what = "removed"
        print("  {:>4}  {}  {:<9} {:<9} {:<8} {}".format(
            e["seq"], e["ts"][:16].replace("T", " "), e["op"], e["entity"],
            e["id"], what[:44]))
        if e.get("cause"):
            print("        {}".format(e["cause"]))
    print("")
    return 0


def cmd_undo(args):
    n = int(args[0]) if args and args[0].isdigit() else 1
    events = E.read(limit=n)
    if not events:
        print("Nothing to undo.")
        return 1
    head("About to reverse {} change{}".format(n, "" if n == 1 else "s"))
    for e in events:
        print("  {} {} {} {}".format(e["seq"], e["op"], e["entity"], e["id"]))
    if "--yes" not in args:
        try:
            if input("\n  Type yes to undo: ").strip().lower() != "yes":
                print("  Nothing changed.")
                return 1
        except EOFError:
            print("  Nothing changed. Pass --yes to skip the question.")
            return 1
    for line in E.undo(n):
        print("  " + line)
    print("")
    return 0


def cmd_asof(args):
    if not args:
        print("os asof <date>            write the business as it was, into data.asof-<date>/")
        print("os asof <date> --replace  restore it over your live data, backing up first")
        return 1
    when = args[0]
    target = os.path.join(ROOT, "data.asof-" + when)
    counts = E.materialise(target, upto_date=when)
    head("The business as of {}".format(when))
    for k, v in sorted(counts.items()):
        print("  {:<12} {}".format(k, v))
    print("\n  Written to {}".format(target))
    print("  Point the tools at it with:  OPERATOR_OS_DATA={} os brief".format(target))
    if "--replace" in args:
        import shutil
        backup = D.DATA + ".before-asof"
        shutil.rmtree(backup, ignore_errors=True)
        shutil.copytree(D.DATA, backup)
        for f in os.listdir(target):
            shutil.copy2(os.path.join(target, f), os.path.join(D.DATA, f))
        print("  Live data replaced. Previous state is in {}".format(backup))
    print("")
    return 0


def cmd_drift(args):
    report = E.drift()
    problems = E.verify_chain()
    if problems:
        head("The log itself has a problem")
        for p in problems:
            print("  " + p)
    if not report:
        print("\nEvery row on disk matches the log. Nothing was edited by hand.\n")
        return 0
    head("Edited outside the tools")
    for name, r in sorted(report.items()):
        if r["added"]:
            print("  {}: {} row(s) added by hand: {}".format(
                name, len(r["added"]), ", ".join(r["added"][:8])))
        if r["removed"]:
            print("  {}: {} row(s) deleted by hand: {}".format(
                name, len(r["removed"]), ", ".join(r["removed"][:8])))
        for rid, cols in r["changed"][:12]:
            print("  {}: {} changed by hand ({})".format(name, rid, ", ".join(cols)))
    print("\n  Editing files by hand is allowed. This is only how you find out later.")
    print("  Run `os adopt` to write these into the log so the two agree again.\n")
    return 0


def cmd_adopt(args):
    n = E.adopt()
    print("Wrote {} hand edit{} into the log.".format(n, "" if n == 1 else "s")
          if n else "Nothing to adopt. The log already matches the files.")
    return 0


def cmd_rebuild(args):
    """Prove the log is complete by rebuilding the CSVs from it alone."""
    target = os.path.join(ROOT, "data.rebuilt")
    counts = E.materialise(target)
    head("Rebuilt from the log alone")
    for k, v in sorted(counts.items()):
        print("  {:<12} {}".format(k, v))
    d = E.drift()
    print("\n  " + ("Matches your live data exactly." if not d else
                    "Differs from live data in: " + ", ".join(sorted(d))))
    print("  Written to {}\n".format(target))
    return 0


def cmd_migrate(args):
    if "--list" in args:
        head("Migrations")
        done = set(M.applied())
        for f in M.available():
            print("  {}  {}".format("applied" if f in done else "pending", f))
        print("")
        return 0
    dry = "--dry" in args
    todo = M.pending()
    if not todo:
        print("Up to date. Schema version {}.".format(M.schema_version()))
        return 0
    head("{} migration{} to run".format(len(todo), "" if len(todo) == 1 else "s"))
    for f, note, result in M.run(dry=dry):
        print("  {:<22} {:<34} {}".format(f, note, result))
    if not dry:
        print("\n  Your data was copied to {} first.".format(D.DATA + ".before-migrate"))
        print("  Schema version {}.\n".format(M.schema_version()))
    return 0


def register(reg):
    blurb = "history, undo and upgrades"
    reg.add("log", cmd_log, group="kernel", summary="every change, newest last", group_blurb=blurb)
    reg.add("undo", cmd_undo, group="kernel", summary="reverse the last change", group_blurb=blurb)
    reg.add("asof", cmd_asof, group="kernel", summary="the business as it was on a date", group_blurb=blurb)
    reg.add("drift", cmd_drift, group="kernel", summary="what was edited outside the tools", group_blurb=blurb)
    reg.add("adopt", cmd_adopt, group="kernel", summary="accept hand edits into the log", group_blurb=blurb)
    reg.add("rebuild", cmd_rebuild, group="kernel", summary="rebuild everything from the log", group_blurb=blurb)
    reg.add("migrate", cmd_migrate, group="kernel", summary="apply schema upgrades", group_blurb=blurb)
