"""Import commands: read an outside file, look at what it proposes, then decide."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.dirname(HERE)
ROOT = os.path.dirname(LIB)
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402
import adapters as A  # noqa: E402

BAR = "-" * 62


def head(t):
    print("\n" + t)
    print(BAR)


def _ledger_ready():
    if os.path.exists(A.ledger_path()):
        return True
    print("There is no import ledger yet, so nothing could be kept honest.")
    print("Run `os migrate` first, then try again.")
    return False


def _amount_text(p, s):
    raw = A._amount_of(p)
    return D.money(D.cents(raw), s) if raw else ""


def _label(p):
    row = p.get("row") or {}
    return (row.get("vendor") or row.get("name") or row.get("notes")
            or row.get("number") or p.get("match_id") or "")


# ---------------------------------------------------------------- pull

USAGE = """
os pull <adapter> <file>            show what the file would add, write nothing
os pull <adapter> <file> --apply    write it, and record every row in the ledger
os pull --sniff <file>              ask every adapter whether the file is theirs

  os adapters                       what is installed and what each one needs
  os imports                        what has been imported already
"""


def cmd_pull(args):
    if not args or args[0] in ("-h", "--help"):
        print(USAGE)
        return 1

    if args[0] == "--sniff":
        if len(args) < 2:
            print("os pull --sniff <file>")
            return 1
        return _sniff(args[1])

    if len(args) < 2 or args[1].startswith("--"):
        print(USAGE)
        return 1

    name, path = args[0], args[1]
    apply_it = "--apply" in args[2:]
    if not _ledger_ready():
        return 1

    try:
        proposals = A.pull(name, path)
    except A.AdapterError as exc:
        print("\n  " + str(exc) + "\n")
        return 1

    s = D.sym()
    if not proposals:
        print("\n  {} read {} and found nothing it could propose.\n".format(name, path))
        return 0

    if not apply_it:
        return _show(name, path, proposals, s)
    return _apply(name, path, proposals, s)


def _sniff(path):
    try:
        scored = A.sniff_all(path)
    except A.AdapterError as exc:
        print("\n  " + str(exc) + "\n")
        return 1
    head("Which adapter wants {}".format(os.path.basename(path)))
    for name, score, title in scored:
        bar = "#" * int(round(score * 20))
        print("  {:<16} {:>4.0f}%  {:<20} {}".format(name, score * 100, bar, title))
    best = scored[0] if scored else None
    print("")
    if not best or best[1] < 0.5:
        print("  No adapter is confident about this file. Check the export, or")
        print("  write an adapter for it. See manual/09_ADAPTERS.md.\n")
        return 1
    print("  Best fit is {} at {:.0f}%.".format(best[0], best[1] * 100))
    print("  Finish line: run `os pull {} {}` and read the proposals.\n".format(
        best[0], path))
    return 0


def _show(name, path, proposals, s):
    head("{} read {}".format(name, path))
    print("  {:<9} {:<9} {:>12} {:>5}  {}".format(
        "action", "entity", "amount", "sure", "why"))
    counts = {"create": 0, "match": 0, "ignore": 0}
    already = 0
    for p in proposals:
        counts[p["action"]] += 1
        seen = A.already_imported(p["external_id"], name)
        if seen:
            already += 1
        print("  {:<9} {:<9} {:>12} {:>4.0f}%  {}".format(
            "in ledger" if seen else p["action"],
            p["entity"], _amount_text(p, s), p["confidence"] * 100,
            p["why"][:56]))
    print("")
    print("  {} proposals: {} to create, {} to match, {} set aside.".format(
        len(proposals), counts["create"], counts["match"], counts["ignore"]))
    if already:
        print("  {} of them are already in the ledger and would be skipped.".format(already))
    print("  Nothing was written. Data is still {} rows across {} registries.".format(
        sum(len(D.load(n)) for n in D.SCHEMA), len(D.SCHEMA)))
    print("  Finish line: run the same command with --apply when you agree with it.\n")
    return 0


def _apply(name, path, proposals, s):
    result = A.apply(name, proposals)
    head("Imported from {} out of {}".format(name, path))
    for p, row in result["created"]:
        print("  created   {:<9} {:<7} {:>12}  {}".format(
            p["entity"], row["id"], _amount_text(p, s), _label(p)[:28]))
    for p in result["matched"]:
        print("  matched   {:<9} {:<7} {:>12}  {}".format(
            p["entity"], p["match_id"], _amount_text(p, s), p["why"][:28]))
    for p, prior in result["skipped"]:
        print("  skipped   {:<9} {:<7} {:>12}  already imported on {}".format(
            p["entity"], (prior or {}).get("row_id", ""), _amount_text(p, s),
            (prior or {}).get("imported_on", "an earlier run")))
    for p in result["set_aside"]:
        print("  set aside {:<9} {:<7} {:>12}  {}".format(
            p["entity"], "", _amount_text(p, s), p["why"][:28]))

    print("")
    print("  {} row(s) created, {} matched, {} skipped as already imported, {} set aside.".format(
        len(result["created"]), len(result["matched"]),
        len(result["skipped"]), len(result["set_aside"])))
    if result["created"]:
        print("  Every created row is in the event log with cause \"{}\".".format(
            result["cause"]))
    if result["matched"]:
        print("\n  Matches were recorded, not applied. You decide whether they are paid:")
        for p in result["matched"]:
            if p["entity"] == "invoices":
                print("    os set invoices {} status=paid paid_on={} method=transfer".format(
                    p["match_id"], D.iso(D.today())))
    print("\n  Finish line: run `os imports`, then `os validate`, then `os drift`.")
    print("  Run this same command again. It should import nothing.\n")
    return 0


# ---------------------------------------------------------------- adapters

def cmd_adapters(args):
    recs = A.discover()
    if not recs:
        print("\n  No adapters installed. They live in adapters/<name>/adapter.py.\n")
        return 1
    head("Adapters")
    for rec in recs:
        flag = ""
        if rec["error"]:
            flag = "   BROKEN: " + rec["error"]
        elif rec["network"]:
            flag = "   wants the network" + (
                "" if A.network_allowed() else ", refused until OPERATOR_OS_ALLOW_NETWORK is set")
        print("  {:<16} {}{}".format(rec["name"], rec["title"], flag))
        print("      reads    {}".format(", ".join(rec["reads"]) or "nothing"))
        if rec["writes"]:
            print("      writes   {}".format(", ".join(rec["writes"])))
        print("      needs    {}".format(rec["needs"] or "not stated"))
    print("\n  No adapter here touches the network. One that declares it will not run")
    print("  unless you set OPERATOR_OS_ALLOW_NETWORK yourself.")
    print("  Sample files to try: adapters/samples/")
    print("  Finish line: run `os pull --sniff adapters/samples/<file>`.\n")
    return 0


# ---------------------------------------------------------------- imports

def cmd_imports(args):
    if not _ledger_ready():
        return 1
    if "--forget" in args:
        i = args.index("--forget")
        if i + 1 >= len(args):
            print("os imports --forget <external_id>")
            return 1
        ext = args[i + 1]
        changed = A.forget(ext)
        if not changed:
            print("\n  Nothing in the ledger has external_id {}.".format(ext))
            print("  Run `os imports` to see the ids as they are stored.\n")
            return 1
        print("\n  Marked {} ledger line(s) ignored: {}".format(len(changed), ext))
        print("  The row it created, if any, is still there. This only clears the way")
        print("  for the same record to be imported again.")
        print("  Finish line: run `os imports` and check the status column reads ignored.\n")
        return 0

    rows = A.imports_ledger()
    if not rows:
        print("\n  Nothing imported yet. Try `os adapters`.\n")
        return 0
    s = D.sym()
    limit = 40
    for a in args:
        if a.isdigit():
            limit = int(a)
    shown = list(reversed(rows))[:limit]
    head("Import ledger, newest first")
    print("  {:<7} {:<12} {:<11} {:<9} {:>12} {:<8} {}".format(
        "id", "adapter", "on", "row", "amount", "status", "external id"))
    for r in shown:
        print("  {:<7} {:<12} {:<11} {:<9} {:>12} {:<8} {}".format(
            r["id"], r["adapter"][:12], r["imported_on"], r["row_id"] or "-",
            D.money(D.cents(r["amount"]), s) if r["amount"] else "",
            r["status"], r["external_id"][:30]))
    pending = [r for r in rows if r["status"] == "pending"]
    print("\n  {} of {} shown.".format(len(shown), len(rows)))
    if pending:
        print("  {} still waiting on you: a match was recorded, the row was not changed.".format(
            len(pending)))
        for r in pending[:6]:
            print("    {} {} {}".format(r["entity"], r["row_id"], r["summary"][:44]))
    print("  An external id in this list is never imported again.")
    print("  `os imports --forget <external_id>` clears one so it can be redone.\n")
    return 0


def register(reg):
    blurb = "bringing outside data in"
    reg.add("pull", cmd_pull, group="import",
            summary="read an outside file and show what it proposes",
            group_blurb=blurb)
    reg.add("adapters", cmd_adapters, group="import",
            summary="what can be imported and what each adapter needs",
            group_blurb=blurb)
    reg.add("imports", cmd_imports, group="import",
            summary="the import ledger, and how to redo one",
            group_blurb=blurb)
