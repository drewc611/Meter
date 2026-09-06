"""
Adapters: bringing outside data in without letting it write behind your back.

An adapter reads a file somebody else produced, a bank export, a Stripe report,
a calendar, a mailbox, and turns it into proposals. A proposal is a suggestion
with a reason attached. Nothing is written until you say so, and what does get
written goes through D.put, so it lands in the event log like everything else.

The import ledger at data/imports.csv is what makes this safe to run twice.
Every external record carries an id from its source. Once that id is in the
ledger it is never imported again, so a rerun over the same file is a no
operation rather than a pile of duplicates.

No adapter may touch the network. This module refuses to run one that declares
network True unless OPERATOR_OS_ALLOW_NETWORK is set in the environment, and
that switch exists so the refusal is visible, not so it is convenient.

An adapter is a folder under adapters/ with one adapter.py in it:

    ADAPTER = {
        "name": "bank-csv",
        "title": "Bank statement CSV",
        "reads": ["expenses", "invoices"],
        "writes": [],
        "needs": "a CSV exported from your bank",
        "network": False,
    }

    def sniff(path) -> float          0 to 1, how sure it is this file is for it
    def pull(path, ctx) -> [Proposal] reads only, writes nothing
    def push(ctx) -> [str]            optional, most adapters do not have one

A proposal is a plain dict:

    {"external_id": "...", "entity": "expenses", "row": {...},
     "action": "create" | "match" | "ignore", "match_id": "i0002" or None,
     "confidence": 0.0 to 1.0, "why": "one short sentence you can check"}
"""

import csv
import hashlib
import importlib.util
import os
import re

import osdata as D

ADAPTER_DIR = os.path.join(D.ROOT, "adapters")
LEDGER = "imports.csv"
LEDGER_COLS = ["id", "adapter", "external_id", "entity", "row_id",
               "imported_on", "amount", "summary", "status"]
ACTIONS = ("create", "match", "ignore")
STATUSES = ("linked", "ignored", "pending")
SKIP_DIRS = {"samples", "__pycache__"}


class AdapterError(Exception):
    """Something about an adapter or its input is wrong. The message says what."""


# ---------------------------------------------------------------- discovery

def _load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _record(name, folder):
    rec = {"name": name, "dir": folder, "title": name, "reads": [], "writes": [],
           "needs": "", "network": False, "module": None, "error": ""}
    try:
        mod = _load_module(os.path.join(folder, "adapter.py"), "osadapter_" + name.replace("-", "_"))
    except Exception as exc:
        rec["error"] = "will not load: {}".format(exc)
        return rec
    meta = getattr(mod, "ADAPTER", None)
    if not isinstance(meta, dict):
        rec["error"] = "has no ADAPTER dict"
        return rec
    rec["module"] = mod
    rec["name"] = meta.get("name") or name
    rec["title"] = meta.get("title") or rec["name"]
    rec["reads"] = list(meta.get("reads") or [])
    rec["writes"] = list(meta.get("writes") or [])
    rec["needs"] = meta.get("needs") or ""
    rec["network"] = bool(meta.get("network"))
    for ent in rec["reads"] + rec["writes"]:
        if ent not in D.SCHEMA:
            rec["error"] = "names a registry that does not exist: {}".format(ent)
    if not hasattr(mod, "sniff") or not hasattr(mod, "pull"):
        rec["error"] = "is missing sniff or pull"
    return rec


def discover():
    """Every adapter folder, loaded. Broken ones come back with error set."""
    out = []
    if not os.path.isdir(ADAPTER_DIR):
        return out
    for name in sorted(os.listdir(ADAPTER_DIR)):
        folder = os.path.join(ADAPTER_DIR, name)
        if name in SKIP_DIRS or name.startswith(".") or not os.path.isdir(folder):
            continue
        if not os.path.exists(os.path.join(folder, "adapter.py")):
            continue
        out.append(_record(name, folder))
    return out


def get(name):
    for rec in discover():
        if rec["name"] == name:
            return rec
    return None


# ---------------------------------------------------------------- network gate

def network_allowed():
    return bool(os.environ.get("OPERATOR_OS_ALLOW_NETWORK"))


