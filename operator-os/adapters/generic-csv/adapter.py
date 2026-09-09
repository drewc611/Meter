"""
Generic expense CSV -- the fallback for a file that matches no named platform.

Every other adapter here works by recognising a real vendor's column names.
This one works differently, because it has to: it does not know whose export
it is looking at. Instead it looks at the shape of the data itself -- a column
where almost every value parses as a date, a different column where almost
every value parses as a plain amount, and a third column that looks like free
text -- and if that shape is there, treats it as a date/amount/description
expense file.

Because the format is unknown, this adapter is deliberately narrow about what
it is willing to guess. It never proposes an invoice match (it has no way to
know if a positive number here means money in or money out in an unfamiliar
convention), and it skips any row whose amount is zero or negative rather than
guess whether a negative here means a refund, a credit, or a genuine cost --
guessing wrong would quietly pollute the books, and this adapter would rather
import less than import wrong. Every proposal it makes says plainly that it
came from an unrecognised format, so a human knows to look twice.

Its sniff score is capped low on purpose: it must never outscore a real named
adapter for a file that one of them actually recognises. It exists to catch
what falls through the cracks, not to compete for files that already have an
owner.
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
    "name": "generic-csv",
    "title": "Generic expense CSV (fallback)",
    "reads": ["expenses"],
    "writes": [],
    "needs": "any CSV with a date column, an amount column, and a description column -- "
             "used only when no named-platform adapter recognises the file",
    "network": False,
}

MAX_SCORE = 0.4  # always below every named adapter's confident score
_DATE_RE = re.compile(r"^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$")
_AMOUNT_RE = re.compile(r"^-?\(?\$?\s*\d[\d,]*(\.\d{1,2})?\)?$")


def _headers_and_rows(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh))
    rows = [r for r in rows if any((c or "").strip() for c in r)]
    if not rows:
        return [], []
    return rows[0], rows[1:]


def _looks_like_date(s):
    s = str(s or "").strip()
    return bool(s) and bool(_DATE_RE.match(s)) and D.d(s) is not None


def _looks_like_amount(s):
    s = str(s or "").strip()
    if not s:
        return False
    return bool(_AMOUNT_RE.match(s.replace(" ", "")))


def _column_fit(rows, col_index, test, min_rows=2, threshold=0.8):
    values = [r[col_index] for r in rows if col_index < len(r) and (r[col_index] or "").strip()]
    if len(values) < min_rows:
        return False
    hits = sum(1 for v in values if test(v))
    return (hits / len(values)) >= threshold


def _detect(path):
    """Best-guess (date_col, amount_col, desc_col) indexes, or None if the
    file does not look like a plain date/amount/description table."""
    headers, rows = _headers_and_rows(path)
    if len(headers) < 3 or len(rows) < 2:
        return None
    date_col = next((i for i in range(len(headers)) if _column_fit(rows, i, _looks_like_date)), None)
    if date_col is None:
        return None
    amount_col = next(
        (i for i in range(len(headers))
         if i != date_col and _column_fit(rows, i, _looks_like_amount)),
        None)
    if amount_col is None:
        return None
    desc_col = next(
        (i for i in range(len(headers))
         if i not in (date_col, amount_col)
         and _column_fit(rows, i, lambda v: bool(str(v or "").strip()), threshold=0.5)),
        None)
    if desc_col is None:
        return None
    return date_col, amount_col, desc_col, headers, rows


def _amount_cents(raw):
    s = str(raw or "").strip()
    neg = s.startswith("(") and s.endswith(")")
    return -D.cents(s) if neg else D.cents(s)


def sniff(path):
    if not path.lower().endswith(".csv"):
        return 0.0
    try:
        found = _detect(path)
    except Exception:
        return 0.0
    return MAX_SCORE if found else 0.0


def pull(path, ctx):
    found = _detect(path)
    if not found:
        return []
    date_col, amount_col, desc_col, _headers, rows = found

    proposals = []
    seen = {}
    for raw in rows:
        if len(raw) <= max(date_col, amount_col, desc_col):
            continue
        when = D.d(raw[date_col])
        amount = _amount_cents(raw[amount_col])
        desc = " ".join(str(raw[desc_col] or "").split())
        if not when or amount <= 0:
            continue

        key = ctx["digest"](D.iso(when), desc.lower(), amount)
        seen[key] = seen.get(key, 0) + 1
        ext = "generic-csv:{}".format(key if seen[key] == 1 else "{}#{}".format(key, seen[key]))

        row = {
            "date": D.iso(when),
            "vendor": (desc or "unrecognised import")[:48],
            "category": "uncategorized",
            "amount": D.plain(amount),
            "project_id": "",
            "billable": "no",
            "method": "",
            "receipt": "no",
            "notes": "generic CSV import, unrecognised format: {}".format(desc[:56]),
        }
        existing, conf = ctx["find_existing"]("expenses", row)
        if existing:
            proposals.append({
                "external_id": ext, "entity": "expenses", "row": {},
                "action": "match", "match_id": existing, "confidence": conf,
                "why": "{} for {} on {} is already recorded as {}".format(
                    desc[:32] or "this line", D.plain(amount), D.iso(when), existing),
            })
        else:
            proposals.append({
                "external_id": ext, "entity": "expenses", "row": row,
                "action": "create", "match_id": None, "confidence": 0.5,
                "why": "{} on {} from an unrecognised CSV format, filed uncategorized "
                       "for you to check".format(D.plain(amount), D.iso(when)),
            })
    return proposals
