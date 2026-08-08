"""
Meter API — the FastAPI application factory. Wires the four routers
(ingestion, admin, dashboard, health) onto an app, with CORS from config.
Run with:

    uvicorn app.main:app --reload --port 8000

CORS defaults to wide-open for the local demo (the dashboard is often served
from a file:// origin); set METER_CORS_ORIGINS to your real frontend origin(s)
before this ever sees real customer data. See config.py.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import admin, dashboard, health, ingestion


def create_app() -> FastAPI:
    init_db()

    app = FastAPI(title="Meter API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(ingestion.router)
    app.include_router(admin.router)
    app.include_router(dashboard.router)
    app.include_router(health.router)
    return app


app = create_app()
