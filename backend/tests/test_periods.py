from datetime import datetime

from app.periods import current_period, prior_period


def test_current_period_is_calendar_month():
    start, end = current_period(datetime(2026, 8, 14, 9, 30))
    assert start == datetime(2026, 8, 1)
    assert end == datetime(2026, 9, 1)


def test_current_period_rolls_over_year_in_december():
    start, end = current_period(datetime(2026, 12, 31, 23, 59))
    assert start == datetime(2026, 12, 1)
    assert end == datetime(2027, 1, 1)


def test_prior_period_is_previous_month():
    start, _ = current_period(datetime(2026, 8, 14))
    prior_start, prior_end = prior_period(start)
    assert prior_start == datetime(2026, 7, 1)
    assert prior_end == start  # prior ends exactly where current begins


def test_prior_period_rolls_back_across_year():
    prior_start, prior_end = prior_period(datetime(2026, 1, 1))
    assert prior_start == datetime(2025, 12, 1)
    assert prior_end == datetime(2026, 1, 1)


def test_current_period_defaults_to_now():
    # Just assert it returns a well-formed month with no argument.
    start, end = current_period()
    assert start.day == 1 and start.hour == 0
    assert end > start
