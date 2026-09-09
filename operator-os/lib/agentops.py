"""
Operator OS agent layer.

Three tiers of model do the work. A probe collects facts and runs commands. An
analyst does bounded analysis against a stated rubric. A judge decides anything
hard to reverse, anything that costs money, and anything that goes out under the
operator's name. agents/routing.yml says which task class goes to which tier,
and it is written down in a file so the choice is auditable instead of being
made in the moment by whoever is holding the keyboard.

This module reads that table, resolves a tick into a plan, records what actually
ran, and compares the two. It plans, records and reports. It never executes a
tool, never sends, never spends.

No yaml dependency. The parser below covers the small subset these files use:
key and value, nested blocks, lists of scalars, lists of maps, and comments.
"""

import csv
import json
import os
import re
import sys
import time
from datetime import timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import osdata as D  # noqa: E402
import events as E  # noqa: E402

ROOT = D.ROOT

# Tier names, cheapest first. "never" is not a tier a run can happen on, it is
# the refusal, and it sits outside the ranking on purpose.
TIERS = ("probe", "analyst", "judge")
RANK = {"probe": 1, "analyst": 2, "judge": 3}
NEVER = "never"

RUNS = "runs.jsonl"
WORK = "work.csv"
WORK_COLS = ["id", "title", "kind", "status", "opened", "closed", "owner",
             "tick", "blocked_by", "notes"]
WORK_STATUS = ["open", "doing", "blocked", "done", "dropped"]
WORK_KINDS = ["money", "work", "demand", "control"]


class AgentsError(Exception):
    """Something in the agent layer is wrong and the run must stop."""


class RoutingError(AgentsError):
    """A task class has no tier, or a tier name is not one we know."""


class Refused(AgentsError):
    """The routing table says never. This is a wall, not a preference."""


# ---------------------------------------------------------------- paths

def agents_dir():
    return os.environ.get("OPERATOR_OS_AGENTS", os.path.join(ROOT, "agents"))


def routing_path():
    return os.path.join(agents_dir(), "routing.yml")


def ticks_dir():
    return os.path.join(agents_dir(), "ticks")


def roster_dir():
    return os.path.join(agents_dir(), "roster")


def runs_path():
    return os.path.join(D.DATA, RUNS)


def work_path():
    return os.path.join(D.DATA, WORK)


# ---------------------------------------------------------------- yaml subset

def _strip_comment(line):
    out = []
    quote = None
    for i, ch in enumerate(line):
        if quote:
            out.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
            out.append(ch)
            continue
        if ch == "#" and (i == 0 or line[i - 1] in " \t"):
            break
        out.append(ch)
    return "".join(out)


def _scalar(text):
    s = text.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        s = s[1:-1]
    return s


def _is_pair(text):
    """True when the text looks like key: value or key: with nothing after it."""
    if ":" not in text:
        return False
    key = text.split(":", 1)[0]
    return bool(key.strip()) and "\"" not in key and "'" not in key


def _lines(text):
    out = []
    for raw in text.splitlines():
        line = _strip_comment(raw.replace("\t", "    "))
        if not line.strip() or line.strip() == "---":
            continue
        out.append((len(line) - len(line.lstrip(" ")), line.strip()))
    return out


def _parse_block(lines, i, indent):
    if i >= len(lines):
        return {}, i
    if lines[i][1].startswith("- "):
        return _parse_list(lines, i, indent)
    return _parse_map(lines, i, indent)


def _parse_list(lines, i, indent):
    out = []
    while i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("- "):
        content = lines[i][1][2:].strip()
        j = i + 1
        child = []
        while j < len(lines) and lines[j][0] > indent:
            child.append(lines[j])
            j += 1
        if _is_pair(content):
            base = min(c[0] for c in child) if child else indent + 2
            sub = [(base, content)] + child
            value, _ = _parse_map(sub, 0, base)
            out.append(value)
        else:
            out.append(_scalar(content))
        i = j
    return out, i


def _parse_map(lines, i, indent):
    out = {}
    while i < len(lines) and lines[i][0] == indent:
        line = lines[i][1]
        if line.startswith("- "):
            break
        key, _sep, rest = line.partition(":")
        key = key.strip()
        rest = rest.strip()
        if rest:
            out[key] = _scalar(rest)
            i += 1
            continue
        j = i + 1
        child = []
        while j < len(lines) and lines[j][0] > indent:
            child.append(lines[j])
            j += 1
        if child:
            base = min(c[0] for c in child)
            value, _ = _parse_block(child, 0, base)
            out[key] = value
            i = j
            continue
        # A list written flush with its key, which yaml allows.
        if j < len(lines) and lines[j][0] == indent and lines[j][1].startswith("- "):
            value, i = _parse_list(lines, j, indent)
            out[key] = value
            continue
        out[key] = ""
        i = j
    return out, i


