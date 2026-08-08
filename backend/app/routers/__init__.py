"""HTTP routers, split by concern: ingestion, admin, dashboard (read API),
and health. main.create_app() mounts all four."""

from . import admin, dashboard, health, ingestion

__all__ = ["admin", "dashboard", "health", "ingestion"]
