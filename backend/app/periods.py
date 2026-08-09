"""Single source of truth for period boundaries — shared by the API and the
seed script so 'this month' means exactly the same [start, end) everywhere.
A mismatch here silently returns empty results, which is a fun bug to chase."""

from datetime import datetime, timedelta

from .time_utils import utcnow


def _month_after(start: datetime) -> datetime:
    """The first moment of the calendar month after `start` (which must be day 1, midnight)."""
    return start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)


def current_period(now: datetime | None = None) -> tuple[datetime, datetime]:
    """The [start, end) of the calendar month containing `now` (default: today)."""
    now = now or utcnow()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, _month_after(start)


def prior_period(period_start: datetime) -> tuple[datetime, datetime]:
    """The [start, end) of the month immediately before `period_start`."""
    prior_start = (period_start - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0, day=1)
    return prior_start, period_start


def recent_periods(n: int, end_period_start: datetime | None = None) -> list[tuple[datetime, datetime]]:
    """The last `n` calendar-month periods, oldest first, ending with (and
    including) the period starting at `end_period_start` (default: the
    current period). Used for trend/history views spanning multiple months."""
    start = end_period_start if end_period_start is not None else current_period()[0]
    periods = []
    for _ in range(n):
        periods.append((start, _month_after(start)))
        start, _ = prior_period(start)
    return list(reversed(periods))