def parse_yaml(text):
    """Parse the subset of yaml these files use. Every leaf is a string."""
    lines = _lines(text)
    if not lines:
        return {}
    base = lines[0][0]
    value, _ = _parse_block(lines, 0, base)
    return value


def _read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


# ---------------------------------------------------------------- routing

def routing():
    """The routing table.

    Returns {"routes": {task_class: tier}, "tiers": {tier: description},
             "path": <file>}. A flat file of task_class: tier is valid. A
    "tiers:" block and a "routes:" block are both optional.
    """
    path = routing_path()
    if not os.path.exists(path):
        raise RoutingError(
            "no routing table at {}. Nothing can run until the table exists.".format(path))
    raw = parse_yaml(_read(path))
    if not isinstance(raw, dict):
        raise RoutingError("{} does not parse as a table of task classes".format(path))
    tiers = raw.get("tiers") if isinstance(raw.get("tiers"), dict) else {}
    routes = {}
    source = raw.get("routes") if isinstance(raw.get("routes"), dict) else raw
    for k, v in source.items():
        if k in ("tiers", "routes"):
            continue
        if not isinstance(v, str):
            continue
        routes[k.strip()] = v.strip()
    if not routes:
        raise RoutingError("{} maps no task classes at all".format(path))
    if NEVER not in routes.values() and NEVER not in tiers:
        raise RoutingError(
            "{} has no 'never' tier. The table must name the work no agent may "
            "do at all.".format(path))
    for cls, tier in sorted(routes.items()):
        if tier not in TIERS and tier != NEVER:
            raise RoutingError(
                "{}: task class '{}' is routed to '{}', which is not a tier. "
                "Use one of {} or {}.".format(
                    path, cls, tier, ", ".join(TIERS), NEVER))
    return {"routes": routes, "tiers": tiers, "path": path}


def tier_for(task_class, table=None):
    """The tier a task class runs on. Unmapped is an error, never a guess."""
    routes = (table or routing())["routes"]
    cls = (task_class or "").strip()
    if not cls:
        raise RoutingError("a step has no task_class, so no tier can be chosen")
    if cls not in routes:
        raise RoutingError(
            "task class '{}' is not in {}. Add it to the table and say which "
            "tier owns it. Known classes: {}".format(
                cls, routing_path(), ", ".join(sorted(routes))))
    return routes[cls]


# ---------------------------------------------------------------- ticks

def _tick_files():
    d = ticks_dir()
    if not os.path.isdir(d):
        return []
    return [os.path.join(d, f) for f in sorted(os.listdir(d))
            if f.endswith(".yml") or f.endswith(".yaml")]


def ticks():
    """Every tick file, parsed, sorted by name."""
    out = []
    for path in _tick_files():
        raw = parse_yaml(_read(path))
        if not isinstance(raw, dict) or not raw.get("name"):
            raise AgentsError("{} has no name, so nothing can call it".format(path))
        steps = raw.get("steps") or []
        if isinstance(steps, dict):
            steps = [steps]
        clean = []
        for s in steps:
            if not isinstance(s, dict):
                raise AgentsError("{}: a step is not a block of fields".format(path))
            clean.append({
                "id": s.get("id", ""),
                "task_class": s.get("task_class", ""),
                "run": s.get("run", ""),
                "tool": s.get("tool", ""),
                "finish_line": s.get("finish_line", ""),
            })
        guards = raw.get("guardrails") or []
        if isinstance(guards, str):
            guards = [guards] if guards else []
        out.append({
            "name": raw.get("name", ""),
            "when": raw.get("when", ""),
            "goal": raw.get("goal", ""),
            "guardrails": guards,
            "steps": clean,
            "path": path,
        })
    out.sort(key=lambda t: t["name"])
    return out


def tick(name):
    for t in ticks():
        if t["name"] == name:
            return t
    known = ", ".join(t["name"] for t in ticks()) or "none"
    raise AgentsError("no tick called '{}'. Known ticks: {}".format(name, known))


def plan(t):
    """Resolve every step of a tick to its tier.

    Takes a tick dict or a tick name. Raises RoutingError when a task class is
    not in the table, and Refused when the table says never. Both stop the run.
    """
    if isinstance(t, str):
        t = tick(t)
    table = routing()
    steps = []
    for s in t["steps"]:
        if not s.get("id"):
            raise AgentsError("{}: a step has no id".format(t["name"]))
        tier = tier_for(s.get("task_class"), table)
        if tier == NEVER:
            raise Refused(
                "REFUSED. {} step '{}' is task class '{}', which the routing "
                "table marks never. No tier runs it. Remove the step or change "
                "the table on purpose.".format(
                    t["name"], s["id"], s.get("task_class")))
        steps.append({
            "id": s["id"],
            "task_class": s.get("task_class", ""),
            "assigned": tier,
            "run": s.get("run", ""),
            "tool": s.get("tool", ""),
            "finish_line": s.get("finish_line", ""),
        })
    return {"tick": t["name"], "when": t.get("when", ""), "goal": t.get("goal", ""),
            "guardrails": t.get("guardrails", []), "steps": steps,
            "path": t.get("path", "")}


