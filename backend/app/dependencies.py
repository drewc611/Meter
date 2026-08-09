"""FastAPI dependencies. Kept separate from database.py so the wiring
(request-scoped sessions) is decoupled from the engine/session factory."""

import os
from collections.abc import Iterator

from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session

from .database import SessionLocal


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    """Bearer-token gate for /ingest/*, /admin/*, and /api/* (see main.py).

    Reads MERIT_API_KEY live from the environment rather than caching it on
    Settings, so a rotated Fly secret takes effect on restart without a code
    change, and tests can toggle it per-test with monkeypatch.setenv. Unset
    (the local-dev/docker-compose/test default) means no auth is enforced --
    the same wide-open behavior this app has always had locally; set it in
    production to actually gate access. This is a single shared secret, not
    per-user auth -- see ARCHITECTURE.md's gap list for the real fix.
    """
    expected = os.environ.get("MERIT_API_KEY")
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