def gate(rec):
    """Refuse an adapter that wants the network unless the operator opted in."""
    if rec.get("error"):
        raise AdapterError("adapter {} {}".format(rec["name"], rec["error"]))
    if rec["network"] and not network_allowed():
        raise AdapterError(
            "adapter {} declares network True. Adapters here read files, they do "
            "not make calls. Read its code first, then set OPERATOR_OS_ALLOW_NETWORK=1 "
            "if you still want it to run.".format(rec["name"]))
    return True


# ---------------------------------------------------------------- sniffing

def sniff_all(path):
    """Ask every adapter how sure it is about this file. Best guess first."""
    if not os.path.exists(path):
        raise AdapterError("no file at {}".format(path))
    scored = []
    for rec in discover():
        if rec.get("error") or (rec["network"] and not network_allowed()):
            continue
        try:
            score = float(rec["module"].sniff(path))
        except Exception:
            score = 0.0
        scored.append((rec["name"], max(0.0, min(1.0, score)), rec["title"]))
    scored.sort(key=lambda s: (-s[1], s[0]))
    return scored


# ---------------------------------------------------------------- proposals

def _check(p, i):
    where = "proposal {}".format(i + 1)
    if not isinstance(p, dict):
        raise AdapterError("{} is not a dict".format(where))
    ext = str(p.get("external_id") or "").strip()
    if not ext:
        raise AdapterError("{} has no external_id, so it could be imported twice".format(where))
    ent = p.get("entity")
    if ent not in D.SCHEMA:
        raise AdapterError("{} names entity '{}', which is not a registry".format(where, ent))
    row = p.get("row") or {}
    if not isinstance(row, dict):
        raise AdapterError("{} has a row that is not a dict".format(where))
    unknown = [c for c in row if c not in D.SCHEMA[ent]["cols"]]
    if unknown:
        raise AdapterError("{} sets columns {} which are not on {}".format(
            where, ", ".join(sorted(unknown)), ent))
    action = p.get("action")
    if action not in ACTIONS:
        raise AdapterError("{} has action '{}', expected one of {}".format(
            where, action, "/".join(ACTIONS)))
    if action == "match":
        mid = p.get("match_id")
        if not mid:
            raise AdapterError("{} is a match with no match_id".format(where))
        if D.find_row(ent, mid) is None:
            raise AdapterError("{} matches {} {}, which is not in the file".format(
                where, ent, mid))
    try:
        conf = float(p.get("confidence", 0))
    except (TypeError, ValueError):
        raise AdapterError("{} has a confidence that is not a number".format(where))
    if not 0.0 <= conf <= 1.0:
        raise AdapterError("{} has confidence {}, expected 0 to 1".format(where, conf))
    if not str(p.get("why") or "").strip():
        raise AdapterError("{} gives no reason, so nobody can check it".format(where))
    out = dict(p)
    out["external_id"] = ext
    out["confidence"] = conf
    out.setdefault("match_id", None)
    out["row"] = {k: ("" if v is None else str(v)) for k, v in row.items()}
    return out


def context():
    """What an adapter is allowed to know about the business while it reads."""
    return {
        "config": D.config(),
        "today": D.today(),
        "contacts": D.load("contacts"),
        "projects": D.load("projects"),
        "invoices": D.load("invoices"),
        "expenses": D.load("expenses"),
        "find_existing": find_existing,
        "digest": digest,
    }


def pull(name, path):
    """Run one adapter over one file. Writes nothing, ever."""
    rec = get(name)
    if rec is None:
        known = ", ".join(r["name"] for r in discover()) or "none installed"
        raise AdapterError("no adapter called '{}'. Installed: {}".format(name, known))
    gate(rec)
    if not os.path.exists(path):
        raise AdapterError("no file at {}".format(path))
    before = _fingerprint()
    proposals = rec["module"].pull(path, context())
    if proposals is None:
        proposals = []
    checked = [_check(p, i) for i, p in enumerate(proposals)]
    after = _fingerprint()
    if before != after:
        raise AdapterError(
            "adapter {} changed data while pulling. pull reads, it does not "
            "write. Do not trust it until that is fixed.".format(name))
    return checked


def push(name):
    """Run an adapter's optional push. Most adapters do not have one."""
    rec = get(name)
    if rec is None:
        raise AdapterError("no adapter called '{}'".format(name))
    gate(rec)
    fn = getattr(rec["module"], "push", None)
    if fn is None:
        raise AdapterError("adapter {} has no push. It only reads.".format(name))
    return fn(context()) or []


