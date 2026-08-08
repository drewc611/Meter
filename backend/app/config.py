"""
Runtime configuration, read once from the environment at import time.

Infrastructure settings only (database URL, CORS origins) — business
constants that a company tunes live in constants.py, not here.
"""

import os
from dataclasses import dataclass, field


def _cors_origins_from_env() -> list[str]:
    raw = os.environ.get("METER_CORS_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    # SQLite for local/dev; point METER_DATABASE_URL at Postgres in production.
    # The schema is vanilla SQLAlchemy — no SQLite-only features are used.
    database_url: str = field(default_factory=lambda: os.environ.get("METER_DATABASE_URL", "sqlite:///./meter.db"))
    # Defaults to "*" for the local demo (the dashboard is often opened from a
    # file:// origin). Lock this to your real frontend origin(s) via
    # METER_CORS_ORIGINS="https://app.example.com,https://admin.example.com"
    # before this ever serves real customer data.
    cors_origins: list[str] = field(default_factory=_cors_origins_from_env)


settings = Settings()
