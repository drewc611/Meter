"""
PayPal activity export.

Same shape as Stripe's export, and the same reasoning applies: PayPal reports
the gross a customer paid and the fee it kept as two different facts. The fee
is a cost, so it becomes an expense. The gross is a customer paying you, so it
becomes a match against the unpaid invoice with the same total, and you mark
that invoice paid yourself.

Internal money movement -- a withdrawal to your bank, adding funds from your
bank, a currency conversion -- is skipped on purpose. Your bank export already
has the withdrawal side of that story, and importing both would count the same
money twice.

PayPal gives every transaction a stable id, so that id is the external id, with
a suffix saying which half of the row it refers to.
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
    "name": "paypal-csv",
    "title": "PayPal activity",
    "reads": ["expenses", "invoices"],
    "writes": [],
    "needs": "an activity/transaction CSV exported from a PayPal business account",
    "network": False,
}

ROLES = {
    "id": ["transaction id", "transaction_id", "txn id"],
    "type": ["type"],
    "gross": ["gross"],
    "fee": ["fee"],
    "net": ["net"],
    "created": ["date"],
    "from_email": ["from email address"],
    "to_email": ["to email address"],
    "description": ["name", "item title"],
}

# PayPal's own vocabulary for money that came in as a real sale.
IN_TYPES = ("express checkout payment", "payment received", "website payment",
            "subscription payment", "mass pay payment", "invoice payment")

# Internal transfers, already visible in a bank export or not revenue at all.
SKIP_TYPES = ("general withdrawal", "bank deposit to pp account",
              "add funds from a bank account", "transfer to bank account",
              "currency conversion", "hold on balance for open dispute")


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
    # Stand down for another platform's export that happens to share gross/fee/net.
    if low & {"balance transaction id", "automatic payout id", "transaction type", "split"}:
        return 0.1
    has_emails = {"from email address", "to email address"} <= low
    has_money = {"gross", "fee", "net"} <= low
    if has_emails and has_money:
        return 0.95
    if has_money and "transaction id" in low:
        return 0.5
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
                "external_id": "paypal-csv:{}".format(txn),
                "entity": "expenses", "row": {}, "action": "ignore",
                "match_id": None, "confidence": 0.9,
                "why": "{} is money moving inside/around PayPal, not a sale or a cost".format(
                    kind or "this line"),
            })
            continue

        if fee > 0:
            ext = "paypal-csv:{}:fee".format(txn)
            row = {
                "date": D.iso(when),
                "vendor": "PayPal",
                "category": "fees",
                "amount": D.plain(fee),
                "project_id": "",
                "billable": "no",
                "method": "paypal",
                "receipt": "no",
                "notes": "PayPal fee on {}".format((desc or txn)[:48]),
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
                    "why": "PayPal kept {} in fees on {}".format(D.plain(fee), D.iso(when)),
                })

        if kind in IN_TYPES and gross > 0:
            ext = "paypal-csv:{}:gross".format(txn)
            inv, conf = A.match_open_invoice(gross, when, desc)
            if inv:
                proposals.append({
                    "external_id": ext, "entity": "invoices", "row": {},
                    "action": "match", "match_id": inv["id"], "confidence": conf,
                    "why": "{} received on {} equals unpaid invoice {}".format(
                        D.plain(gross), D.iso(when), inv.get("number") or inv["id"]),
                })
            else:
                proposals.append({
                    "external_id": ext, "entity": "invoices", "row": {},
                    "action": "ignore", "match_id": None, "confidence": 0.6,
                    "why": "{} received on {} matches no unpaid invoice total".format(
                        D.plain(gross), D.iso(when)),
                })
    return proposals
