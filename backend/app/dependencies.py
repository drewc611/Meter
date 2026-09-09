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


def require_api_key(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> models.Organization | None:
    """Bearer-token gate for /ingest/* -- resolves which Organization a
    caller is writing into. Each Organization has its own ingest_token
    (see GET /admin/org), replacing the single global MERIT_API_KEY secret
    every caller used to share.

    A token that matches an org's ingest_token resolves to that org. No
    header at all still works, but only when it's unambiguous:
      - MERIT_API_KEY is set (the deployment has explicitly opted into
        requiring ingest auth, same as before) -> a missing header is 401,
        exactly like today. The migrated default org's ingest_token equals
        this value, so existing integrations keep authenticating unchanged.
      - MERIT_API_KEY is unset AND at most one Organization exists -> falls
        through as that org (or None if literally none exist yet) -- the
        same local-dev/test convenience as before, since there's nothing to
        isolate from with zero or one tenant.
      - MERIT_API_KEY is unset AND two or more Organizations exist -> 401.
        This is what actually makes multi-tenancy safe by default: the
        instant a second tenant exists, an unauthenticated write becomes
        ambiguous and is rejected with no operator action required.
    """
    if authorization:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
        token = authorization.removeprefix("Bearer ")
        org = db.query(models.Organization).filter_by(ingest_token=token).one_or_none()
        if org is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
        return org

    if os.environ.get("MERIT_API_KEY"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
    orgs = db.query(models.Organization).limit(2).all()
    if len(orgs) > 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
    return orgs[0] if orgs else None


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


def require_operator(
    user: models.DashboardUser | None = Depends(get_current_user),
) -> models.DashboardUser | None:
    """Deployment-operator gate for the waitlist endpoints, layered on
    get_current_user. Deliberately stricter than require_admin: with
    MERIT_SIGNUP_CODE unset (the public free-personal-use posture) every
    signup is the sole admin of its own brand-new org, so is_admin alone
    would let any anonymous visitor self-signup and immediately read every
    waitlist lead's email -- and WaitlistSignup rows predate any
    Organization, so there's no tenant scoping to fall back on either.
    Membership in MERIT_ADMIN_EMAILS (read live, same convention as
    routers/auth.py's _should_be_admin) is the check instead. A None user
    (login off) passes through unchanged, exactly like require_admin.
    """
    if user is None:
        return None
    admin_emails = {e.strip().lower() for e in os.environ.get("MERIT_ADMIN_EMAILS", "").split(",") if e.strip()}
    if user.email.strip().lower() not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Deployment-operator access required (MERIT_ADMIN_EMAILS)"
        )
    return user


def resolve_org_id(db: Session, user: models.DashboardUser | None) -> int | None:
    """Which Organization a /api/* or /admin/* request is scoped to. A
    logged-in user's own org_id, always. With login off (get_current_user
    returned None -- MERIT_JWT_SECRET unset, the existing dev convention),
    there's no session to read an org from, so this falls back to the same
    rule require_api_key uses for its no-header case: unambiguous with zero
    or one Organization in the database, a 401 the instant a second one
    exists, since there's no longer a single obvious answer.
    """
    if user is not None:
        return user.org_id
    orgs = db.query(models.Organization).limit(2).all()
    if len(orgs) > 1:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Multiple organizations exist -- log in to continue"
        )
    return orgs[0].id if orgs else None
