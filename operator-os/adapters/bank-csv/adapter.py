"""
Bank statement CSV.

Banks cannot agree on column names, so this adapter carries a mapping profile
instead of a fixed header. It handles a single signed amount column and a debit
and credit pair, because both are common and getting the sign wrong turns income
into a cost.

Money out becomes a proposed expense, unless an expense that looks like the same
purchase is already recorded, in which case it is a match and nothing is created.
Money in that equals an unpaid invoice becomes a match against that invoice, so
you mark the invoice paid rather than growing a second copy of the same money.
Money in that matches nothing is left alone with a reason, because a deposit is
not evidence of a sale.

Bank exports carry no stable row id, so the external id is a digest of the date,
the description and the amount. Two genuinely identical lines on one day get a
counter appended, so the second one is not mistaken for the first.
"""

import csv
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "lib")
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402

ADAPTER = {
    "name": "bank-csv",
    "title": "Bank statement CSV",
    "reads": ["expenses", "invoices"],
    "writes": [],
    "needs": "a CSV exported from your bank, with a date, a description and either an amount or a debit and credit pair",
    "network": False,
}

# The mapping profile. Lowercased header text on the left of each role.
PROFILE = {
    "date": ["date", "transaction date", "posted", "posted date", "posting date",
             "value date", "booking date", "date posted", "trans date"],
    "description": ["description", "details", "narrative", "memo", "payee",
                    "reference", "transaction description", "particulars",
                    "merchant", "name"],
    "amount": ["amount", "value", "transaction amount", "amount (gbp)",
               "amount (usd)", "signed amount"],
    "debit": ["debit", "debits", "withdrawal", "withdrawals", "money out",
              "paid out", "debit amount", "out"],
    "credit": ["credit", "credits", "deposit", "deposits", "money in",
               "paid in", "credit amount", "in"],
    "balance": ["balance", "running balance", "balance after"],
}

# Words in a description that suggest a category. First hit wins.
CATEGORY_HINTS = [
    (("fuel", "petrol", "gas station", "shell", "diesel", "charging"), "fuel"),
    (("supply", "supplies", "builder", "merchant", "hardware", "timber",
      "parts", "wholesale"), "materials"),
    (("insurance", "liability", "indemnity"), "insurance"),
    (("rent", "lease", "storage", "unit "), "premises"),
    (("phone", "mobile", "broadband", "internet", "hosting", "software",
      "subscription", "saas"), "software"),
    (("licence", "license", "registration", "board", "council", "permit"), "compliance"),
    (("tool", "grainger", "equipment", "hire"), "tools"),
    (("bank", "charge", "fee", "interest"), "fees"),
    (("advert", "ads", "marketing", "print"), "marketing"),
]

TRANSFER_HINTS = ("transfer to savings", "own account", "internal transfer",
                  "owner draw", "drawings")


# ---------------------------------------------------------------- reading

