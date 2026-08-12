"""FastAPI dependencies. Kept separate from database.py so the wiring
(request-scoped sessions) is decoupled from the engine/session factory."""

import os
from collections.abc import Iterator

import jwt as pyjwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal
from .services import auth as auth_service


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    """Bearer-token gate for /ingest/* -- a service token for machines
    (proxies, webhooks, personal.py), not a human login. See
    get_current_user below for /api/* and /admin/*, which humans use.

    Reads MERIT_API_KEY live from the environment rather than caching it on
    Settings, so a rotated Fly secret takes effect on restart without a code
    change, and tests can toggle it per-test with monkeypatch.setenv. Unset
    (the local-dev/docker-compose/test default) means no auth is enforced --
    the same wide-open behavior this app has always had locally; set it in
    production to actually gate access.
    """
    expected = os.environ.get("MERIT_API_KEY")
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> models.DashboardUser | None:
    """Per-user login gate for /api/* and /admin/* -- a JWT issued by
    /auth/login, /auth/signup, or the Google OAuth callback (see
    services/auth.py and routers/auth.py), not the old shared MERIT_API_KEY.

    Unset MERIT_JWT_SECRET (local dev/docker-compose/test default) means
    login is off and this returns None without checking anything -- the
    same "unset = open" convention require_api_key already uses. Once it's
    set, a missing/invalid/expired token is a 401.
    """
    if not os.environ.get("MERIT_JWT_SECRET"):
        return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        claims = auth_service.decode_token(token)
    except pyjwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}") from e
    user = db.query(models.DashboardUser).filter_by(id=int(claims["sub"])).one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return user
