"""Login endpoints: password signup/login, Google OAuth, and /auth/me.

Deliberately NOT gated by require_api_key or get_current_user at the router
level (see main.py) -- an anonymous visitor logging in has no token yet by
definition. /auth/me is the one exception, gated per-endpoint below since it
needs an authenticated user to answer "who am I."
"""

import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_current_user, get_db
from ..services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: models.DashboardUser) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        has_password=bool(user.password_hash),
        has_google=bool(user.google_sub),
    )


def _frontend_url() -> str:
    return os.environ.get("MERIT_FRONTEND_URL", "http://localhost:8080")


def _check_signup_code(provided: str | None) -> None:
    expected = os.environ.get("MERIT_SIGNUP_CODE")
    if expected and provided != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing signup code")


@router.post("/signup", status_code=201, response_model=schemas.TokenOut)
def signup(body: schemas.SignupIn, db: Session = Depends(get_db)):
    _check_signup_code(body.signup_code)
    if db.query(models.DashboardUser).filter_by(email=body.email).one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists")
    user = models.DashboardUser(
        email=body.email, name=body.name, password_hash=auth_service.hash_password(body.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    try:
        token = auth_service.issue_token(user)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return schemas.TokenOut(access_token=token, user=_user_out(user))


@router.post("/login", response_model=schemas.TokenOut)
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.DashboardUser).filter_by(email=body.email).one_or_none()
    if user is None or not user.password_hash or not auth_service.verify_password(body.password, user.password_hash):
        # Same message either way -- confirming "that email exists" to a
        # guesser is its own small leak.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    try:
        token = auth_service.issue_token(user)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return schemas.TokenOut(access_token=token, user=_user_out(user))


@router.get("/google/login")
def google_login(invite: str | None = None):
    """Redirects to Google's consent screen. `invite`, if this deployment
    requires MERIT_SIGNUP_CODE, is carried through Google's `state`
    round-trip and checked in the callback below -- only matters for a
    *new* account; an existing user's Google login never needs it."""
    try:
        url = auth_service.google_authorize_url(state=invite or "-")
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str, state: str = "-", db: Session = Depends(get_db)):
    """Exchanges Google's code, finds-or-creates the DashboardUser, and
    redirects back to the frontend with our own token attached -- a browser
    redirect flow, so errors go back as a query param the frontend can
    show, not a raw API error the user would never see."""
    try:
        claims = auth_service.google_exchange_code(code)
        user = db.query(models.DashboardUser).filter_by(google_sub=claims["sub"]).one_or_none()
        if user is None:
            user = db.query(models.DashboardUser).filter_by(email=claims["email"]).one_or_none()
            if user is None:
                _check_signup_code(None if state == "-" else state)
                user = models.DashboardUser(email=claims["email"], name=claims.get("name", claims["email"]))
                db.add(user)
            user.google_sub = claims["sub"]  # link (new account) or backfill (existing password account)
            db.commit()
            db.refresh(user)
        token = auth_service.issue_token(user)
    except (auth_service.AuthError, HTTPException) as e:
        detail = e.detail if isinstance(e, HTTPException) else str(e)
        return RedirectResponse(f"{_frontend_url()}/?auth_error={detail}")
    return RedirectResponse(f"{_frontend_url()}/?token={token}")


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.DashboardUser | None = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")
    return _user_out(user)
