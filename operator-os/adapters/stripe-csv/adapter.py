"""
Stripe payouts or balance transaction export.

Stripe reports two numbers for one event: the gross the customer paid and the
fee Stripe kept. They are different facts and they belong in different places.
The fee is a cost, so it becomes an expense. The gross is a customer paying you,
so it becomes a match against the unpaid invoice with the same total, and you
mark that invoice paid yourself.

Payouts are ignored on purpose. A payout is money moving from Stripe to your
bank, and your bank export already has that line. Importing both would count the
same money twice.

Stripe gives every balance transaction a stable id, so that id is the external
id, with a suffix saying which half of the row it refers to.
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
    "name": "stripe-csv",
    "title": "Stripe payouts or balance transactions",
    "reads": ["expenses", "invoices"],
    "writes": [],
    "needs": "a balance transaction or payout CSV from the Stripe dashboard",
    "network": False,
}

ROLES = {
    "id": ["id", "balance_transaction_id", "balance_transaction", "txn_id"],
    "type": ["type", "reporting_category"],
    "gross": ["gross", "amount", "gross_amount"],
    "fee": ["fee", "fee_amount", "stripe_fee"],
    "net": ["net", "net_amount"],
    "created": ["created", "created_utc", "created_at", "date"],
    "available": ["available_on", "available_on_utc"],
    "description": ["description", "source", "source_id", "customer_description"],
}

FEE_TYPES = ("charge", "payment", "stripe_fee", "application_fee", "adjustment")
IN_TYPES = ("charge", "payment")
SKIP_TYPES = ("payout", "transfer", "topup", "payout_cancel")


def _norm(h):
    h = re.sub(r"\(.*?\)", " ", str(h or "").lower())
    return re.sub(r"[^a-z0-9]+", "_", h).strip("_")


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
    if "balance_transaction_id" in low or "automatic_payout_id" in low:
        return 0.96
    strong = {"fee", "net"} <= low and bool(low & {"gross", "amount"})
    stripey = bool(low & {"available_on", "available_on_utc", "reporting_category"})
    if strong and stripey:
        return 0.95
    if strong and "type" in low and "created" in low:
        return 0.9
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

    for i, raw in enumerate(rows):
        kind = (raw.get(cols.get("type"), "") or "").strip().lower()
        when = D.d((raw.get(cols.get("created"), "") or "")[:10])
        gross = D.cents(raw.get(cols["gross"], ""))
        fee = abs(D.cents(raw.get(cols["fee"], "")))
        desc = " ".join(str(raw.get(cols.get("description"), "") or "").split())
        txn = (raw.get(cols.get("id"), "") or "").strip() or \
            ctx["digest"](D.iso(when), kind, gross, fee, desc)
        if not when:
            continue

        if kind in SKIP_TYPES:
            proposals.append({
                "external_id": "stripe-csv:{}".format(txn),
                "entity": "expenses", "row": {}, "action": "ignore",
                "match_id": None, "confidence": 0.9,
                "why": "payout of {} to your bank, your bank export already has it".format(
                    D.plain(abs(gross))),
            })
            continue

        if fee > 0 and kind in FEE_TYPES:
            ext = "stripe-csv:{}:fee".format(txn)
            row = {
                "date": D.iso(when),
                "vendor": "Stripe",
                "category": "fees",
                "amount": D.plain(fee),
                "project_id": "",
                "billable": "no",
                "method": "card",
                "receipt": "no",
                "notes": "Stripe fee on {}".format((desc or txn)[:48]),
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
                    "why": "Stripe kept {} in fees on {}".format(
                        D.plain(fee), D.iso(when)),
                })

        if kind in IN_TYPES and gross > 0:
            ext = "stripe-csv:{}:gross".format(txn)
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
