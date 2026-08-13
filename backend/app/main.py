"""
Merit API — the FastAPI application factory. Wires the six routers
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

from .config import settings
from .database import init_db
from .dependencies import get_current_user, require_admin, require_api_key
from .routers import admin, auth, dashboard, health, ingestion, waitlist

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    init_db()

    # "Unset = open" is deliberate (see dependencies.py), but nothing else
    # would catch a Fly secret getting silently removed in production -- log
    # it loudly so it shows up in `fly logs` instead of failing silently.
    if not os.environ.get("MERIT_API_KEY"):
        logger.warning("MERIT_API_KEY is unset -- /ingest/* has no auth enforced, anyone can post events.")
    if not os.environ.get("MERIT_JWT_SECRET"):
        logger.warning("MERIT_JWT_SECRET is unset -- /api/* and /admin/* have no login enforced, anyone can read data.")

    app = FastAPI(title="Merit API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # /ingest/* is a service token (MERIT_API_KEY) for machines -- proxies,
    # webhooks, personal.py -- not a human login. See dependencies.py.
    app.include_router(ingestion.router, dependencies=[Depends(require_api_key)])
    # /admin/* and /api/* are human-facing, gated by a real per-user login
    # (password or Google, see routers/auth.py) once MERIT_JWT_SECRET is
    # set; unset means open, same convention as every other secret here.
    # /admin/* additionally requires is_admin (require_admin) -- it's not
    # enough to just be a logged-in dashboard viewer, since these endpoints
    # can reassign whose spend/outcomes get attributed to whom.
    app.include_router(admin.router, dependencies=[Depends(require_admin)])
    app.include_router(dashboard.router, dependencies=[Depends(get_current_user)])
    app.include_router(health.router)
    # Deliberately ungated -- an anonymous visitor logging in or joining the
    # waitlist has no token yet by definition.
    app.include_router(auth.router)
    app.include_router(waitlist.router)
    return app


app = create_app()
