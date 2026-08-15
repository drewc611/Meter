from datetime import datetime

from app.periods import current_period, period_n_months_ago, prior_period, recent_periods


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


# ------------------------------------------------------------ recent_periods


def test_recent_periods_returns_n_oldest_first():
    periods = recent_periods(3, datetime(2026, 8, 1))
    assert periods == [
        (datetime(2026, 6, 1), datetime(2026, 7, 1)),
        (datetime(2026, 7, 1), datetime(2026, 8, 1)),
        (datetime(2026, 8, 1), datetime(2026, 9, 1)),
    ]


def test_recent_periods_rolls_back_across_year():
    periods = recent_periods(2, datetime(2026, 1, 1))
    assert periods == [
        (datetime(2025, 12, 1), datetime(2026, 1, 1)),
        (datetime(2026, 1, 1), datetime(2026, 2, 1)),
    ]


def test_recent_periods_defaults_to_current_period():
    start, end = current_period()
    assert recent_periods(1) == [(start, end)]


# ------------------------------------------------------------ period_n_months_ago


def test_period_n_months_ago_zero_is_current_period():
    now = datetime(2026, 8, 14)
    assert period_n_months_ago(0, now) == current_period(now)


def test_period_n_months_ago_rolls_back_several_months():
    start, end = period_n_months_ago(3, datetime(2026, 8, 14))
    assert (start, end) == (datetime(2026, 5, 1), datetime(2026, 6, 1))


def test_period_n_months_ago_rolls_back_across_year():
    start, end = period_n_months_ago(2, datetime(2026, 1, 15))
    assert (start, end) == (datetime(2025, 11, 1), datetime(2025, 12, 1))
