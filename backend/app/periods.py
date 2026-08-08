"""Single source of truth for period boundaries — shared by the API and the
seed script so 'this month' means exactly the same [start, end) everywhere.
A mismatch here silently returns empty results, which is a fun bug to chase."""
from datetime import datetime


def current_period(now: datetime | None = None):
    now = now or datetime.utcnow()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
    return start, end


def prior_period(period_start: datetime):
    from datetime import timedelta
    prior_start = (period_start - timedelta(days=1)).replace(day=1)
    return prior_start, period_start
