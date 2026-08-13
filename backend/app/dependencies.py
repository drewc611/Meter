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
    (proxies, webhooks, personal.py). Reads MERIT_API_KEY live from the
    environment, so a rotated Fly secret takes effect without a redeploy.
    Unset means no auth is enforced -- fine for local dev, must be set
    before this handles real data.
    """
    expected = os.environ.get("MERIT_API_KEY")
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> models.DashboardUser | None:
    """Per-user login gate for /api/* and /admin/* -- a JWT from
    /auth/login, /auth/signup, or the Google callback. Same unset-secret
    convention as require_api_key: MERIT_JWT_SECRET unset means login is
    off and this returns None; once set, a bad/missing/expired token is 401.
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


def require_admin(
    user: models.DashboardUser | None = Depends(get_current_user),
) -> models.DashboardUser | None:
    """Admin-only gate for /admin/*, layered on get_current_user. A None
    user (login off) passes through unchanged; a logged-in non-admin gets
    403 instead of silent access to identity-mapping/recompute-scores.
    """
    if user is None:
        return None
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
