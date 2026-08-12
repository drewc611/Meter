"""
Merit API — the FastAPI application factory. Wires the six routers
(auth, ingestion, admin, dashboard, health, waitlist) onto an app, with CORS
from config. Run with:

    uvicorn app.main:app --reload --port 8000

CORS defaults to wide-open for the local demo (the dashboard is often served
from a file:// origin); set MERIT_CORS_ORIGINS to your real frontend origin(s)
before this ever sees real customer data. See config.py.
"""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .dependencies import get_current_user, require_api_key
from .routers import admin, auth, dashboard, health, ingestion, waitlist


def create_app() -> FastAPI:
    init_db()

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
    app.include_router(admin.router, dependencies=[Depends(get_current_user)])
    app.include_router(dashboard.router, dependencies=[Depends(get_current_user)])
    app.include_router(health.router)
    # Deliberately ungated -- an anonymous visitor logging in or joining the
    # waitlist has no token yet by definition.
    app.include_router(auth.router)
    app.include_router(waitlist.router)
    return app


app = create_app()