def unmapped_classes():
    """Task classes a tick uses that the routing table does not name."""
    routes = routing()["routes"]
    missing = {}
    for t in ticks():
        for s in t["steps"]:
            cls = s.get("task_class", "")
            if cls and cls not in routes:
                missing.setdefault(cls, []).append("{}.{}".format(t["name"], s.get("id", "")))
    return missing


# ---------------------------------------------------------------- runs

def runs(limit=None):
    """Run records, oldest first."""
    p = runs_path()
    if not os.path.exists(p):
        return []
    out = []
    with open(p, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
    if limit:
        out = out[-limit:]
    return out


def _run_id(name, ref=None):
    stamp = D.iso(ref or D.today())
    base = "{}-{}".format(name, stamp)
    taken = {r.get("run") for r in runs()}
    if base not in taken:
        return base
    n = 2
    while "{}-{}".format(base, n) in taken:
        n += 1
    return "{}-{}".format(base, n)


def _stamp():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def start_run(t, ref=None):
    """Open a run record in memory. Nothing is written until finish_run.

    The file is append only, so a half written run would have to be rewritten
    later, and a log you rewrite is not a log.
    """
    p = plan(t)
    return {"run": _run_id(p["tick"], ref), "tick": p["tick"], "started": _stamp(),
            "finished": "", "steps": [dict(s, actual="", ok=False, note="")
                                      for s in p["steps"]],
            "outcome": ""}


def finish_run(run, results=None, outcome=None):
    """Close a run and append one line to data/runs.jsonl.

    results is either a list of {"id","actual","ok","note"} or a plain mapping
    of step id to the tier it actually ran on.
    """
    if isinstance(results, dict):
        results = [{"id": k, "actual": v, "ok": True, "note": ""}
                   for k, v in results.items()]
    by_id = {r.get("id"): r for r in (results or [])}
    steps = []
    for s in run.get("steps", []):
        r = by_id.get(s["id"], {})
        actual = (r.get("actual") or "").strip()
        if actual and actual not in TIERS:
            raise RoutingError(
                "step '{}' says it ran on '{}', which is not a tier. Use one of "
                "{}.".format(s["id"], actual, ", ".join(TIERS)))
        steps.append({
            "id": s["id"],
            "task_class": s.get("task_class", ""),
            "assigned": s.get("assigned", ""),
            "actual": actual,
            "ok": bool(r.get("ok", False)) if actual else False,
            "note": r.get("note", "") or ("" if actual else "did not run"),
        })
    failed = [s for s in steps if s["actual"] and not s["ok"]]
    missing = [s for s in steps if not s["actual"]]
    run = dict(run)
    run["steps"] = steps
    run["finished"] = _stamp()
    run["outcome"] = outcome or ("failed" if failed else "blocked" if missing else "clean")
    os.makedirs(D.DATA, exist_ok=True)
    with open(runs_path(), "a", encoding="utf-8") as fh:
        fh.write(json.dumps(run, separators=(",", ":")) + "\n")
    E.append("add", "runs", run["run"], None, {"outcome": run["outcome"],
                                               "steps": len(steps)},
             cause="tick run recorded", tick=run["tick"])
    return run


def last_outcome(name):
    for r in reversed(runs()):
        if r.get("tick") == name:
            return r.get("outcome", "")
    return ""


# ---------------------------------------------------------------- reconcile

def reconcile(window_days=30, ref=None):
    """Compare the tier each step ran on against the tier the table assigns.

    Two findings, never added together. RISK is a cheaper tier running work the
    table assigns to a dearer one, which is the one that costs you a customer.
    WASTE is a judge running work a probe could do, which only costs money.
    Risk is listed first and sorted by how far the step fell.
    """
    ref = ref or D.today()
    cutoff = ref - timedelta(days=int(window_days))
    routes = routing()["routes"]
    risk, waste, unmapped = [], [], []
    seen_runs = 0
    seen_steps = 0
    for rec in runs():
        started = D.d((rec.get("started") or "")[:10])
        if started and started < cutoff:
            continue
        seen_runs += 1
        for s in rec.get("steps", []):
            actual = (s.get("actual") or "").strip()
            if not actual:
                continue
            seen_steps += 1
            cls = s.get("task_class", "")
            if cls not in routes:
                unmapped.append({
                    "kind": "UNMAPPED", "run": rec.get("run", ""),
                    "tick": rec.get("tick", ""), "step": s.get("id", ""),
                    "task_class": cls, "assigned": s.get("assigned", ""),
                    "actual": actual, "gap": 0,
                    "note": "ran, then the task class left the table"})
                continue
            assigned = routes[cls]
            if assigned == NEVER:
                risk.append({
                    "kind": "RISK", "run": rec.get("run", ""),
                    "tick": rec.get("tick", ""), "step": s.get("id", ""),
                    "task_class": cls, "assigned": NEVER, "actual": actual,
                    "gap": 9, "note": "the table says never and it ran anyway"})
                continue
            gap = RANK.get(assigned, 0) - RANK.get(actual, 0)
            if gap > 0:
                risk.append({
                    "kind": "RISK", "run": rec.get("run", ""),
                    "tick": rec.get("tick", ""), "step": s.get("id", ""),
                    "task_class": cls, "assigned": assigned, "actual": actual,
                    "gap": gap,
                    "note": "{} work ran on {}".format(assigned, actual)})
            elif gap < 0:
                waste.append({
                    "kind": "WASTE", "run": rec.get("run", ""),
                    "tick": rec.get("tick", ""), "step": s.get("id", ""),
                    "task_class": cls, "assigned": assigned, "actual": actual,
                    "gap": gap,
                    "note": "{} did work assigned to {}".format(actual, assigned)})
    risk.sort(key=lambda f: (-f["gap"], f["run"], f["step"]))
    waste.sort(key=lambda f: (f["gap"], f["run"], f["step"]))
    return {"window_days": int(window_days), "from": D.iso(cutoff), "to": D.iso(ref),
            "runs_seen": seen_runs, "steps_seen": seen_steps,
            "risk": risk, "waste": waste, "unmapped": unmapped,
            "findings": risk + waste + unmapped}


# ---------------------------------------------------------------- work registry

def _work_rows():
    p = work_path()
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    out = []
    for r in rows:
        if not any((v or "").strip() for v in r.values() if isinstance(v, str)):
            continue
        out.append({c: (r.get(c) or "").strip() for c in WORK_COLS})
    return out


def _write_work(rows):
    os.makedirs(D.DATA, exist_ok=True)
    with open(work_path(), "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=WORK_COLS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in WORK_COLS})


def work_registry(status=None, kind=None):
    """Every row in data/work.csv, filtered if you ask."""
    rows = _work_rows()
    if status:
        rows = [r for r in rows if r.get("status") == status]
    if kind:
        rows = [r for r in rows if r.get("kind") == kind]
    rows.sort(key=lambda r: r.get("id", ""))
    return rows


def next_work_id(rows=None):
    rows = _work_rows() if rows is None else rows
    n = 0
    for r in rows:
        m = re.match(r"^w(\d+)$", r.get("id", ""))
        if m:
            n = max(n, int(m.group(1)))
    return "w{:04d}".format(n + 1)


def add_work(title, kind="work", owner="", tick_name="", blocked_by="", notes="",
             status="open", cause="work registry"):
    if not (title or "").strip():
        raise AgentsError("a work row needs a title. Nothing else identifies it.")
    if kind not in WORK_KINDS:
        raise AgentsError("kind '{}' is not one of {}".format(kind, ", ".join(WORK_KINDS)))
    if status not in WORK_STATUS:
        raise AgentsError("status '{}' is not one of {}".format(status, ", ".join(WORK_STATUS)))
    rows = _work_rows()
    row = {c: "" for c in WORK_COLS}
    row.update({"id": next_work_id(rows), "title": title.strip(), "kind": kind,
                "status": status, "opened": D.iso(D.today()), "owner": owner,
                "tick": tick_name, "blocked_by": blocked_by, "notes": notes})
    rows.append(row)
    _write_work(rows)
    E.append("add", "work", row["id"], None, row, cause=cause, tick=tick_name or None)
    return row


def close_work(wid, status="done", notes=None, cause="work registry"):
    if status not in WORK_STATUS:
        raise AgentsError("status '{}' is not one of {}".format(status, ", ".join(WORK_STATUS)))
    rows = _work_rows()
    before = None
    for r in rows:
        if r.get("id") == wid:
            before = dict(r)
            r["status"] = status
            r["closed"] = D.iso(D.today()) if status in ("done", "dropped") else ""
            if notes is not None:
                r["notes"] = notes
            after = dict(r)
            break
    if before is None:
        return None
    _write_work(rows)
    E.append("set", "work", wid, before, after, cause=cause)
    return after
