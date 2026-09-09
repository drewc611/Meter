"""
Autonomy commands: the routing table, the ticks, the run log, and the
reconciliation that catches the wrong tier doing the work.

Every command here plans, records or reports. None of them runs a tool.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.dirname(HERE)
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402
import agentops as A  # noqa: E402

BAR = "-" * 62


def head(t):
    print("\n" + t)
    print(BAR)


def _fail(exc):
    print("\n" + str(exc) + "\n")
    return 1


def _flag_value(args, flag):
    """Read --flag value or --flag=value. Returns None when absent."""
    for i, a in enumerate(args):
        if a == flag and i + 1 < len(args):
            return args[i + 1]
        if a.startswith(flag + "="):
            return a.split("=", 1)[1]
    return None


# ---------------------------------------------------------------- ticks

def cmd_ticks(args):
    try:
        ts = A.ticks()
    except A.AgentsError as exc:
        return _fail(exc)
    if not ts:
        print("\nNo ticks in {}. A tick is one yml file.\n".format(A.ticks_dir()))
        return 1
    head("Ticks")
    print("  {:<13} {:<38} {:>5}  {}".format("name", "when", "steps", "last outcome"))
    for t in ts:
        last = A.last_outcome(t["name"]) or "never run"
        print("  {:<13} {:<38} {:>5}  {}".format(
            t["name"], t["when"][:38], len(t["steps"]), last))
    print("\n  os tick <name>   shows the plan. It prints the plan, it does not run it.\n")
    return 0


def cmd_tick(args):
    if not args:
        print("os tick <name>                                  print the resolved plan")
        print("os tick <name> --record                         record a run where nothing ran")
        print("os tick <name> --record --step id=tier,id=tier  record what actually ran")
        return 1
    name = args[0]
    try:
        p = A.plan(name)
    except A.Refused as exc:
        return _fail(exc)
    except A.AgentsError as exc:
        return _fail(exc)

    head("{}   {}".format(p["tick"], p["when"]))
    if p["goal"]:
        print("  goal    {}".format(p["goal"]))
    for g in p["guardrails"]:
        print("  guard   {}".format(g))
    print("")
    print("  {:<14} {:<20} {:<8} {}".format("step", "task class", "tier", "calls"))
    for s in p["steps"]:
        calls = s["run"] or (s["tool"] + " tool" if s["tool"] else "judgment only")
        print("  {:<14} {:<20} {:<8} {}".format(
            s["id"], s["task_class"], s["assigned"], calls))
        print("               finish line: {}".format(s["finish_line"] or "not stated"))
    print("")
    print("  This command plans and reports. It does not execute any of the above.")
    print("  A person or an agent runs the steps, then records what happened with")
    print("  os tick {} --record --step <id>=<tier>".format(p["tick"]))

    if "--record" not in args:
        print("")
        return 0

    raw = _flag_value(args, "--step") or ""
    results = []
    for part in [x for x in raw.split(",") if x.strip()]:
        if "=" not in part:
            print("\n  --step wants id=tier pairs, got '{}'.\n".format(part))
            return 1
        sid, tier = part.split("=", 1)
        results.append({"id": sid.strip(), "actual": tier.strip(), "ok": True, "note": ""})
    known = {s["id"] for s in p["steps"]}
    for r in results:
        if r["id"] not in known:
            print("\n  {} has no step called '{}'. Steps are: {}\n".format(
                p["tick"], r["id"], ", ".join(sorted(known))))
            return 1
    try:
        run = A.finish_run(A.start_run(name), results)
    except A.AgentsError as exc:
        return _fail(exc)
    head("Recorded {}".format(run["run"]))
    for s in run["steps"]:
        flag = "ok" if s["actual"] and s["ok"] else "  "
        mis = ""
        if s["actual"] and s["actual"] != s["assigned"]:
            mis = "   assigned {}".format(s["assigned"])
        print("  {} {:<14} {:<8}{}{}".format(
            flag, s["id"], s["actual"] or "not run", mis,
            "   " + s["note"] if s["note"] else ""))
    print("\n  outcome {}".format(run["outcome"]))
    print("  Written to {}".format(A.runs_path()))
    print("  Check the routing against it with:  os reconcile\n")
    return 0


# ---------------------------------------------------------------- runs

def cmd_runs(args):
    n = int(args[0]) if args and args[0].isdigit() else 12
    rows = A.runs(limit=n)
    if not rows:
        print("\nNo runs recorded yet. Record one with os tick <name> --record.\n")
        return 0
    head("Last {} run{}".format(len(rows), "" if len(rows) == 1 else "s"))
    print("  {:<30} {:<17} {:<9} {}".format("run", "finished", "outcome", "steps"))
    for r in rows:
        steps = r.get("steps", [])
        ran = sum(1 for s in steps if s.get("actual"))
        print("  {:<30} {:<17} {:<9} {} of {} ran".format(
            r.get("run", "")[:30], (r.get("finished") or "")[:16].replace("T", " "),
            r.get("outcome", ""), ran, len(steps)))
    print("")
    return 0


# ---------------------------------------------------------------- reconcile

def cmd_reconcile(args):
    days = int(args[0]) if args and args[0].isdigit() else 30
    try:
        rep = A.reconcile(days)
    except A.AgentsError as exc:
        return _fail(exc)
    head("Reconcile   {} to {}".format(rep["from"], rep["to"]))
    print("  {} run(s), {} step(s) that actually ran".format(
        rep["runs_seen"], rep["steps_seen"]))

    print("\n  RISK   {}   a cheaper tier ran work the table assigns higher".format(
        len(rep["risk"])))
    if not rep["risk"]:
        print("    none")
    for f in rep["risk"]:
        print("    {:<26} {:<14} {:<20} assigned {:<8} ran on {}".format(
            f["run"][:26], f["step"], f["task_class"], f["assigned"], f["actual"]))
        print("      {}".format(f["note"]))

    print("\n  WASTE  {}   a dearer tier ran work a cheaper one was assigned".format(
        len(rep["waste"])))
    if not rep["waste"]:
        print("    none")
    for f in rep["waste"]:
        print("    {:<26} {:<14} {:<20} assigned {:<8} ran on {}".format(
            f["run"][:26], f["step"], f["task_class"], f["assigned"], f["actual"]))
        print("      {}".format(f["note"]))

    if rep["unmapped"]:
        print("\n  UNMAPPED  {}   ran, then the task class left the table".format(
            len(rep["unmapped"])))
        for f in rep["unmapped"]:
            print("    {:<26} {:<14} {}".format(f["run"][:26], f["step"], f["task_class"]))

    print("\n  Two numbers, never one. Risk is a customer problem. Waste is only a")
    print("  bill. Fix every risk before you touch a single waste.\n")
    return 1 if rep["risk"] else 0


# ---------------------------------------------------------------- routing

def cmd_routing(args):
    try:
        r = A.routing()
        missing = A.unmapped_classes()
    except A.AgentsError as exc:
        return _fail(exc)
    head("Routing table   {}".format(r["path"]))
    for tier in list(A.TIERS) + [A.NEVER]:
        classes = sorted(c for c, t in r["routes"].items() if t == tier)
        desc = r["tiers"].get(tier, "")
        print("\n  {}{}".format(tier, "   " + desc if desc else ""))
        for c in classes:
            print("    {}".format(c))
        if not classes:
            print("    nothing routed here")
    if missing:
        print("\n  Used by a tick and missing from the table")
        for cls, where in sorted(missing.items()):
            print("    {:<24} {}".format(cls, ", ".join(where)))
        print("\n  Those steps cannot be planned until the table names a tier for them.")
    else:
        print("\n  Every task class a tick uses is in the table.")
    print("  A class routed to never is refused, not downgraded.\n")
    return 1 if missing else 0


# ---------------------------------------------------------------- work

def _print_work(rows):
    print("  {:<7} {:<34} {:<8} {:<8} {:<11} {}".format(
        "id", "title", "kind", "status", "opened", "blocked by"))
    for r in rows:
        print("  {:<7} {:<34} {:<8} {:<8} {:<11} {}".format(
            r["id"], r["title"][:34], r["kind"], r["status"], r["opened"],
            r["blocked_by"]))


def cmd_work(args):
    sub = args[0] if args else "list"

    if sub == "add":
        rest = args[1:]
        fields = {}
        title_parts = []
        for a in rest:
            if "=" in a and a.split("=", 1)[0] in A.WORK_COLS:
                k, v = a.split("=", 1)
                fields[k] = v
            else:
                title_parts.append(a)
        title = " ".join(title_parts).strip()
        if not title:
            print("os work add \"<title>\" kind=money   kinds: {}".format(
                ", ".join(A.WORK_KINDS)))
            return 1
        try:
            row = A.add_work(title, kind=fields.get("kind", "work"),
                             owner=fields.get("owner", ""),
                             tick_name=fields.get("tick", ""),
                             blocked_by=fields.get("blocked_by", ""),
                             notes=fields.get("notes", ""),
                             status=fields.get("status", "open"))
        except A.AgentsError as exc:
            return _fail(exc)
        head("Added {}".format(row["id"]))
        _print_work([row])
        print("\n  Close it with:  os work close {}\n".format(row["id"]))
        return 0

    if sub in ("close", "done", "drop"):
        if len(args) < 2:
            print("os work close <id> [status]   statuses: {}".format(
                ", ".join(A.WORK_STATUS)))
            return 1
        status = args[2] if len(args) > 2 else ("dropped" if sub == "drop" else "done")
        try:
            row = A.close_work(args[1], status=status)
        except A.AgentsError as exc:
            return _fail(exc)
        if row is None:
            print("\n  No work row called '{}'.\n".format(args[1]))
            return 1
        head("{} is now {}".format(row["id"], row["status"]))
        _print_work([row])
        print("")
        return 0

    rows = A.work_registry()
    if not rows:
        print("\nThe work registry is empty. Add one with:")
        print("  os work add \"Chase Okonkwo\" kind=money\n")
        return 0
    live = [r for r in rows if r["status"] in ("open", "doing", "blocked")]
    closed = [r for r in rows if r["status"] in ("done", "dropped")]
    head("Work registry   {} live, {} closed".format(len(live), len(closed)))
    if live:
        _print_work(live)
    else:
        print("  Nothing live.")
    if closed:
        print("\n  closed")
        _print_work(closed[-8:])
    print("")
    return 0


def register(reg):
    blurb = "running itself, with the receipts"
    reg.add("ticks", cmd_ticks, group="autonomy",
            summary="every scheduled run, when it fires, how it went last time",
            group_blurb=blurb)
    reg.add("tick", cmd_tick, group="autonomy",
            summary="the plan for one tick, and --record to log what ran",
            group_blurb=blurb)
    reg.add("runs", cmd_runs, group="autonomy",
            summary="recent tick runs and their outcomes", group_blurb=blurb)
    reg.add("reconcile", cmd_reconcile, group="autonomy",
            summary="steps that ran on the wrong tier, risk before waste",
            group_blurb=blurb)
    reg.add("routing", cmd_routing, group="autonomy",
            summary="which tier owns which task class", group_blurb=blurb)
    reg.add("work", cmd_work, group="autonomy",
            summary="the work registry: list, add, close", group_blurb=blurb)
