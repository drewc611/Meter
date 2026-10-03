"""
Runtime configuration, read once from the environment at import time.

Infrastructure settings only (database URL, CORS origins) — business
constants that a company tunes live in constants.py, not here.
"""

import os
from dataclasses import dataclass, field


def in_production() -> bool:
    """FLY_APP_NAME is set by the Fly.io runtime itself on every real deploy
    (see fly.toml/DEPLOY.md) -- local dev, docker compose and the test suite
    never set it, so it's a reliable signal that this process is a live
    deployment rather than someone's laptop. MERIT_ENV=production is the
    explicit override for any other host. Read live, not cached on Settings,
    for the same reason as the auth env vars below."""
    return bool(os.environ.get("FLY_APP_NAME")) or os.environ.get("MERIT_ENV", "").strip().lower() == "production"


def open_dev_allowed() -> bool:
    """MERIT_ALLOW_OPEN_DEV=1 is the one way to run /api/* and /admin/* with no
    login (MERIT_JWT_SECRET unset). Never honoured in production, whatever it is
    set to. Read live for the same reason as the auth env vars below."""
    flag = os.environ.get("MERIT_ALLOW_OPEN_DEV", "").strip().lower() in ("1", "true", "yes")
    return flag and not in_production()


# The origins the local stack serves the dashboard from: Vite dev (5173),
# `vite preview` (4173) and the nginx container in docker-compose.yml (8080).
LOCAL_CORS_ORIGINS = [f"http://{host}:{port}" for port in (5173, 4173, 8080) for host in ("localhost", "127.0.0.1")]


def cors_origins_from_env() -> list[str]:
    """Public because main.create_app() calls it directly rather than reading
    Settings.cors_origins: the startup guard there has to see the environment
    as it is at boot, not as it was at import time.

    Unset falls back to LOCAL_CORS_ORIGINS. A literal "*" is returned as-is so
    main.check_startup_environment can refuse it by name, in every environment."""
    raw = os.environ.get("MERIT_CORS_ORIGINS", "").strip()
    if not raw:
        return list(LOCAL_CORS_ORIGINS)
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    # SQLite for local/dev; point MERIT_DATABASE_URL at Postgres in production.
    # The schema is vanilla SQLAlchemy — no SQLite-only features are used.
    database_url: str = field(default_factory=lambda: os.environ.get("MERIT_DATABASE_URL", "sqlite:///./merit.db"))
    # Unset means the local dev origins, never "*". Set MERIT_CORS_ORIGINS to
    # your real frontend origin(s), comma-separated, before this serves real
    # customer data; production refuses to start without it.
    cors_origins: list[str] = field(default_factory=cors_origins_from_env)


settings = Settings()

# The auth-related env vars below (MERIT_JWT_SECRET, GOOGLE_CLIENT_ID,
# GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, MERIT_FRONTEND_URL,
# MERIT_SIGNUP_CODE) are deliberately NOT on Settings above -- Settings is
# read once at import time, but these need to be read live so a rotated Fly
# secret takes effect on restart without a code change, and so tests can
# toggle them per-test with monkeypatch.setenv (same reasoning as
# dependencies.require_api_key). See services/auth.py, routers/auth.py, and
# dependencies.get_current_user, which read os.environ.get(...) directly.
