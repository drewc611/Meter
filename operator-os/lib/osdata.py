"""
Operator OS data engine.

Zero dependencies. Python 3.9+. Everything the business knows lives in CSV files
under data/ plus one flat config at data/business.yml. This module is the only
code allowed to read or write them.

Money is parsed to integer cents on the way in and formatted back to two decimal
places on the way out. Nothing rounds twice.
"""

import csv
import os
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.environ.get("OPERATOR_OS_DATA", os.path.join(ROOT, "data"))

# ---------------------------------------------------------------- schema

MONEY_COLS = {"value", "subtotal", "tax", "total", "amount", "budget", "rate"}

SCHEMA = {
    "contacts": {
        "cols": ["id", "name", "company", "role", "email", "phone", "source",
                 "status", "tags", "first_contact", "last_contact", "notes"],
        "prefix": "c",
        "enums": {"status": ["lead", "active", "past", "dormant", "do_not_contact"]},
        "refs": {},
    },
    "deals": {
        "cols": ["id", "contact_id", "title", "value", "stage", "confidence",
                 "opened", "expected_close", "next_action", "next_action_due",
                 "status", "closed_on", "lost_reason"],
        "prefix": "d",
        "enums": {
            "stage": ["new", "qualified", "quoted", "negotiating", "won", "lost"],
            "status": ["open", "won", "lost"],
        },
        "refs": {"contact_id": "contacts"},
    },
    "quotes": {
        "cols": ["id", "deal_id", "contact_id", "number", "issued", "expires",
                 "subtotal", "tax", "total", "status", "decided_on", "notes"],
        "prefix": "q",
        "enums": {"status": ["draft", "sent", "accepted", "declined", "expired"]},
        "refs": {"deal_id": "deals", "contact_id": "contacts"},
    },
    "projects": {
        "cols": ["id", "contact_id", "deal_id", "name", "status", "start", "due",
                 "budget", "hours_estimate", "health", "next_milestone", "closed_on"],
        "prefix": "p",
        "enums": {
            "status": ["planned", "active", "blocked", "done", "cancelled"],
            "health": ["green", "amber", "red", ""],
        },
        "refs": {"contact_id": "contacts", "deal_id": "deals"},
    },
    "tasks": {
        "cols": ["id", "project_id", "title", "due", "priority", "status",
                 "estimate_min", "done_on", "blocked_by", "notes"],
        "prefix": "t",
        "enums": {
            "status": ["todo", "doing", "blocked", "done", "dropped"],
            "priority": ["low", "normal", "high", "now"],
        },
        "refs": {"project_id": "projects"},
    },
    "time": {
        "cols": ["id", "date", "project_id", "task_id", "minutes", "billable",
                 "rate", "notes"],
        "prefix": "h",
        "enums": {"billable": ["yes", "no"]},
        "refs": {"project_id": "projects", "task_id": "tasks"},
    },
    "invoices": {
        "cols": ["id", "project_id", "contact_id", "number", "issued", "due",
                 "subtotal", "tax", "total", "status", "paid_on", "method", "notes"],
        "prefix": "i",
        "enums": {"status": ["draft", "sent", "part_paid", "paid", "written_off"]},
        "refs": {"project_id": "projects", "contact_id": "contacts"},
    },
    "expenses": {
        "cols": ["id", "date", "vendor", "category", "amount", "project_id",
                 "billable", "method", "receipt", "notes"],
        "prefix": "e",
        "enums": {"billable": ["yes", "no"]},
        "refs": {"project_id": "projects"},
    },
    "recurring": {
        "cols": ["id", "label", "type", "amount", "cadence", "next_date",
                 "category", "notes"],
        "prefix": "r",
        "enums": {
            "type": ["income", "cost"],
            "cadence": ["weekly", "fortnightly", "monthly", "quarterly", "yearly"],
        },
        "refs": {},
    },
}

