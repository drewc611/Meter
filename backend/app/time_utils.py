"""
Single source of truth for "now".

Everything Meter stores and compares is naive UTC. We deliberately keep the
whole system on naive-UTC datetimes rather than timezone-aware ones for two
reasons: the SQLite `DateTime` columns store naive values, and the dashboard
parses `period_start`/`period_end` as local-time ISO strings (a trailing
`+00:00` offset would shift the displayed month for anyone west of UTC).

`datetime.utcnow()` is deprecated as of Python 3.12, so we derive naive UTC
from an explicit timezone-aware `now()` and drop the tzinfo.
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current time as a naive UTC datetime (no tzinfo), non-deprecated."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