def _fingerprint():
    """Size and mtime of every data file, so a read only promise is checkable."""
    out = {}
    if not os.path.isdir(D.DATA):
        return out
    for f in sorted(os.listdir(D.DATA)):
        p = os.path.join(D.DATA, f)
        if os.path.isfile(p):
            st = os.stat(p)
            out[f] = (st.st_size, st.st_mtime_ns)
    return out


# ---------------------------------------------------------------- the ledger

def ledger_path():
    return os.path.join(D.DATA, LEDGER)


def imports_ledger():
    """Every import ever recorded, oldest first."""
    p = ledger_path()
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    return [{c: (r.get(c) or "").strip() for c in LEDGER_COLS}
            for r in rows if any((v or "").strip() for v in r.values())]


def _save_ledger(rows):
    os.makedirs(D.DATA, exist_ok=True)
    with open(ledger_path(), "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=LEDGER_COLS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in LEDGER_COLS})


def _next_ledger_id(rows):
    n = 0
    for r in rows:
        m = re.match(r"^im(\d+)$", r.get("id", ""))
        if m:
            n = max(n, int(m.group(1)))
    return "im{:04d}".format(n + 1)


def already_imported(external_id, adapter=None):
    """The ledger row that stops this being imported again, or None.

    A row marked ignored does not stop anything. That is what `os imports
    --forget` is for: it clears the way so the same record can be redone.
    """
    ext = str(external_id or "").strip()
    for r in reversed(imports_ledger()):
        if r["external_id"] != ext:
            continue
        if adapter and r["adapter"] != adapter:
            continue
        if r["status"] == "ignored":
            return None
        return r
    return None


def record_import(adapter, external_id, entity, row_id, amount="",
                  summary="", status="linked", when=None):
    """Write one line into the ledger. One line per external record, replaced
    in place if that record has been seen before."""
    if status not in STATUSES:
        raise AdapterError("import status '{}' is not one of {}".format(
            status, "/".join(STATUSES)))
    rows = imports_ledger()
    ext = str(external_id or "").strip()
    entry = {
        "id": "",
        "adapter": adapter,
        "external_id": ext,
        "entity": entity or "",
        "row_id": row_id or "",
        "imported_on": D.iso(when or D.today()),
        "amount": amount or "",
        "summary": (summary or "").replace("\n", " ")[:120],
        "status": status,
    }
    for r in rows:
        if r["external_id"] == ext and r["adapter"] == adapter:
            entry["id"] = r["id"]
            r.update(entry)
            _save_ledger(rows)
            return entry
    entry["id"] = _next_ledger_id(rows)
    rows.append(entry)
    _save_ledger(rows)
    return entry


def forget(external_id, adapter=None):
    """Mark an import ignored so the same record can be pulled in again."""
    rows = imports_ledger()
    ext = str(external_id or "").strip()
    changed = []
    for r in rows:
        if r["external_id"] == ext and (not adapter or r["adapter"] == adapter):
            r["status"] = "ignored"
            changed.append(r)
    if changed:
        _save_ledger(rows)
    return changed


# ---------------------------------------------------------------- the matcher

_MATCH = {
    "expenses": ("amount", "date", ("vendor", "notes")),
    "invoices": ("total", "issued", ("number", "notes")),
    "quotes": ("total", "issued", ("number", "notes")),
    "deals": ("value", "opened", ("title",)),
    "recurring": ("amount", "next_date", ("label",)),
    "time": (None, "date", ("notes",)),
    "tasks": (None, "due", ("title",)),
    "projects": ("budget", "start", ("name",)),
}

_NOISE = {"the", "and", "ltd", "llc", "inc", "co", "company", "payment", "pmt",
          "card", "purchase", "pos", "ref", "invoice", "inv", "dd", "debit"}


def _tokens(text):
    words = re.split(r"[^a-z0-9]+", str(text or "").lower())
    return {w for w in words if len(w) > 2 and w not in _NOISE and not w.isdigit()}


def similar(a, b):
    """How alike two names are, 0 to 1. Token overlap, with a nod to substrings."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    overlap = len(ta & tb) / float(min(len(ta), len(tb)))
    sa, sb = re.sub(r"[^a-z0-9]", "", str(a).lower()), re.sub(r"[^a-z0-9]", "", str(b).lower())
    if sa and sb and (sa in sb or sb in sa):
        overlap = max(overlap, 0.8)
    return min(1.0, overlap)


def find_existing(entity, row, window_days=3, floor=0.6):
    """Is this already in the books?

    Same money, a date within three days, and a vendor or contact that looks
    like the same one. Returns (row_id, confidence), or (None, 0.0) when nothing
    is close enough to be worth showing a human.
    """
    if entity not in D.SCHEMA:
        return None, 0.0
    if entity == "contacts":
        email = (row.get("email") or "").strip().lower()
        if not email:
            return None, 0.0
        for r in D.load("contacts"):
            if (r.get("email") or "").strip().lower() == email:
                return r.get("id"), 0.98
        return None, 0.0

    amt_col, date_col, label_cols = _MATCH.get(entity, (None, None, ()))
    want_amt = D.cents(row.get(amt_col)) if amt_col else None
    want_date = D.d(row.get(date_col)) if date_col else None
    best, best_conf = None, 0.0
    for r in D.load(entity):
        if amt_col:
            if not want_amt or D.cents(r.get(amt_col)) != want_amt:
                continue
        conf = 0.55
        if want_date:
            other = D.d(r.get(date_col))
            if other is None:
                continue
            gap = abs((other - want_date).days)
            if gap > window_days:
                continue
            conf += 0.15 if gap <= 1 else 0.05
        sim = max([similar(row.get(c), r.get(c)) for c in label_cols] or [0.0])
        conf += 0.30 * sim
        conf = min(0.99, conf)
        if conf > best_conf:
            best, best_conf = r.get("id"), conf
    if best_conf < floor:
        return None, 0.0
    return best, round(best_conf, 2)


def open_invoices():
    """Invoices with money still on them, largest first."""
    out = []
    for inv in D.load("invoices"):
        openc = D.invoice_open_cents(inv)
        if openc > 0:
            out.append((inv, openc))
    out.sort(key=lambda t: -t[1])
    return out


def match_open_invoice(amount_cents, when=None, contact_hint=""):
    """Money in that equals an unpaid invoice. Returns (invoice, confidence)."""
    if amount_cents <= 0:
        return None, 0.0
    best, best_conf = None, 0.0
    for inv, openc in open_invoices():
        if openc != amount_cents:
            continue
        conf = 0.8
        issued = D.d(inv.get("issued"))
        if when and issued and 0 <= (when - issued).days <= 120:
            conf += 0.08
        if contact_hint:
            for c in D.load("contacts"):
                if c.get("id") == inv.get("contact_id"):
                    conf += 0.1 * similar(contact_hint, c.get("name") or c.get("company"))
                    break
        conf = min(0.98, conf)
        if conf > best_conf:
            best, best_conf = inv, conf
    return best, round(best_conf, 2)


def digest(*parts):
    """A stable id for a source that does not give you one."""
    body = "|".join(str(p or "") for p in parts)
    return hashlib.sha1(body.encode("utf-8")).hexdigest()[:12]


# ---------------------------------------------------------------- applying

def apply(name, proposals, cause=None):
    """Write the proposals that should be written. Everything goes through
    D.put, so every row lands in the event log with a cause you can read."""
    cause = cause or "imported from {}".format(name)
    result = {"created": [], "matched": [], "skipped": [], "set_aside": [],
              "cause": cause}
    seen = set()
    for p in proposals:
        ext = p["external_id"]
        prior = already_imported(ext, name)
        if prior or ext in seen:
            result["skipped"].append((p, prior))
            continue
        seen.add(ext)
        if p["action"] == "ignore":
            result["set_aside"].append(p)
            continue
        if p["action"] == "match":
            record_import(name, ext, p["entity"], p["match_id"],
                          amount=_amount_of(p), summary=p["why"], status="pending")
            result["matched"].append(p)
            continue
        row = D.put(p["entity"], p["row"], cause=cause)
        record_import(name, ext, p["entity"], row["id"],
                      amount=_amount_of(p), summary=p["why"], status="linked")
        result["created"].append((p, row))
    return result


def _amount_of(p):
    for col in ("amount", "total", "value", "budget"):
        if p["row"].get(col):
            return p["row"][col]
    if p["action"] == "match" and p.get("match_id"):
        row = D.find_row(p["entity"], p["match_id"])
        if row:
            for col in ("total", "amount", "value"):
                if row.get(col):
                    return row[col]
    return ""