CONFIG_DEFAULTS = {
    "business_name": "My Business",
    "operator": "",
    "trade": "",
    "currency": "USD",
    "currency_symbol": "$",
    "hourly_rate": "0.00",
    "target_margin_pct": "40",
    "tax_rate_pct": "0",
    "tax_set_aside_pct": "25",
    "invoice_terms_days": "14",
    "capacity_hours_per_week": "30",
    "opening_cash": "0.00",
    "week_starts": "monday",
    "quiet_hours": "18:00-08:00",
    "receipt_threshold": "75.00",
    "cash_buffer": "0.00",
    "books_open_date": "",
}

DATE_HINTS = ("_on", "date", "due", "issued", "expires", "start", "opened",
              "expected_close", "first_contact", "last_contact", "next_date")

# ---------------------------------------------------------------- money

def cents(value):
    """Parse a money string or number to integer cents. Blank becomes 0."""
    if value is None:
        return 0
    if isinstance(value, int):
        return value * 100
    s = str(value).strip()
    if not s:
        return 0
    s = re.sub(r"[^0-9.\-]", "", s)
    if not s or s in {"-", ".", "-."}:
        return 0
    q = Decimal(s).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(q * 100)


def money(c, symbol="$"):
    """Format integer cents for a human."""
    neg = c < 0
    c = abs(int(c))
    s = "{}{}.{:02d}".format(symbol, format(c // 100, ","), c % 100)
    return "-" + s if neg else s


def plain(c):
    """Format integer cents for a CSV cell."""
    neg = "-" if c < 0 else ""
    c = abs(int(c))
    return "{}{}.{:02d}".format(neg, c // 100, c % 100)


# ---------------------------------------------------------------- dates

def d(value, default=None):
    """Parse an ISO date. Tolerates blanks and slashes."""
    if not value:
        return default
    s = str(value).strip().replace("/", "-")
    if not s:
        return default
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m-%d-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return default


def today():
    override = os.environ.get("OPERATOR_OS_TODAY")
    return d(override) if override else date.today()


def iso(dt):
    return dt.isoformat() if dt else ""


# ---------------------------------------------------------------- config

def config():
    path = os.path.join(DATA, "business.yml")
    cfg = dict(CONFIG_DEFAULTS)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.split("#", 1)[0].strip()
                if not line or ":" not in line:
                    continue
                k, v = line.split(":", 1)
                cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg


def write_config(cfg):
    os.makedirs(DATA, exist_ok=True)
    path = os.path.join(DATA, "business.yml")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("# Operator OS business config. Plain key: value. Edit freely.\n")
        for k in CONFIG_DEFAULTS:
            fh.write("{}: {}\n".format(k, cfg.get(k, CONFIG_DEFAULTS[k])))
        for k, v in cfg.items():
            if k not in CONFIG_DEFAULTS:
                fh.write("{}: {}\n".format(k, v))


def sym():
    return config().get("currency_symbol", "$")


# ---------------------------------------------------------------- io

def path_for(name):
    return os.path.join(DATA, name + ".csv")


def load(name):
    if name not in SCHEMA:
        raise KeyError("unknown registry: " + name)
    p = path_for(name)
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    cols = SCHEMA[name]["cols"]
    clean = []
    for r in rows:
        if not any((v or "").strip() for v in r.values() if isinstance(v, str)):
            continue
        clean.append({c: (r.get(c) or "").strip() for c in cols})
    return clean


def save(name, rows):
    cols = SCHEMA[name]["cols"]
    os.makedirs(DATA, exist_ok=True)
    with open(path_for(name), "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})


def next_id(name, rows=None):
    rows = load(name) if rows is None else rows
    pre = SCHEMA[name]["prefix"]
    n = 0
    for r in rows:
        m = re.match(r"^" + pre + r"(\d+)$", r.get("id", ""))
        if m:
            n = max(n, int(m.group(1)))
    return "{}{:04d}".format(pre, n + 1)


def init_empty():
    os.makedirs(DATA, exist_ok=True)
    os.makedirs(os.path.join(DATA, "notes"), exist_ok=True)
    for name in SCHEMA:
        if not os.path.exists(path_for(name)):
            save(name, [])
    if not os.path.exists(os.path.join(DATA, "business.yml")):
        write_config(dict(CONFIG_DEFAULTS))


# ---------------------------------------------------------------- validate

def validate():
    """Return (errors, warnings). Errors mean the data is broken. Warnings mean
    the business is. Both are worth knowing, only one blocks."""
    problems = []
    warnings = []
    tables = {name: load(name) for name in SCHEMA}

    for name, spec in SCHEMA.items():
        seen = set()
        for i, r in enumerate(tables[name], start=2):
            rid = r.get("id", "")
            where = "{}.csv line {}".format(name, i)
            if not rid:
                problems.append("{}: missing id".format(where))
            elif rid in seen:
                problems.append("{}: duplicate id {}".format(where, rid))
            else:
                seen.add(rid)
            for col, allowed in spec["enums"].items():
                v = r.get(col, "")
                if v and v not in allowed:
                    problems.append("{}: {} is '{}', expected one of {}".format(
                        where, col, v, "/".join(a for a in allowed if a)))
            for col, target in spec["refs"].items():
                v = r.get(col, "")
                if v and not any(t.get("id") == v for t in tables[target]):
                    problems.append("{}: {} points at {} which is not in {}.csv".format(
                        where, col, v, target))
            for col in spec["cols"]:
                if col in MONEY_COLS and r.get(col):
                    try:
                        cents(r[col])
                    except Exception:
                        problems.append("{}: {} is not a number ('{}')".format(
                            where, col, r[col]))
                if col.endswith(DATE_HINTS) and r.get(col) and d(r[col]) is None:
                    problems.append("{}: {} is not a date ('{}')".format(
                        where, col, r[col]))

    for inv in tables["invoices"]:
        if inv.get("status") == "paid" and not inv.get("paid_on"):
            problems.append("invoices {}: marked paid with no paid_on date".format(inv["id"]))
        if inv.get("paid_on") and inv.get("status") not in ("paid", "part_paid"):
            problems.append("invoices {}: has paid_on but status is {}".format(
                inv["id"], inv.get("status") or "blank"))

    for dl in tables["deals"]:
        if dl.get("status") == "open" and not dl.get("next_action"):
            warnings.append("deals {} ({}): open with nothing scheduled to happen next".format(
                dl["id"], (dl.get("title") or "")[:32]))
    for q in tables["quotes"]:
        if q.get("status") == "sent" and q.get("expires") and d(q["expires"]) and d(q["expires"]) < today():
            warnings.append("quotes {}: expired on {} and was never marked won or lost".format(
                q.get("number") or q["id"], q["expires"]))
    for p_ in tables["projects"]:
        if p_.get("status") == "active" and p_.get("due") and d(p_["due"]) and d(p_["due"]) < today():
            warnings.append("projects {}: still active but was due {}".format(
                p_.get("name") or p_["id"], p_["due"]))
    for e in tables["expenses"]:
        if e.get("billable") == "yes" and e.get("project_id") and cents(e.get("amount")) > 0:
            pid = e["project_id"]
            billed = any(i.get("project_id") == pid and i.get("status") != "draft"
                         for i in tables["invoices"])
            if not billed:
                warnings.append("expenses {}: billable {} against {} with no invoice raised".format(
                    e["id"], e.get("amount"), pid))
    return problems, warnings


# ---------------------------------------------------------------- computations

def invoice_open_cents(inv):
    if inv.get("status") in ("paid", "written_off", "draft"):
        return 0
    return cents(inv.get("total"))


def days_late(inv, ref=None):
    ref = ref or today()
    due = d(inv.get("due"))
    if not due:
        return 0
    return max(0, (ref - due).days)


def aging(ref=None):
    """Unpaid invoices bucketed by how late they are."""
    ref = ref or today()
    buckets = {"current": [], "1-30": [], "31-60": [], "61-90": [], "90+": []}
    for inv in load("invoices"):
        openc = invoice_open_cents(inv)
        if openc <= 0:
            continue
        late = days_late(inv, ref)
        if late == 0:
            key = "current"
        elif late <= 30:
            key = "1-30"
        elif late <= 60:
            key = "31-60"
        elif late <= 90:
            key = "61-90"
        else:
            key = "90+"
        buckets[key].append((inv, openc, late))
    return buckets


def pay_lag(contact_id, default_days):
    """How long this customer actually takes to pay, from history."""
    lags = []
    for inv in load("invoices"):
        if inv.get("contact_id") != contact_id or inv.get("status") != "paid":
            continue
        issued, paid = d(inv.get("issued")), d(inv.get("paid_on"))
        if issued and paid:
            lags.append((paid - issued).days)
    if not lags:
        return default_days
    lags.sort()
    return lags[len(lags) // 2]


def _add_months(dt, n):
    y, m = dt.year, dt.month + n
    y += (m - 1) // 12
    m = (m - 1) % 12 + 1
    leap = y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)
    lengths = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return date(y, m, min(dt.day, lengths[m - 1]))


def _advance(dt, cadence):
    if cadence == "weekly":
        return dt + timedelta(days=7)
    if cadence == "fortnightly":
        return dt + timedelta(days=14)
    if cadence == "quarterly":
        return _add_months(dt, 3)
    if cadence == "yearly":
        return _add_months(dt, 12)
    return _add_months(dt, 1)


def cashflow(horizon_days=90, ref=None):
    """Projected cash by day. Returns (timeline, summary)."""
    ref = ref or today()
    cfg = config()
    terms = int(cfg.get("invoice_terms_days") or 14)
    opening = cents(cfg.get("opening_cash"))
    events = []

    for inv in load("invoices"):
        openc = invoice_open_cents(inv)
        if openc <= 0:
            continue
        issued = d(inv.get("issued"), ref)
        lag = pay_lag(inv.get("contact_id"), terms)
        expected = max(ref, issued + timedelta(days=lag))
        late = days_late(inv, ref)
        conf = 0.95 if late == 0 else 0.85 if late <= 30 else 0.6 if late <= 60 else 0.35
        events.append({"date": expected, "cents": openc, "confidence": conf,
                       "label": "invoice {} {}".format(
                           inv.get("number") or inv["id"],
                           "on time" if late == 0 else "{}d late".format(late)),
                       "kind": "invoice"})

    for dl in load("deals"):
        if dl.get("status") != "open":
            continue
        close = d(dl.get("expected_close"))
        if not close or close > ref + timedelta(days=horizon_days):
            continue
        try:
            conf = float(dl.get("confidence") or 0) / 100.0
        except ValueError:
            conf = 0.0
        if conf <= 0:
            continue
        events.append({"date": max(ref, close + timedelta(days=terms)),
                       "cents": cents(dl.get("value")), "confidence": conf,
                       "label": "deal {}".format(dl.get("title") or dl["id"]),
                       "kind": "deal"})

    for rec in load("recurring"):
        nxt = d(rec.get("next_date"))
        if not nxt:
            continue
        sign = 1 if rec.get("type") == "income" else -1
        amt = cents(rec.get("amount")) * sign
        cur, guard = nxt, 0
        while cur <= ref + timedelta(days=horizon_days) and guard < 400:
            if cur >= ref:
                events.append({"date": cur, "cents": amt, "confidence": 1.0,
                               "label": rec.get("label") or rec["id"],
                               "kind": "recurring"})
            cur = _advance(cur, rec.get("cadence") or "monthly")
            guard += 1

    events.sort(key=lambda e: e["date"])
    timeline, bal, weighted = [], opening, opening
    for e in events:
        bal += e["cents"]
        weighted += int(round(e["cents"] * e["confidence"]))
        timeline.append(dict(e, balance=bal, weighted=weighted))

    def at(day_count):
        cut = ref + timedelta(days=day_count)
        b, w = opening, opening
        for e in events:
            if e["date"] <= cut:
                b += e["cents"]
                w += int(round(e["cents"] * e["confidence"]))
        return b, w

    summary = {"opening": opening, "horizon": horizon_days}
    for h in (30, 60, 90):
        if h <= horizon_days:
            b, w = at(h)
            summary["d{}".format(h)] = {"best": b, "weighted": w}
    lowest, lowest_on = opening, ref
    for e in timeline:
        if e["weighted"] < lowest:
            lowest, lowest_on = e["weighted"], e["date"]
    summary["low_point"] = {"cents": lowest, "on": iso(lowest_on)}
    return timeline, summary


def project_margin(project_id):
    """Revenue minus direct expenses minus costed labour for one project."""
    rate = cents(config().get("hourly_rate"))
    revenue = sum(cents(i.get("total")) for i in load("invoices")
                  if i.get("project_id") == project_id
                  and i.get("status") not in ("draft", "written_off"))
    spend = sum(cents(e.get("amount")) for e in load("expenses")
                if e.get("project_id") == project_id)
    minutes = sum(int(t.get("minutes") or 0) for t in load("time")
                  if t.get("project_id") == project_id)
    labour = int(round(minutes / 60.0 * rate))
    profit = revenue - spend - labour
    pct = (profit / revenue * 100.0) if revenue else 0.0
    return {"project_id": project_id, "revenue": revenue, "expenses": spend,
            "labour": labour, "minutes": minutes, "profit": profit,
            "margin_pct": pct}


def ytd_net(ref=None):
    ref = ref or today()
    start = date(ref.year, 1, 1)
    income = sum(cents(i.get("total")) for i in load("invoices")
                 if i.get("status") == "paid"
                 and start <= (d(i.get("paid_on")) or start) <= ref)
    spend = sum(cents(e.get("amount")) for e in load("expenses")
                if start <= (d(e.get("date")) or start) <= ref)
    return {"income": income, "expenses": spend, "net": income - spend,
            "from": iso(start), "to": iso(ref)}


def tax_set_aside(ref=None):
    pct = float(config().get("tax_set_aside_pct") or 25)
    n = ytd_net(ref)
    return dict(n, pct=pct, set_aside=int(round(max(0, n["net"]) * pct / 100.0)))


def capacity(ref=None):
    """Committed hours against declared capacity for the next four weeks."""
    ref = ref or today()
    weekly = float(config().get("capacity_hours_per_week") or 30)
    horizon = ref + timedelta(days=28)
    minutes = 0
    for t in load("tasks"):
        if t.get("status") in ("done", "dropped"):
            continue
        due = d(t.get("due"))
        if due and ref <= due <= horizon:
            minutes += int(t.get("estimate_min") or 0)
    committed = minutes / 60.0
    available = weekly * 4
    return {"committed_hours": round(committed, 1), "available_hours": available,
            "load_pct": round(committed / available * 100.0, 1) if available else 0.0,
            "through": iso(horizon)}


def brief(ref=None):
    """Everything the operator needs to decide what to do next."""
    ref = ref or today()
    cfg = config()
    tasks = [t for t in load("tasks") if t.get("status") not in ("done", "dropped")]
    far = ref + timedelta(days=3650)
    overdue_tasks = [t for t in tasks if (d(t.get("due")) or far) < ref]
    due_today = [t for t in tasks if d(t.get("due")) == ref]
    ag = aging(ref)
    late_keys = ("1-30", "31-60", "61-90", "90+")
    late_money = sum(c for k in late_keys for _, c, _ in ag[k])
    stale_deals = []
    for dl in load("deals"):
        if dl.get("status") != "open":
            continue
        nad = d(dl.get("next_action_due"))
        if not nad or nad <= ref:
            stale_deals.append(dl)
    _, cash = cashflow(90, ref)
    return {
        "date": iso(ref),
        "business": cfg.get("business_name"),
        "overdue_tasks": overdue_tasks,
        "due_today": due_today,
        "late_invoice_cents": late_money,
        "late_invoice_count": sum(len(ag[k]) for k in late_keys),
        "deals_needing_action": stale_deals,
        "cash": cash,
        "capacity": capacity(ref),
    }


# ---------------------------------------------------------------- seeds

def resolve_token(value, ref=None):
    """Turn 'T-12', 'T+30', 'T' into real dates so demo data never goes stale."""
    if not isinstance(value, str):
        return value
    s = value.strip()
    if s == "T":
        return iso(ref or today())
    m = re.match(r"^T([+-])(\d+)$", s)
    if not m:
        return value
    delta = timedelta(days=int(m.group(2)))
    base = ref or today()
    return iso(base + delta if m.group(1) == "+" else base - delta)


def render_seed(seed, ref=None, log=True):
    """Materialise a workspace seed into the live data layer."""
    ref = ref or today()
    init_empty()
    cfg = dict(CONFIG_DEFAULTS)
    cfg.update(seed.get("config", {}))
    write_config(cfg)
    for name in SCHEMA:
        rows = []
        for raw in seed.get(name, []):
            row = {c: "" for c in SCHEMA[name]["cols"]}
            for k, v in raw.items():
                row[k] = resolve_token(v, ref) if isinstance(v, str) else v
            rows.append(row)
        if log:
            for r in rows:
                _events().append("add", name, r.get("id", ""), None, r,
                                 cause="loaded workspace")
        save(name, rows)
    notes = seed.get("notes", {})
    ndir = os.path.join(DATA, "notes")
    os.makedirs(ndir, exist_ok=True)
    for fname, body in notes.items():
        with open(os.path.join(ndir, fname), "w", encoding="utf-8") as fh:
            fh.write(body)
    return True


# ---------------------------------------------------------------- mutations

def _events():
    import events as E  # late import: events imports this module
    return E


def find_row(name, rid):
    for r in load(name):
        if r.get("id") == rid:
            return r
    return None


def put(name, row, cause="", tick=None):
    """Insert or replace one row, writing the event log first."""
    rows = load(name)
    rid = row.get("id") or next_id(name, rows)
    row = dict(row)
    row["id"] = rid
    before = None
    out = []
    for r in rows:
        if r.get("id") == rid:
            before = r
        else:
            out.append(r)
    full = {c: "" for c in SCHEMA[name]["cols"]}
    if before:
        full.update(before)
    full.update({k: v for k, v in row.items() if k in full})
    out.append(full)
    out.sort(key=lambda r: r.get("id", ""))
    _events().append("set" if before else "add", name, rid, before, full,
                     cause=cause, tick=tick)
    save(name, out)
    return full


def drop(name, rid, cause="", tick=None):
    """Remove a row. Reserved for genuine mistakes. Statuses are the normal path."""
    rows = load(name)
    before = None
    out = []
    for r in rows:
        if r.get("id") == rid:
            before = r
        else:
            out.append(r)
    if before is None:
        return None
    _events().append("delete", name, rid, before, None, cause=cause, tick=tick)
    save(name, out)
    return before


def bulk(name, rows, cause="", tick=None):
    """Replace a whole registry in one logged operation."""
    rows = [dict({c: "" for c in SCHEMA[name]["cols"]}, **r) for r in rows]
    for r in rows:
        _events().append("add", name, r.get("id", ""), None, r, cause=cause, tick=tick)
    save(name, rows)
    return rows
