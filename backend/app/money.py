"""Dollar amounts cross two different integer representations, depending on
whether they're a single event or an already-summed aggregate.

Per-event costs (usage_events.cost_usd_micros, unmapped_identity_events.
cost_usd_micros) are stored as integer millionths of a dollar, not cents.
A single LLM completion is routinely worth a fraction of a cent -- a
Haiku-class call is commonly around $0.0003 -- and rounding each event to
the nearest whole cent at write time floors every one of those to zero
before a SUM() ever sees them, which is a much worse failure than the
float-summation drift integer cents originally fixed. Micros give six
decimal places, comfortably below any real per-token price, and are summed
exactly in SQL or Python for the same reason integer cents were exact.

Aggregates (person_scores.spend_usd_cents) stay in cents. Once many events
have already been summed into a multi-dollar total, rounding that total to
the nearest cent loses nothing anyone would notice -- the precision that
matters is on the write path, not the read path.
"""

from decimal import ROUND_HALF_UP, Decimal


def usd_to_micros(usd: float) -> int:
    return int(Decimal(str(usd)).scaleb(6).to_integral_value(rounding=ROUND_HALF_UP))


def micros_to_usd(micros: int) -> float:
    return micros / 1_000_000


def micros_to_cents(micros: int) -> int:
    """Round an already-summed micros total to the nearest cent -- the one
    place a period's aggregate spend becomes the cents figure PersonScore
    stores. Never call this per-event; that's the exact bug this module
    exists to avoid (see the module docstring)."""
    return int((Decimal(micros) / 10_000).to_integral_value(rounding=ROUND_HALF_UP))


def usd_to_cents(usd: float) -> int:
    return int(Decimal(str(usd)).scaleb(2).to_integral_value(rounding=ROUND_HALF_UP))


def cents_to_usd(cents: int) -> float:
    return cents / 100
