"""
osq, a small query language over the registries.

    select number, contact_name, open_amount, days_late
    from invoices
    where status != paid and days_late > 30
    order by open_amount desc
    limit 10

Supports one registry per query plus virtual columns that compute the things
you would otherwise reach for a spreadsheet to work out. No joins to write by
hand: the virtual columns already carry the related names and totals.
"""

import re
from datetime import timedelta

import osdata as D

KEYWORDS = ("select", "from", "where", "order", "by", "limit", "group",
            "and", "or", "not", "in", "like", "asc", "desc", "count")


# ---------------------------------------------------------------- virtuals

def _contact_names():
    return {c["id"]: c.get("name") or c["id"] for c in D.load("contacts")}


def _project_names():
    return {p["id"]: p.get("name") or p["id"] for p in D.load("projects")}


def virtuals(entity):
    """Return {column: fn(row) -> value} for one registry."""
    today = D.today()
    if entity == "invoices":
        names, projs = _contact_names(), _project_names()
        terms = int(D.config().get("invoice_terms_days") or 14)
        return {
            "contact_name": lambda r: names.get(r.get("contact_id"), ""),
            "project_name": lambda r: projs.get(r.get("project_id"), ""),
            "days_late": lambda r: D.days_late(r, today),
            "open_amount": lambda r: D.plain(D.invoice_open_cents(r)),
            "paid_lag": lambda r: ((D.d(r.get("paid_on")) - D.d(r.get("issued"))).days
                                   if r.get("paid_on") and r.get("issued") else ""),
            "expected_lag": lambda r: D.pay_lag(r.get("contact_id"), terms),
            "age": lambda r: (today - D.d(r.get("issued"), today)).days,
        }
    if entity == "deals":
        names = _contact_names()
        return {
            "contact_name": lambda r: names.get(r.get("contact_id"), ""),
            "days_open": lambda r: (today - D.d(r.get("opened"), today)).days,
            "weighted_value": lambda r: D.plain(int(D.cents(r.get("value")) *
                                                    (float(r.get("confidence") or 0) / 100.0))),
            "days_to_close": lambda r: ((D.d(r.get("expected_close")) - today).days
                                        if r.get("expected_close") else ""),
            "action_overdue": lambda r: ("yes" if (not r.get("next_action_due") or
                                                   D.d(r.get("next_action_due"), today) <= today)
                                         and r.get("status") == "open" else "no"),
        }
    if entity == "projects":
        names = _contact_names()
        return {
            "contact_name": lambda r: names.get(r.get("contact_id"), ""),
            "revenue": lambda r: D.plain(D.project_margin(r["id"])["revenue"]),
            "cost": lambda r: D.plain(D.project_margin(r["id"])["expenses"] +
                                      D.project_margin(r["id"])["labour"]),
            "profit": lambda r: D.plain(D.project_margin(r["id"])["profit"]),
            "margin_pct": lambda r: round(D.project_margin(r["id"])["margin_pct"], 1),
            "hours": lambda r: round(D.project_margin(r["id"])["minutes"] / 60.0, 1),
            "days_over": lambda r: ((today - D.d(r["due"])).days
                                    if r.get("due") and D.d(r["due"]) and
                                    D.d(r["due"]) < today and
                                    r.get("status") not in ("done", "cancelled") else 0),
        }
    if entity == "tasks":
        projs = _project_names()
        return {
            "project_name": lambda r: projs.get(r.get("project_id"), ""),
            "days_overdue": lambda r: ((today - D.d(r["due"])).days
                                       if r.get("due") and D.d(r["due"]) and
                                       D.d(r["due"]) < today and
                                       r.get("status") not in ("done", "dropped") else 0),
            "hours": lambda r: round(int(r.get("estimate_min") or 0) / 60.0, 2),
        }
    if entity == "contacts":
        invs = D.load("invoices")
        deals = D.load("deals")

        def billed(r):
            return D.plain(sum(D.cents(i.get("total")) for i in invs
                               if i.get("contact_id") == r["id"]
                               and i.get("status") != "draft"))

        def outstanding(r):
            return D.plain(sum(D.invoice_open_cents(i) for i in invs
                               if i.get("contact_id") == r["id"]))

        def lag(r):
            lags = [(D.d(i["paid_on"]) - D.d(i["issued"])).days for i in invs
                    if i.get("contact_id") == r["id"] and i.get("status") == "paid"
                    and i.get("paid_on") and i.get("issued")]
            if not lags:
                return ""
            lags.sort()
            return lags[len(lags) // 2]

        return {
            "total_billed": billed,
            "outstanding": outstanding,
            "median_pay_lag": lag,
            "open_deals": lambda r: sum(1 for x in deals
                                        if x.get("contact_id") == r["id"]
                                        and x.get("status") == "open"),
            "days_since_contact": lambda r: ((today - D.d(r["last_contact"])).days
                                             if r.get("last_contact") and
                                             D.d(r.get("last_contact")) else ""),
        }
    if entity == "expenses":
        projs = _project_names()
        return {"project_name": lambda r: projs.get(r.get("project_id"), ""),
                "age": lambda r: (today - D.d(r.get("date"), today)).days}
    if entity == "time":
        projs = _project_names()
        return {"project_name": lambda r: projs.get(r.get("project_id"), ""),
                "hours": lambda r: round(int(r.get("minutes") or 0) / 60.0, 2),
                "value": lambda r: D.plain(int(int(r.get("minutes") or 0) / 60.0 *
                                               D.cents(r.get("rate") or
                                                       D.config().get("hourly_rate"))))}
    if entity == "recurring":
        return {"annual": lambda r: D.plain(_annualise(r)),
                "days_away": lambda r: ((D.d(r["next_date"]) - today).days
                                        if r.get("next_date") and D.d(r.get("next_date")) else "")}
    return {}


def _annualise(r):
    per = {"weekly": 52, "fortnightly": 26, "monthly": 12,
           "quarterly": 4, "yearly": 1}.get(r.get("cadence"), 12)
    return D.cents(r.get("amount")) * per


def columns_for(entity):
    return list(D.SCHEMA[entity]["cols"]) + sorted(virtuals(entity))


# ---------------------------------------------------------------- lexer

TOKEN = re.compile(r"""
    \s*(?:
      (?P<str>'[^']*'|"[^"]*")
    | (?P<op><=|>=|!=|<>|=|<|>)
    | (?P<punct>[(),*])
    | (?P<word>[A-Za-z_][A-Za-z0-9_.]*)
    | (?P<num>-?\d+(?:\.\d+)?)
    )""", re.VERBOSE)


def lex(s):
    out, pos = [], 0
    while pos < len(s):
        m = TOKEN.match(s, pos)
        if not m:
            if s[pos].isspace():
                pos += 1
                continue
            raise ValueError("cannot read '{}' at position {}".format(s[pos], pos))
        pos = m.end()
        for kind in ("str", "op", "punct", "word", "num"):
            v = m.group(kind)
            if v is not None:
                out.append((kind, v))
                break
    return out


# ---------------------------------------------------------------- values

def coerce(v):
    if isinstance(v, str):
        s = v.strip()
        if s.startswith(("'", '"')):
            return s[1:-1]
        low = s.lower()
        if low == "today":
            return D.iso(D.today())
        if low == "null" or low == "blank":
            return ""
        m = re.match(r"^today([+-])(\d+)$", low)
        if m:
            delta = timedelta(days=int(m.group(2)))
            return D.iso(D.today() + delta if m.group(1) == "+" else D.today() - delta)
    return v


def as_number(v):
    try:
        return float(str(v).replace(",", "").replace("$", ""))
    except (TypeError, ValueError):
        return None


def compare(left, op, right):
    right = coerce(right)
    ln, rn = as_number(left), as_number(right)
    if ln is not None and rn is not None:
        a, b = ln, rn
    else:
        a, b = str(left).lower(), str(right).lower()
    if op in ("=", "=="):
        return a == b
    if op in ("!=", "<>"):
        return a != b
    if op == "<":
        return a < b
    if op == ">":
        return a > b
    if op == "<=":
        return a <= b
    if op == ">=":
        return a >= b
    raise ValueError("unknown operator " + op)


# ---------------------------------------------------------------- parser

class Parser(object):
    def __init__(self, tokens):
        self.t = tokens
        self.i = 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def next(self):
        tok = self.peek()
        self.i += 1
        return tok

    def accept_word(self, w):
        k, v = self.peek()
        if k == "word" and v.lower() == w:
            self.next()
            return True
        return False

    def expect_word(self, w):
        if not self.accept_word(w):
            raise ValueError("expected '{}' near token {}".format(w, self.i + 1))

    def parse(self):
        self.expect_word("select")
        cols = self.col_list()
        self.expect_word("from")
        k, entity = self.next()
        if k != "word" or entity not in D.SCHEMA:
            raise ValueError("'{}' is not a registry. One of: {}".format(
                entity, ", ".join(D.SCHEMA)))
        where = None
        if self.accept_word("where"):
            where = self.expr()
        order, direction = None, "asc"
        if self.accept_word("order"):
            self.expect_word("by")
            k, order = self.next()
            if self.accept_word("desc"):
                direction = "desc"
            else:
                self.accept_word("asc")
        limit = None
        if self.accept_word("limit"):
            k, n = self.next()
            limit = int(n)
        return {"cols": cols, "entity": entity, "where": where,
                "order": order, "dir": direction, "limit": limit}

    def col_list(self):
        cols = []
        while True:
            k, v = self.peek()
            if k == "punct" and v == "*":
                self.next()
                cols.append("*")
            elif k == "word":
                self.next()
                cols.append(v)
            else:
                raise ValueError("expected a column name")
            k, v = self.peek()
            if k == "punct" and v == ",":
                self.next()
                continue
            break
        return cols

    def expr(self):
        node = self.term()
        while True:
            if self.accept_word("or"):
                node = ("or", node, self.term())
            else:
                return node

    def term(self):
        node = self.factor()
        while True:
            if self.accept_word("and"):
                node = ("and", node, self.factor())
            else:
                return node

    def factor(self):
        if self.accept_word("not"):
            return ("not", self.factor())
        k, v = self.peek()
        if k == "punct" and v == "(":
            self.next()
            node = self.expr()
            k2, v2 = self.next()
            if v2 != ")":
                raise ValueError("missing closing bracket")
            return node
        k, col = self.next()
        if k != "word":
            raise ValueError("expected a column name in the condition")
        if self.accept_word("in"):
            k2, v2 = self.next()
            if v2 != "(":
                raise ValueError("expected ( after in")
            vals = []
            while True:
                k3, v3 = self.next()
                if v3 == ")":
                    break
                if v3 != ",":
                    vals.append(v3)
            return ("in", col, vals)
        if self.accept_word("like"):
            k2, v2 = self.next()
            return ("like", col, v2)
        k2, op = self.next()
        if k2 != "op":
            raise ValueError("expected a comparison after '{}'".format(col))
        k3, val = self.next()
        return ("cmp", col, op, val)


def evaluate(node, row):
    kind = node[0]
    if kind == "and":
        return evaluate(node[1], row) and evaluate(node[2], row)
    if kind == "or":
        return evaluate(node[1], row) or evaluate(node[2], row)
    if kind == "not":
        return not evaluate(node[1], row)
    if kind == "cmp":
        return compare(row.get(node[1], ""), node[2], node[3])
    if kind == "in":
        vals = [str(coerce(v)).lower() for v in node[2]]
        return str(row.get(node[1], "")).lower() in vals
    if kind == "like":
        pat = str(coerce(node[2])).lower().replace("%", ".*")
        return re.search(pat, str(row.get(node[1], "")).lower()) is not None
    raise ValueError("bad condition")


def run(text):
    """Execute a query. Returns (columns, rows)."""
    plan = Parser(lex(text)).parse()
    entity = plan["entity"]
    vcols = virtuals(entity)
    rows = []
    for r in D.load(entity):
        full = dict(r)
        for name, fn in vcols.items():
            try:
                full[name] = fn(r)
            except Exception:
                full[name] = ""
        rows.append(full)
    if plan["where"] is not None:
        rows = [r for r in rows if evaluate(plan["where"], r)]
    if plan["order"]:
        col = plan["order"]
        def key(r):
            n = as_number(r.get(col, ""))
            return (0, n, "") if n is not None else (1, 0, str(r.get(col, "")).lower())
        rows.sort(key=key, reverse=(plan["dir"] == "desc"))
    if plan["limit"]:
        rows = rows[:plan["limit"]]
    cols = plan["cols"]
    if cols == ["*"]:
        cols = D.SCHEMA[entity]["cols"]
    unknown = [c for c in cols if c not in D.SCHEMA[entity]["cols"] and c not in vcols]
    if unknown:
        raise ValueError("no column '{}' on {}. Available: {}".format(
            unknown[0], entity, ", ".join(columns_for(entity))))
    return cols, [{c: r.get(c, "") for c in cols} for r in rows]
