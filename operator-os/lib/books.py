"""
Double entry books, derived from the registries you already keep.

You never write a journal entry by hand unless you want to. Every invoice,
payment and expense posts itself through a fixed set of rules, into a journal
you can read, and the journal is proved three ways: every entry balances, the
trial balance nets to zero, and the balances tie back to the reports the rest of
the system prints. If they ever disagree, `os books check` says which one is
wrong rather than quietly picking a side.
"""

import csv
import os
from collections import OrderedDict, defaultdict

import osdata as D

BANK = "1000"
RECEIVABLE = "1100"
TAX_HELD = "2100"
CAPITAL = "3000"
SALES = "4000"
DIRECT = "5000"
OTHER = "6900"
BAD_DEBT = "6900"

JCOLS = ["id", "entry", "date", "account", "debit", "credit", "memo",
         "source_type", "source_id"]


# ---------------------------------------------------------------- io

def accounts():
    p = os.path.join(D.DATA, "accounts.csv")
    if not os.path.exists(p):
        return OrderedDict()
    out = OrderedDict()
    with open(p, "r", encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            if r.get("code"):
                out[r["code"].strip()] = {"name": r.get("name", "").strip(),
                                          "kind": r.get("kind", "").strip(),
                                          "notes": r.get("notes", "").strip()}
    return out


def category_map():
    p = os.path.join(D.DATA, "category_map.csv")
    out = {}
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8-sig", newline="") as fh:
            for r in csv.DictReader(fh):
                if r.get("category"):
                    out[r["category"].strip().lower()] = (r.get("account") or OTHER).strip()
    return out


def journal():
    p = os.path.join(D.DATA, "journal.csv")
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8-sig", newline="") as fh:
        rows = [dict(r) for r in csv.DictReader(fh)]
    return [{c: (r.get(c) or "").strip() for c in JCOLS} for r in rows
            if any((v or "").strip() for v in r.values())]


def write_journal(rows):
    os.makedirs(D.DATA, exist_ok=True)
    with open(os.path.join(D.DATA, "journal.csv"), "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=JCOLS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in JCOLS})


# ---------------------------------------------------------------- posting

def _line(entry, date, account, debit, credit, memo, stype, sid):
    return {"entry": entry, "date": date, "account": account,
            "debit": D.plain(debit) if debit else "",
            "credit": D.plain(credit) if credit else "",
            "memo": memo, "source_type": stype, "source_id": sid}


def derive():
    """Build every entry the registries imply. Deterministic and idempotent."""
    cmap = category_map()
    cfg = D.config()
    entries = []

    opening = D.cents(cfg.get("opening_cash"))
    if opening:
        e = "OPEN"
        entries.append([
            _line(e, cfg.get("books_open_date", D.iso(D.today())), BANK, opening, 0,
                  "Opening balance", "opening", "opening"),
            _line(e, cfg.get("books_open_date", D.iso(D.today())), CAPITAL, 0, opening,
                  "Opening balance", "opening", "opening"),
        ])

    for inv in D.load("invoices"):
        if inv.get("status") == "draft":
            continue
        total = D.cents(inv.get("total"))
        sub = D.cents(inv.get("subtotal")) or total
        tax = D.cents(inv.get("tax"))
        if sub + tax != total:
            sub, tax = total - tax, tax
        num = inv.get("number") or inv["id"]
        e = "INV-" + inv["id"]
        lines = [_line(e, inv.get("issued"), RECEIVABLE, total, 0,
                       "Invoice " + num, "invoice", inv["id"]),
                 _line(e, inv.get("issued"), SALES, 0, sub,
                       "Invoice " + num, "invoice", inv["id"])]
        if tax:
            lines.append(_line(e, inv.get("issued"), TAX_HELD, 0, tax,
                               "Tax on " + num, "invoice", inv["id"]))
        entries.append(lines)

        if inv.get("status") == "paid" and inv.get("paid_on"):
            p = "PAY-" + inv["id"]
            entries.append([
                _line(p, inv.get("paid_on"), BANK, total, 0,
                      "Payment of " + num, "payment", inv["id"]),
                _line(p, inv.get("paid_on"), RECEIVABLE, 0, total,
                      "Payment of " + num, "payment", inv["id"]),
            ])
        elif inv.get("status") == "written_off":
            w = "WO-" + inv["id"]
            entries.append([
                _line(w, inv.get("due") or inv.get("issued"), BAD_DEBT, total, 0,
                      "Written off " + num, "writeoff", inv["id"]),
                _line(w, inv.get("due") or inv.get("issued"), RECEIVABLE, 0, total,
                      "Written off " + num, "writeoff", inv["id"]),
            ])

    for ex in D.load("expenses"):
        amt = D.cents(ex.get("amount"))
        if not amt:
            continue
        acct = cmap.get((ex.get("category") or "").strip().lower(), OTHER)
        if ex.get("project_id"):
            acct = cmap.get((ex.get("category") or "").strip().lower(), DIRECT)
        e = "EXP-" + ex["id"]
        memo = "{} {}".format(ex.get("vendor") or "", ex.get("category") or "").strip()
        entries.append([
            _line(e, ex.get("date"), acct, amt, 0, memo, "expense", ex["id"]),
            _line(e, ex.get("date"), BANK, 0, amt, memo, "expense", ex["id"]),
        ])
    return entries


def post():
    """Merge derived entries into the journal, keeping manual entries intact."""
    manual = [r for r in journal() if r.get("source_type") == "manual"]
    rows = []
    n = 1
    for lines in derive():
        for ln in lines:
            ln = dict(ln)
            ln["id"] = "j{:05d}".format(n)
            n += 1
            rows.append(ln)
    for r in manual:
        r = dict(r)
        r["id"] = "j{:05d}".format(n)
        n += 1
        rows.append(r)
    rows.sort(key=lambda r: (r.get("date") or "", r.get("entry") or ""))
    for i, r in enumerate(rows, start=1):
        r["id"] = "j{:05d}".format(i)
    write_journal(rows)
    return {"derived": len(rows) - len(manual), "manual": len(manual)}


def add_manual(entry, date, legs, memo=""):
    """legs: [(account, debit_cents, credit_cents, memo)]"""
    rows = journal()
    n = len(rows)
    for acct, dr, cr, m in legs:
        n += 1
        rows.append({"id": "j{:05d}".format(n), "entry": entry, "date": date,
                     "account": acct, "debit": D.plain(dr) if dr else "",
                     "credit": D.plain(cr) if cr else "", "memo": m or memo,
                     "source_type": "manual", "source_id": entry})
    write_journal(rows)
    return len(legs)


# ---------------------------------------------------------------- reports

def balances(upto=None, frm=None):
    """Net movement per account. Debits positive, credits negative."""
    out = defaultdict(int)
    for r in journal():
        dt = r.get("date") or ""
        if upto and dt > upto:
            continue
        if frm and dt < frm:
            continue
        out[r["account"]] += D.cents(r.get("debit")) - D.cents(r.get("credit"))
    return dict(out)


def trial_balance(upto=None):
    acc = accounts()
    bal = balances(upto)
    rows = []
    for code in sorted(set(list(acc) + list(bal))):
        v = bal.get(code, 0)
        if v == 0:
            continue
        rows.append({"code": code, "name": acc.get(code, {}).get("name", code),
                     "kind": acc.get(code, {}).get("kind", ""),
                     "debit": v if v > 0 else 0, "credit": -v if v < 0 else 0})
    return rows


def pnl(frm=None, to=None):
    acc = accounts()
    bal = balances(upto=to, frm=frm)
    income, expense = [], []
    for code, v in sorted(bal.items()):
        kind = acc.get(code, {}).get("kind", "")
        name = acc.get(code, {}).get("name", code)
        if kind == "income":
            income.append({"code": code, "name": name, "amount": -v})
        elif kind == "expense":
            expense.append({"code": code, "name": name, "amount": v})
    ti = sum(r["amount"] for r in income)
    te = sum(r["amount"] for r in expense)
    return {"income": income, "expense": expense, "total_income": ti,
            "total_expense": te, "profit": ti - te,
            "margin_pct": (ti - te) / ti * 100.0 if ti else 0.0,
            "from": frm, "to": to}


def balance_sheet(upto=None):
    acc = accounts()
    bal = balances(upto)
    assets, liabilities, equity = [], [], []
    pl = pnl(to=upto)
    for code, v in sorted(bal.items()):
        kind = acc.get(code, {}).get("kind", "")
        name = acc.get(code, {}).get("name", code)
        if kind == "asset":
            assets.append({"code": code, "name": name, "amount": v})
        elif kind == "liability":
            liabilities.append({"code": code, "name": name, "amount": -v})
        elif kind == "equity":
            equity.append({"code": code, "name": name, "amount": -v})
    ta = sum(r["amount"] for r in assets)
    tl = sum(r["amount"] for r in liabilities)
    te = sum(r["amount"] for r in equity)
    return {"assets": assets, "liabilities": liabilities, "equity": equity,
            "total_assets": ta, "total_liabilities": tl, "total_equity": te,
            "retained": pl["profit"],
            "check": ta - (tl + te + pl["profit"]), "upto": upto}


def stale():
    """True when the registries have moved on since the journal was posted."""
    have = [(r["entry"], r["account"], r["debit"], r["credit"], r["date"])
            for r in journal() if r.get("source_type") != "manual"]
    want = []
    for lines in derive():
        for ln in lines:
            want.append((ln["entry"], ln["account"], ln["debit"], ln["credit"], ln["date"]))
    return sorted(have) != sorted(want)


def check():
    """Three proofs. Returns (problems, notes)."""
    problems, notes = [], []
    rows = journal()
    if not rows:
        return (["the journal is empty, run `os books post`"], [])
    if stale():
        return (["the journal is out of date: rows have changed since it was posted. "
                 "Run `os books post`, then check again."], [])

    by_entry = defaultdict(int)
    for r in rows:
        by_entry[r["entry"]] += D.cents(r.get("debit")) - D.cents(r.get("credit"))
    for entry, v in sorted(by_entry.items()):
        if v != 0:
            problems.append("entry {} does not balance, out by {}".format(
                entry, D.money(v, D.sym())))
    notes.append("{} entries, all balanced".format(len(by_entry))
                 if not problems else "{} entries checked".format(len(by_entry)))

    tb = sum(D.cents(r.get("debit")) - D.cents(r.get("credit")) for r in rows)
    if tb != 0:
        problems.append("trial balance does not net to zero, out by {}".format(
            D.money(tb, D.sym())))
    else:
        notes.append("trial balance nets to zero")

    bal = balances()
    ar_books = bal.get(RECEIVABLE, 0)
    ag = D.aging()
    ar_report = sum(c for k in ag for _, c, _ in ag[k])
    if ar_books != ar_report:
        problems.append(
            "money owed disagrees: books say {}, the aging report says {}".format(
                D.money(ar_books, D.sym()), D.money(ar_report, D.sym())))
    else:
        notes.append("money owed ties to the aging report at {}".format(
            D.money(ar_books, D.sym())))

    acc = accounts()
    for r in rows:
        if r["account"] not in acc:
            problems.append("entry {} posts to account {}, which is not in accounts.csv".format(
                r["entry"], r["account"]))
            break
    return problems, notes
