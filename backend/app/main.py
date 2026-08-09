"""
Merit API — the FastAPI application factory. Wires the five routers
(ingestion, admin, dashboard, health, waitlist) onto an app, with CORS
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
from .dependencies import require_api_key
from .routers import admin, dashboard, health, ingestion, waitlist


def create_app() -> FastAPI:
    init_db()

    app = FastAPI(title="Merit API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Gated by MERIT_API_KEY (see dependencies.require_api_key) -- unset in
    # local/dev/docker-compose, set in production. /healthz stays open so
    # Fly's health check doesn't need the secret.
    app.include_router(ingestion.router, dependencies=[Depends(require_api_key)])
    app.include_router(admin.router, dependencies=[Depends(require_api_key)])
    app.include_router(dashboard.router, dependencies=[Depends(require_api_key)])
    app.include_router(health.router)
    # Deliberately ungated -- see routers/waitlist.py: an anonymous coming-soon
    # visitor has no bearer token, and this endpoint doesn't touch product data.
    app.include_router(waitlist.router)
    return app


app = create_app()
