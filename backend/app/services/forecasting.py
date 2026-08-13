"""
ML spend forecast: ridge regression over trailing period totals, with the
regularization strength picked by cross-validation instead of guessed.
Same spirit as the plain linear-trend forecast in analytics.py (small,
inspectable, no black box) but reports a confidence band and which model
it landed on. Needs one more period of history than the linear fallback
to leave enough points per CV fold — see dashboard.spend_forecast for how
the two combine.
"""

import numpy as np
from sklearn.linear_model import RidgeCV

_ALPHAS = (0.01, 0.1, 1.0, 10.0, 100.0)
_MIN_PERIODS = 4


def forecast_spend_ml(trend_points: list[dict]) -> dict | None:
    points = [(i, p["total_spend_usd"]) for i, p in enumerate(trend_points) if p["total_spend_usd"] > 0]
    if len(points) < _MIN_PERIODS:
        return None

    x = np.array([[i] for i, _ in points], dtype=float)
    y = np.array([v for _, v in points], dtype=float)

    model = RidgeCV(alphas=_ALPHAS)
    model.fit(x, y)

    next_x = float(max(i for i, _ in points) + 1)
    projected = max(0.0, float(model.predict([[next_x]])[0]))

    residuals = y - model.predict(x)
    residual_std = float(residuals.std(ddof=1)) if len(residuals) > 2 else 0.0

    slope = float(model.coef_[0])
    direction = "up" if slope > 0.01 else ("down" if slope < -0.01 else "flat")

    return {
        "projected_spend_usd": round(projected, 2),
        "trend_direction": direction,
        "based_on_periods": len(points),
        "model": f"ridge(alpha={model.alpha_:g})",
        "confidence_low_usd": round(max(0.0, projected - residual_std), 2),
        "confidence_high_usd": round(projected + residual_std, 2),
    }
