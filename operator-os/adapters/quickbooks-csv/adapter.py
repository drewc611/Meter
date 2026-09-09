"""
QuickBooks general ledger or expense export.

QuickBooks exports carry a transaction type, which is more than a bank gives
you, so this adapter uses it rather than guessing from the sign. Expenses,
bills, checks and card charges become proposed expenses. Invoices, payments and
sales receipts are left alone, because your invoices already live in
invoices.csv and importing them again would double your revenue.

Category comes from the account or split column, mapped onto the plain words the
expense registry already uses. Anything unrecognised is filed as other, which is
honest and easy to fix in one place later.

External id is the transaction number when the export has one. When it does not,
it is a digest of the date, the payee and the amount.
"""

import csv
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "lib")
if LIB not in sys.path:
    sys.path.insert(0, LIB)

import osdata as D  # noqa: E402

ADAPTER = {
    "name": "quickbooks-csv",
    "title": "QuickBooks general ledger or expense export",
    "reads": ["expenses"],
    "writes": [],
    "needs": "a CSV export of an expense or general ledger report from QuickBooks",
    "network": False,
}

ROLES = {
    "date": ["date", "transaction_date", "txn_date"],
    "type": ["transaction_type", "type", "txn_type"],
    "num": ["num", "no", "number", "ref_no", "doc_num"],
    "name": ["name", "vendor", "payee", "customer", "supplier"],
    "memo": ["memo_description", "memo", "description", "notes"],
    "account": ["account", "account_full_name", "category"],
    "split": ["split", "split_account"],
    "amount": ["amount", "amount_line"],
    "debit": ["debit"],
    "credit": ["credit"],
}

COST_TYPES = ("expense", "bill", "check", "cheque", "credit card charge",
              "credit card expense", "cash purchase", "bill payment",
              "bill payment (check)", "vendor credit", "journal entry",
              "purchase order")
INCOME_TYPES = ("invoice", "payment", "sales receipt", "deposit", "credit memo",
                "estimate", "refund receipt")

ACCOUNT_HINTS = [
    (("fuel", "vehicle", "auto", "mileage", "travel"), "fuel"),
    (("material", "job supplies", "cost of goods", "cogs", "subcontract"), "materials"),
    (("insurance",), "insurance"),
    (("rent", "premises", "utilities", "storage"), "premises"),
    (("software", "telephone", "phone", "internet", "dues", "subscription"), "software"),
    (("licence", "license", "permit", "legal", "professional"), "compliance"),
    (("tools", "equipment", "small tools"), "tools"),
    (("bank", "merchant", "processing", "fees"), "fees"),
    (("advertis", "marketing", "promotion"), "marketing"),
    (("meals", "entertainment", "office"), "other"),
]


def _norm(h):
    h = re.sub(r"\(.*?\)", " ", str(h or "").lower())
    return re.sub(r"[^a-z0-9]+", "_", h).strip("_")


def _header_row(path):
    """QuickBooks puts a title and a date range above the real header."""
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        for i, row in enumerate(csv.reader(fh)):
            cells = [(c or "").strip() for c in row]
            filled = [c for c in cells if c]
            if len(filled) >= 3 and any(_norm(c) in ("date", "transaction_date")
                                        for c in cells):
                return i, cells
            if i > 8:
                break
    return None, []


def _map_columns(headers):
    lower = {_norm(h): h for h in headers if h}
    found = {}
    for role, names in ROLES.items():
        for want in names:
            if want in lower:
                found[role] = lower[want]
                break
    return found


def _rows(path):
    skip, headers = _header_row(path)
    if skip is None:
        return [], {}
    out = []
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.reader(fh)
        for i, row in enumerate(reader):
            if i <= skip:
                continue
            cells = [(c or "").strip() for c in row]
            if not any(cells):
                continue
            out.append({h: (cells[j] if j < len(cells) else "")
                        for j, h in enumerate(headers)})
    return out, _map_columns(headers)


def _category(text):
    low = " " + str(text or "").lower() + " "
    for words, cat in ACCOUNT_HINTS:
        if any(w in low for w in words):
            return cat
    return "other"


def sniff(path):
    if not path.lower().endswith(".csv"):
        return 0.0
    try:
        _skip, headers = _header_row(path)
    except Exception:
        return 0.0
    if not headers:
        return 0.0
    low = {_norm(h) for h in headers if h}
    if "transaction_type" in low and "split" in low:
        return 0.94
    if "transaction_type" in low:
        return 0.9
    if "split" in low or "memo_description" in low:
        return 0.86
    return 0.0


def pull(path, ctx):
    rows, cols = _rows(path)
    if not rows or "date" not in cols:
        return []
    proposals = []
    for raw in rows:
        when = D.d(raw.get(cols["date"], ""))
        if not when:
            continue
        kind = (raw.get(cols.get("type"), "") or "").strip().lower()
        name = " ".join(str(raw.get(cols.get("name"), "") or "").split())
        memo = " ".join(str(raw.get(cols.get("memo"), "") or "").split())
        account = raw.get(cols.get("account"), "") or raw.get(cols.get("split"), "") or ""
        if "amount" in cols:
            amount = D.cents(raw.get(cols["amount"], ""))
        else:
            debit = D.cents(raw.get(cols.get("debit"), "")) if "debit" in cols else 0
            credit = D.cents(raw.get(cols.get("credit"), "")) if "credit" in cols else 0
            amount = credit - debit
        if amount == 0:
            continue

        num = (raw.get(cols.get("num"), "") or "").strip()
        ext = "quickbooks-csv:{}".format(
            num or ctx["digest"](D.iso(when), name.lower(), amount, memo.lower()))

        if kind in INCOME_TYPES:
            proposals.append({
                "external_id": ext, "entity": "expenses", "row": {},
                "action": "ignore", "match_id": None, "confidence": 0.85,
                "why": "{} for {} is money in, and your invoices already hold that".format(
                    kind or "this line", name[:28] or "a customer"),
            })
            continue
        if kind and kind not in COST_TYPES and amount > 0:
            proposals.append({
                "external_id": ext, "entity": "expenses", "row": {},
                "action": "ignore", "match_id": None, "confidence": 0.6,
                "why": "transaction type '{}' is not a cost this adapter knows".format(kind),
            })
            continue

        cost = abs(amount)
        row = {
            "date": D.iso(when),
            "vendor": (name or memo or account or "unknown")[:48],
            "category": _category("{} {}".format(account, memo)),
            "amount": D.plain(cost),
            "project_id": "",
            "billable": "no",
            "method": "card" if "credit card" in kind else "transfer",
            "receipt": "no",
            "notes": " ".join(x for x in (memo[:60], account[:30]) if x),
        }
        existing, conf = ctx["find_existing"]("expenses", row)
        if existing:
            proposals.append({
                "external_id": ext, "entity": "expenses", "row": {},
                "action": "match", "match_id": existing, "confidence": conf,
                "why": "{} for {} is already recorded as {}".format(
                    row["vendor"][:28], D.plain(cost), existing),
            })
        else:
            proposals.append({
                "external_id": ext, "entity": "expenses", "row": row,
                "action": "create", "match_id": None, "confidence": 0.85,
                "why": "{} on {} to {}, account {}".format(
                    kind or "cost", D.iso(when), row["vendor"][:28],
                    (account or "unstated")[:24]),
            })
    return proposals
