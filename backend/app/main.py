"""
Merit AC API — the FastAPI application factory. Wires the six routers
(auth, ingestion, admin, dashboard, health, waitlist) onto an app, with CORS
from config. Run with:

    uvicorn app.main:app --reload --port 8000

CORS defaults to wide-open for the local demo (the dashboard is often served
from a file:// origin); set MERIT_CORS_ORIGINS to your real frontend origin(s)
before this ever sees real customer data. See config.py.
"""

import logging
import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import cors_origins_from_env
from .database import init_db
from .dependencies import get_current_user, require_admin, require_api_key
from .routers import admin, auth, dashboard, health, ingestion, waitlist

logger = logging.getLogger(__name__)


def _in_production() -> bool:
    """FLY_APP_NAME is set by the Fly.io runtime itself on every real deploy
    (see fly.toml/DEPLOY.md) -- local dev, docker compose and the test suite
    never set it, so it's a reliable signal that this process is a live
    deployment rather than someone's laptop. MERIT_ENV=production is the
    explicit override for any other host."""
    return bool(os.environ.get("FLY_APP_NAME")) or os.environ.get("MERIT_ENV", "").strip().lower() == "production"


def check_startup_environment(cors_origins: list[str]) -> None:
    """Everything that has to be true about the environment before this app is
    allowed to serve traffic. Raises RuntimeError on a production deployment
    that would otherwise come up insecure, and warns rather than blocks
    everywhere else -- a laptop running `make run` with no secrets set is a
    supported way to use this, a public deployment in the same state is not.

    Nothing here ever logs a secret's value, only that it is missing or weak.
    """
    in_production = _in_production()

    # "Unset = open" is deliberate (see dependencies.py), but nothing else
    # would catch a Fly secret getting silently removed in production -- log
    # it loudly so it shows up in `fly logs` instead of failing silently.
    # /ingest/* auth is per-Organization now (see require_api_key), but
    # MERIT_API_KEY still controls whether an unauthenticated call is ever
    # accepted at all -- unset means it is, as long as at most one org exists.
    if not os.environ.get("MERIT_API_KEY"):
        logger.warning("MERIT_API_KEY is unset -- /ingest/* has no auth enforced while at most one org exists.")

    # Every tenant boundary in this app rests on this token, so a missing or
    # short one is refused outright in production rather than merely logged.
    jwt_secret = os.environ.get("MERIT_JWT_SECRET")
    if not jwt_secret:
        if in_production:
            raise RuntimeError(
                "MERIT_JWT_SECRET is unset in production -- refusing to start. Set it to a long "
                "random value (secrets.token_urlsafe(48)) before deploying."
            )
        logger.warning("MERIT_JWT_SECRET is unset -- /api/* and /admin/* have no login enforced, anyone can read data.")
    elif len(jwt_secret) < 32:
        if in_production:
            raise RuntimeError(
                "MERIT_JWT_SECRET is shorter than 32 characters in production -- refusing to start. "
                "A guessable secret lets anyone forge a session token for any user in any organization. "
                "Set it to a long random value (secrets.token_urlsafe(48))."
            )
        # Local/dev only: loud in the log, but don't block someone poking at
        # the app on their own machine with a throwaway secret.
        logger.warning(
            "MERIT_JWT_SECRET is shorter than 32 characters -- a guessable secret lets anyone forge a "
            "session token for any user in any organization. Rotate it to a long random value "
            "(secrets.token_urlsafe(48))."
        )

    # fly.toml sets MERIT_CORS_ORIGINS, but nothing made that mandatory -- and
    # config.py defaults it to "*", which on a real deployment means any page
    # on the internet can call this API with a visitor's browser. Refused for
    # the same reason as the secret above: the deployment that most needs the
    # origin list is the one where forgetting it is silent.
    if in_production and "*" in cors_origins:
        raise RuntimeError(
            "MERIT_CORS_ORIGINS is unset or '*' in production -- refusing to start. Set it to the "
            "frontend origin(s) that should be allowed to call this API, comma-separated."
        )


def create_app() -> FastAPI:
    init_db()
    cors_origins = cors_origins_from_env()
    check_startup_environment(cors_origins)

    # /openapi.json, /docs, and /redoc publish the full admin and ingest
    # endpoint surface to anyone who looks -- harmless in local dev, but on
    # a real deployment it's a map handed to an attacker for free. Set
    # MERIT_DISABLE_API_DOCS to turn them off; every route still works,
    # only the schema/UI is hidden.
    docs_disabled = os.environ.get("MERIT_DISABLE_API_DOCS", "").strip().lower() in ("1", "true", "yes")
    app = FastAPI(
        title="Merit AC API",
        version="0.1.0",
        docs_url=None if docs_disabled else "/docs",
        redoc_url=None if docs_disabled else "/redoc",
        openapi_url=None if docs_disabled else "/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # /ingest/* -- service token for machines (proxies, webhooks, personal.py).
    app.include_router(ingestion.router, dependencies=[Depends(require_api_key)])
    # /admin/* additionally requires is_admin -- these endpoints can reassign
    # whose spend/outcomes get attributed to whom, not just anyone logged in.
    app.include_router(admin.router, dependencies=[Depends(require_admin)])
    app.include_router(dashboard.router, dependencies=[Depends(get_current_user)])
    app.include_router(health.router)
    # auth/waitlist are ungated -- an anonymous visitor has no token yet.
    app.include_router(auth.router)
    app.include_router(waitlist.router)
    return app


app = create_app()
