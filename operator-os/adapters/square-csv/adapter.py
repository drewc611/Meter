"""
Square transactions export.

Same gross/fee split as the Stripe and PayPal adapters, with Square's own
column names and its own vocabulary for what a row actually is. A "Payment"
with money in becomes a match against the unpaid invoice with the same total;
the fee Square kept on that payment becomes an expense. A "Deposit" is Square
moving money to your bank, already visible in your bank export, so it is
skipped rather than counted twice. A "Refund" is left alone -- reversing a
sale correctly needs the original sale in front of you, not a guess.

Square gives every transaction a stable id, so that id is the external id,
with a suffix saying which half of the row it refers to.
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
    "name": "square-csv",
    "title": "Square transactions",
    "reads": ["expenses", "invoices"],
    "writes": [],
    "needs": "a transactions CSV exported from the Square dashboard",
    "network": False,
}

ROLES = {
    "id": ["transaction id", "payment id"],
    "type": ["event type"],
    "gross": ["gross sales", "total collected"],
    "fee": ["fees", "fee"],
    "net": ["net total", "net sales"],
    "created": ["date"],
    "description": ["description"],
}

SKIP_TYPES = ("deposit", "payout", "adjustment")
IN_TYPES = ("payment",)


def _norm(h):
    return re.sub(r"[^a-z0-9]+", " ", str(h or "").lower()).strip()


def _headers(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        for row in csv.reader(fh):
            if any((c or "").strip() for c in row):
                return [(c or "").strip() for c in row]
    return []


def _map_columns(headers):
    lower = {_norm(h): h for h in headers}
    found = {}
    for role, names in ROLES.items():
        for want in names:
            if want in lower:
                found[role] = lower[want]
                break
    return found


def sniff(path):
    if not path.lower().endswith(".csv"):
        return 0.0
    try:
        headers = _headers(path)
    except Exception:
        return 0.0
    low = {_norm(h) for h in headers}
    if not low:
        return 0.0
    # Stand down for another platform's export.
    if low & {"balance transaction id", "from email address", "to email address",
              "transaction type", "split"}:
        return 0.1
    square_markers = bool(low & {"pan suffix", "card brand", "gross sales"})
    has_money = bool(low & {"gross sales", "net total"}) and bool(low & {"fees", "fee"})
    if square_markers and has_money:
        return 0.93
    if has_money and "transaction id" in low:
        return 0.45
    return 0.0


def pull(path, ctx):
    import adapters as A
    headers = _headers(path)
    cols = _map_columns(headers)
    if "fee" not in cols or "gross" not in cols:
        return []

    proposals = []
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))

    for raw in rows:
        kind = (raw.get(cols.get("type"), "") or "").strip().lower()
        when = D.d(raw.get(cols.get("created"), ""))
        gross = D.cents(raw.get(cols["gross"], ""))
        fee = abs(D.cents(raw.get(cols["fee"], "")))
        desc = " ".join(str(raw.get(cols.get("description"), "") or "").split())
        txn = (raw.get(cols.get("id"), "") or "").strip() or \
            ctx["digest"](D.iso(when), kind, gross, fee, desc)
        if not when:
            continue

        if kind in SKIP_TYPES:
            proposals.append({
                "external_id": "square-csv:{}".format(txn),
                "entity": "expenses", "row": {}, "action": "ignore",
                "match_id": None, "confidence": 0.9,
                "why": "{} moves money to your bank, your bank export already has it".format(
                    kind or "this line"),
            })
            continue

        if kind not in IN_TYPES:
            continue

        if fee > 0:
            ext = "square-csv:{}:fee".format(txn)
            row = {
                "date": D.iso(when),
                "vendor": "Square",
                "category": "fees",
                "amount": D.plain(fee),
                "project_id": "",
                "billable": "no",
                "method": "card",
                "receipt": "no",
                "notes": "Square fee on {}".format((desc or txn)[:48]),
            }
            existing, conf = ctx["find_existing"]("expenses", row)
            if existing:
                proposals.append({
                    "external_id": ext, "entity": "expenses", "row": {},
                    "action": "match", "match_id": existing, "confidence": conf,
                    "why": "this fee is already recorded as {}".format(existing),
                })
            else:
                proposals.append({
                    "external_id": ext, "entity": "expenses", "row": row,
                    "action": "create", "match_id": None, "confidence": 0.9,
                    "why": "Square kept {} in fees on {}".format(D.plain(fee), D.iso(when)),
                })

        if gross > 0:
            ext = "square-csv:{}:gross".format(txn)
            inv, conf = A.match_open_invoice(gross, when, desc)
            if inv:
                proposals.append({
                    "external_id": ext, "entity": "invoices", "row": {},
                    "action": "match", "match_id": inv["id"], "confidence": conf,
                    "why": "{} taken on {} equals unpaid invoice {}".format(
                        D.plain(gross), D.iso(when), inv.get("number") or inv["id"]),
                })
            else:
                proposals.append({
                    "external_id": ext, "entity": "invoices", "row": {},
                    "action": "ignore", "match_id": None, "confidence": 0.6,
                    "why": "{} taken on {} matches no unpaid invoice total".format(
                        D.plain(gross), D.iso(when)),
                })
    return proposals
