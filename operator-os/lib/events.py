"""
Operator OS event log.

Every mutation appends one line to data/events.jsonl before the CSV is written.
The log is the audit trail, the undo stack, and the time machine. The CSVs stay
human editable on purpose, so the log also detects the edits you made by hand.

Line shape:
  {"seq":1,"ts":"...Z","actor":"you","op":"add|set|delete|bulk",
   "entity":"invoices","id":"i0001","before":{...}|null,"after":{...}|null,
   "cause":"invoice tool","tick":"code-tick"|null,"hash":"...","prev":"..."}

Each line carries a hash over its own content plus the previous line's hash, so
a removed or edited line is detectable. This is a tamper evident log, not a
tamper proof one, and the difference is worth stating out loud.
"""

import hashlib
import json
import os
import time

import osdata as D

LOG = "events.jsonl"
GENESIS = "0" * 16


def log_path():
    return os.path.join(D.DATA, LOG)


def _hash(payload, prev):
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256((prev + body).encode("utf-8")).hexdigest()[:16]


def read(limit=None, entity=None, since_seq=0):
    p = log_path()
    if not os.path.exists(p):
        return []
    out = []
    with open(p, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except ValueError:
                continue
            if e.get("seq", 0) <= since_seq:
                continue
            if entity and e.get("entity") != entity:
                continue
            out.append(e)
    if limit:
        out = out[-limit:]
    return out


def last():
    events = read()
    return events[-1] if events else None


def append(op, entity, rid, before, after, cause="", tick=None, actor=None):
    """Append one event. Returns the written event."""
    os.makedirs(D.DATA, exist_ok=True)
    prev_ev = last()
    seq = (prev_ev["seq"] + 1) if prev_ev else 1
    prev_hash = prev_ev["hash"] if prev_ev else GENESIS
    payload = {
        "seq": seq,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "actor": actor or os.environ.get("OPERATOR_OS_ACTOR", "you"),
        "op": op,
        "entity": entity,
        "id": rid,
        "before": before,
        "after": after,
        "cause": cause,
        "tick": tick,
        "prev": prev_hash,
    }
    payload["hash"] = _hash(payload, prev_hash)
    with open(log_path(), "a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, separators=(",", ":")) + "\n")
    return payload


def verify_chain():
    """Return a list of problems with the log's own integrity."""
    problems = []
    prev_hash = GENESIS
    seq = 0
    for e in read():
        expect_seq = seq + 1
        if e.get("seq") != expect_seq:
            problems.append("sequence jumps: expected {}, found {}".format(
                expect_seq, e.get("seq")))
        if e.get("prev") != prev_hash:
            problems.append("event {} does not follow the previous one".format(e.get("seq")))
        body = {k: v for k, v in e.items() if k != "hash"}
        if _hash(body, e.get("prev", GENESIS)) != e.get("hash"):
            problems.append("event {} has been edited after it was written".format(e.get("seq")))
        prev_hash = e.get("hash", prev_hash)
        seq = e.get("seq", seq)
    return problems


def replay(upto_seq=None, upto_date=None):
    """Rebuild every registry from the log alone. Returns {entity: [rows]}."""
    tables = {name: {} for name in D.SCHEMA}
    for e in read():
        if upto_seq is not None and e["seq"] > upto_seq:
            break
        if upto_date is not None and e["ts"][:10] > upto_date:
            break
        ent, rid = e.get("entity"), e.get("id")
        if ent not in tables:
            continue
        if e["op"] == "delete":
            tables[ent].pop(rid, None)
        elif e.get("after") is not None:
            tables[ent][rid] = dict(e["after"])
    return {k: list(v.values()) for k, v in tables.items()}


def drift():
    """Compare the log's view of the world against the CSVs on disk.

    Rows that differ are edits made by hand. That is allowed. This tells you
    which ones, so a hand edit is never silent.
    """
    rebuilt = replay()
    report = {}
    for name in D.SCHEMA:
        live = {r["id"]: r for r in D.load(name) if r.get("id")}
        logged = {r["id"]: r for r in rebuilt.get(name, []) if r.get("id")}
        added, removed, changed = [], [], []
        for rid, row in live.items():
            if rid not in logged:
                added.append(rid)
            else:
                diffs = [c for c in D.SCHEMA[name]["cols"]
                         if (row.get(c) or "") != (logged[rid].get(c) or "")]
                if diffs:
                    changed.append((rid, diffs))
        for rid in logged:
            if rid not in live:
                removed.append(rid)
        if added or removed or changed:
            report[name] = {"added": added, "removed": removed, "changed": changed}
    return report


def adopt():
    """Write the current CSV state into the log as one reconciling event set.

    Use after editing files by hand, so the log and the files agree again.
    """
    d = drift()
    n = 0
    for name, r in d.items():
        live = {row["id"]: row for row in D.load(name) if row.get("id")}
        rebuilt = {row["id"]: row for row in replay().get(name, []) if row.get("id")}
        for rid in r["added"]:
            append("add", name, rid, None, live[rid], cause="adopted a hand edit")
            n += 1
        for rid, _cols in r["changed"]:
            append("set", name, rid, rebuilt.get(rid), live[rid], cause="adopted a hand edit")
            n += 1
        for rid in r["removed"]:
            append("delete", name, rid, rebuilt.get(rid), None, cause="adopted a hand deletion")
            n += 1
    return n


def undo(count=1):
    """Reverse the last N events. Returns a list of descriptions."""
    events = read()
    if not events:
        return []
    done = []
    for e in reversed(events[-count:]):
        ent, rid = e.get("entity"), e.get("id")
        if ent not in D.SCHEMA:
            continue
        rows = D.load(ent)
        rows = [r for r in rows if r.get("id") != rid]
        if e.get("before") is not None:
            rows.append(dict(e["before"]))
            desc = "restored {} {}".format(ent, rid)
        else:
            desc = "removed {} {}".format(ent, rid)
        rows.sort(key=lambda r: r.get("id", ""))
        D.save(ent, rows)
        append("undo", ent, rid, e.get("after"), e.get("before"),
               cause="undo of event {}".format(e["seq"]))
        done.append(desc)
    return done


def materialise(target_dir, upto_seq=None, upto_date=None):
    """Write a point in time copy of the whole business into another folder."""
    tables = replay(upto_seq=upto_seq, upto_date=upto_date)
    os.makedirs(target_dir, exist_ok=True)
    real = D.DATA
    try:
        D.DATA = target_dir
        D.init_empty()
        for name, rows in tables.items():
            rows.sort(key=lambda r: r.get("id", ""))
            D.save(name, rows)
    finally:
        D.DATA = real
    src_cfg = os.path.join(real, "business.yml")
    if os.path.exists(src_cfg):
        with open(src_cfg, "r", encoding="utf-8") as a, \
             open(os.path.join(target_dir, "business.yml"), "w", encoding="utf-8") as b:
            b.write(a.read())
    return {k: len(v) for k, v in tables.items() if v}
