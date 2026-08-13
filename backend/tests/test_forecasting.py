from app.services import forecasting


def _points(values):
    return [{"total_spend_usd": v} for v in values]


def test_too_few_periods_returns_none():
    assert forecasting.forecast_spend_ml(_points([100, 200, 300])) is None


def test_rising_trend_projects_upward():
    result = forecasting.forecast_spend_ml(_points([1000, 1100, 1250, 1400, 1550]))
    assert result is not None
    assert result["trend_direction"] == "up"
    assert result["projected_spend_usd"] > 1550
    assert result["based_on_periods"] == 5
    assert result["model"].startswith("ridge(alpha=")
    assert result["confidence_low_usd"] <= result["projected_spend_usd"] <= result["confidence_high_usd"]


def test_flat_trend_stays_flat():
    result = forecasting.forecast_spend_ml(_points([1000, 1000, 1000, 1000]))
    assert result is not None
    assert result["trend_direction"] == "flat"


def test_zero_periods_are_excluded_from_history():
    # Only 3 non-zero points once the leading zero is dropped -- not enough for the ML model.
    result = forecasting.forecast_spend_ml(_points([0, 500, 600, 700]))
    assert result is None