def _headers(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.reader(fh)
        for row in reader:
            if any((c or "").strip() for c in row):
                return [(c or "").strip() for c in row]
    return []


def _map_columns(headers):
    """Work out which column plays which role. Returns {role: header}."""
    lower = {h.lower().strip(): h for h in headers}
    found = {}
    for role, names in PROFILE.items():
        for want in names:
            if want in lower:
                found[role] = lower[want]
                break
    return found


def _rows(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def _cents(row, cols):
    """Signed cents for one line. Negative is money out."""
    if "debit" in cols or "credit" in cols:
        out = D.cents(row.get(cols.get("debit"), "")) if "debit" in cols else 0
        inn = D.cents(row.get(cols.get("credit"), "")) if "credit" in cols else 0
        return inn - abs(out)
    return D.cents(row.get(cols.get("amount"), ""))


def _clean(text):
    """Strip the noise banks staple onto a payee."""
    s = " ".join(str(text or "").split())
    for junk in ("CARD PURCHASE ", "POS ", "DEBIT CARD ", "PAYMENT TO ",
                 "DIRECT DEBIT ", "SEPA ", "BACS ", "FASTER PAYMENT "):
        if s.upper().startswith(junk):
            s = s[len(junk):]
    return s.strip(" -*")


def _category(text):
    low = " " + str(text or "").lower() + " "
    for words, cat in CATEGORY_HINTS:
        if any(w in low for w in words):
            return cat
    return "other"


# ---------------------------------------------------------------- contract

def sniff(path):
    if not path.lower().endswith(".csv"):
        return 0.0
    try:
        headers = _headers(path)
    except Exception:
        return 0.0
    if not headers:
        return 0.0
    cols = _map_columns(headers)
    low = {h.lower() for h in headers}
    # Stripe and QuickBooks exports also have dates and amounts. Stand down for
    # them rather than fighting over the file.
    if low & {"balance_transaction", "available_on", "automatic_payout_id"}:
        return 0.2
    if {"fee", "net"} <= low and ("gross" in low or "created" in low):
        return 0.2
    if low & {"transaction type", "split", "memo/description"}:
        return 0.25
    if "date" not in cols or "description" not in cols:
        return 0.0
    if "debit" in cols and "credit" in cols:
        return 0.92
    if "amount" in cols:
        return 0.88 if "balance" in cols else 0.8
    return 0.0


def pull(path, ctx):
    headers = _headers(path)
    cols = _map_columns(headers)
    if "date" not in cols or "description" not in cols:
        return []
    if "amount" not in cols and not ("debit" in cols and "credit" in cols):
        return []

    proposals = []
    seen = {}
    for raw in _rows(path):
        when = D.d(raw.get(cols["date"], ""))
        desc = _clean(raw.get(cols["description"], ""))
        amount = _cents(raw, cols)
        if not when or not desc or amount == 0:
            continue

        key = ctx["digest"](D.iso(when), desc.lower(), amount)
        seen[key] = seen.get(key, 0) + 1
        ext = "bank-csv:{}".format(key if seen[key] == 1 else "{}#{}".format(key, seen[key]))

        low = desc.lower()
        if any(h in low for h in TRANSFER_HINTS):
            proposals.append({
                "external_id": ext, "entity": "expenses", "row": {},
                "action": "ignore", "match_id": None, "confidence": 0.7,
                "why": "{} looks like your own money moving, not a cost".format(desc[:40]),
            })
            continue

        if amount < 0:
            proposals.append(_money_out(ext, when, desc, -amount, ctx))
        else:
            proposals.append(_money_in(ext, when, desc, amount, ctx))
    return proposals


def _money_out(ext, when, desc, amount, ctx):
    row = {
        "date": D.iso(when),
        "vendor": desc[:48],
        "category": _category(desc),
        "amount": D.plain(amount),
        "project_id": "",
        "billable": "no",
        "method": "card",
        "receipt": "no",
        "notes": "bank line: {}".format(desc[:60]),
    }
    existing, conf = ctx["find_existing"]("expenses", row)
    if existing:
        return {
            "external_id": ext, "entity": "expenses", "row": {},
            "action": "match", "match_id": existing, "confidence": conf,
            "why": "{} for {} is already recorded as {}".format(
                desc[:32], D.plain(amount), existing),
        }
    return {
        "external_id": ext, "entity": "expenses", "row": row,
        "action": "create", "match_id": None, "confidence": 0.8,
        "why": "money out on {} to {}, filed as {}".format(
            D.iso(when), desc[:32], row["category"]),
    }


def _money_in(ext, when, desc, amount, ctx):
    import adapters as A
    inv, conf = A.match_open_invoice(amount, when, desc)
    if inv:
        return {
            "external_id": ext, "entity": "invoices", "row": {},
            "action": "match", "match_id": inv["id"], "confidence": conf,
            "why": "{} in on {} equals unpaid invoice {}".format(
                D.plain(amount), D.iso(when), inv.get("number") or inv["id"]),
        }
    return {
        "external_id": ext, "entity": "invoices", "row": {},
        "action": "ignore", "match_id": None, "confidence": 0.6,
        "why": "{} in from {} matches no unpaid invoice, so it is yours to explain".format(
            D.plain(amount), desc[:32]),
    }
