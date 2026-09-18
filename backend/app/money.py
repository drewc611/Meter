"""Dollar amounts are stored as integer cents (usage_events.cost_usd_cents,
person_scores.spend_usd_cents), not float dollars -- summing many small float
dollar amounts (SQLite's SUM() over a REAL column, or Python's own sum())
accumulates binary-floating-point rounding error, which is a real problem for
a product whose whole pitch is telling a company exactly what it spent.
Integer cents summed in SQL or Python are exact; these two functions are the
only place a dollar amount crosses between that internal integer-cents
representation and the float-dollars shape the /ingest/* and /api/* JSON
contracts use.
"""

from decimal import ROUND_HALF_UP, Decimal


def usd_to_cents(usd: float) -> int:
    return int(Decimal(str(usd)).scaleb(2).to_integral_value(rounding=ROUND_HALF_UP))


def cents_to_usd(cents: int) -> float:
    return cents / 100
