"""Login endpoints: password signup/login, Google OAuth, and /auth/me.

Deliberately NOT gated by require_api_key or get_current_user at the router
level (see main.py) -- an anonymous visitor logging in has no token yet by
definition. /auth/me is the one exception, gated per-endpoint below since it
needs an authenticated user to answer "who am I."
"""

import os
import secrets

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
        is_admin=user.is_admin,
        org_id=user.org_id,
        org_name=user.org.name,
    )


def _frontend_url() -> str:
    return os.environ.get("MERIT_FRONTEND_URL", "http://localhost:8080")


def _check_signup_code(provided: str | None) -> None:
    expected = os.environ.get("MERIT_SIGNUP_CODE")
    # compare_digest, not != -- a plain string compare short-circuits on the
    # first differing byte, which leaks the code one character at a time to
    # anyone timing the responses. Compared as bytes since compare_digest
    # rejects non-ASCII str.
    if expected and not (provided and secrets.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing signup code")


def _provision_org_for_signup(db: Session, name: str, email: str) -> tuple[models.Organization, bool]:
    """Resolves which Organization a brand-new signup lands in. Returns
    (org, is_personal) -- is_personal says whether this signup should also
    get a default Team+Identity of their own (right for an individual
    self-signing up with nothing else provisioned yet; wrong for a company
    account, where Identity rows come from SCIM/admin mapping instead and
    auto-creating one here would just be a stray row).

    MERIT_SIGNUP_CODE set -> this deployment is gated to one company
    (checked in _check_signup_code before this is ever called), so every
    signup joins the single existing org for it, creating it on the very
    first one -- the same "first signup is admin, MERIT_ADMIN_EMAILS after
    that" bootstrap this always had, just now scoped to that org's own
    user count instead of the whole dashboard_users table.
    MERIT_SIGNUP_CODE unset -> the public, free-personal-use posture: every
    signup gets a brand-new isolated Organization of their own.
    """
    if os.environ.get("MERIT_SIGNUP_CODE"):
        org = db.query(models.Organization).order_by(models.Organization.id).first()
        if org is None:
            org = models.Organization(name="Shared Organization", plan="company")
            db.add(org)
            db.flush()
        return org, False
    org = models.Organization(name=f"{name}'s Merit AC", plan="personal")
    db.add(org)
    db.flush()
    return org, True


def _should_be_admin(db: Session, org: models.Organization, email: str) -> bool:
    """The first DashboardUser in an org is always its admin -- an
    individual always lands in a brand-new org, so this is always True for
    them. For a MERIT_SIGNUP_CODE-gated shared org, only that first signup
    (or an email in MERIT_ADMIN_EMAILS after that, read live like
    MERIT_SIGNUP_CODE above) gets it -- there's no UI to promote someone
    later, that's a direct DB edit for now."""
    if db.query(models.DashboardUser).filter_by(org_id=org.id).count() == 0:
        return True
    admin_emails = {e.strip().lower() for e in os.environ.get("MERIT_ADMIN_EMAILS", "").split(",") if e.strip()}
    return email.strip().lower() in admin_emails


def _provision_default_identity(db: Session, org: models.Organization, name: str, email: str) -> None:
    """Gives a fresh individual signup an Identity AND a "manual" source
    mapping keyed on their own email, so POST /ingest/usage with
    source_system="manual", external_id=<their email> works immediately --
    no separate /admin/identity-mapping step, same convention personal.py's
    log-usage command already uses."""
    team = models.Team(org_id=org.id, name="Personal")
    db.add(team)
    db.flush()
    ident = models.Identity(org_id=org.id, full_name=name, email=email, role="Individual", team_id=team.id)
    db.add(ident)
    db.flush()
    db.add(models.IdentityMapping(org_id=org.id, identity_id=ident.id, source_system="manual", external_id=email))


@router.post("/signup", status_code=201, response_model=schemas.TokenOut)
def signup(body: schemas.SignupIn, db: Session = Depends(get_db)):
    _check_signup_code(body.signup_code)
    if db.query(models.DashboardUser).filter_by(email=body.email).one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists")
    org, is_personal = _provision_org_for_signup(db, body.name, body.email)
    user = models.DashboardUser(
        org_id=org.id,
        email=body.email,
        name=body.name,
        password_hash=auth_service.hash_password(body.password),
        is_admin=_should_be_admin(db, org, body.email),
    )
    db.add(user)
    if is_personal:
        _provision_default_identity(db, org, body.name, body.email)
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
                name = claims.get("name", claims["email"])
                org, is_personal = _provision_org_for_signup(db, name, claims["email"])
                user = models.DashboardUser(
                    org_id=org.id,
                    email=claims["email"],
                    name=name,
                    is_admin=_should_be_admin(db, org, claims["email"]),
                )
                db.add(user)
                if is_personal:
                    _provision_default_identity(db, org, name, claims["email"])
            user.google_sub = claims["sub"]  # link (new account) or backfill (existing password account)
            db.commit()
            db.refresh(user)
        token = auth_service.issue_token(user)
    except (auth_service.AuthError, HTTPException) as e:
        detail = e.detail if isinstance(e, HTTPException) else str(e)
        return RedirectResponse(f"{_frontend_url()}/app?auth_error={detail}")
    return RedirectResponse(f"{_frontend_url()}/app?token={token}")


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.DashboardUser | None = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")
    return _user_out(user)
