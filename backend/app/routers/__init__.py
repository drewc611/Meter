"""HTTP routers, split by concern. main.create_app() mounts all six."""

from . import admin, auth, dashboard, health, ingestion, waitlist

__all__ = ["admin", "auth", "dashboard", "health", "ingestion", "waitlist"]
