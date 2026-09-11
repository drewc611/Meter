"""Login endpoints: password signup/login, Google OAuth, and /auth/me.

Deliberately NOT gated by require_api_key or get_current_user at the router
level (see main.py) -- an anonymous visitor logging in has no token yet by
definition. /auth/me is the one exception, gated per-endpoint below since it
needs an authenticated user to answer "who am I."
"""

import os
import secrets
from urllib.parse import quote

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_current_user, get_db
from ..services import auth as auth_service
from ..services import ratelimit

router = APIRouter(prefix="/auth", tags=["auth"])

# Both unauthenticated. Login is the tighter of the two because it's the one an
# attacker repeats: ten tries per five minutes leaves a real person who fat-
# fingers their password alone, and turns an offline-speed password list into
# roughly 2,900 guesses a day from one address.
_LOGIN_LIMIT = ratelimit.limit("auth-login", max_requests=10, window_seconds=300)
_SIGNUP_LIMIT = ratelimit.limit("auth-signup", max_requests=10, window_seconds=3600)


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


def _cookies_are_secure() -> bool:
    """Whether the OAuth state cookie gets the Secure flag. Keyed off the
    redirect URI's own scheme rather than a separate env var, since that URI
    is by definition the address Google sends the browser back to -- if it's
    https, so is this deployment."""
    return os.environ.get("GOOGLE_REDIRECT_URI", "").startswith("https://")


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
        # Filter on plan, not just "the oldest org". A deployment that ran
        # public before being locked down has personal orgs in the table, and
        # the oldest row is then some individual's private organization --
        # every code-holding signup landed inside it and could read that
        # person's dashboard. The shared org is the one created as a company
        # org, or a new one; a personal org is never adopted as the shared
        # tenant.
        org = (
            db.query(models.Organization)
            .filter(models.Organization.plan == "company")
            .order_by(models.Organization.id)
            .first()
        )
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


@router.post("/signup", status_code=201, response_model=schemas.TokenOut, dependencies=[Depends(_SIGNUP_LIMIT)])
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


@router.post("/login", response_model=schemas.TokenOut, dependencies=[Depends(_LOGIN_LIMIT)])
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.DashboardUser).filter_by(email=body.email).one_or_none()
    # Always run a real bcrypt check, even when there's no user or no
    # password_hash to check against -- against the account's own hash if it
    # has one, against DUMMY_PASSWORD_HASH otherwise. Both branches then cost
    # the same ~100ms of bcrypt work, so a timing side-channel doesn't tell a
    # guesser which emails have accounts (see DUMMY_PASSWORD_HASH's comment).
    real_hash = user.password_hash if user and user.password_hash else None
    password_ok = auth_service.verify_password(body.password, real_hash or auth_service.DUMMY_PASSWORD_HASH)
    if user is None or not real_hash or not password_ok:
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
    *new* account; an existing user's Google login never needs it.

    `state` also carries a one-time nonce, parked in a cookie here and
    compared on the way back, so a callback that didn't start with this
    request is rejected instead of logging the browser into whoever forged
    it. SameSite=lax rather than strict: Google's redirect is a cross-site
    top-level navigation, which strict would not send the cookie on."""
    try:
        nonce, state = auth_service.new_oauth_state(invite)
        url = auth_service.google_authorize_url(state=state)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    response = RedirectResponse(url)
    response.set_cookie(
        auth_service.OAUTH_STATE_COOKIE,
        nonce,
        max_age=auth_service.OAUTH_STATE_TTL_SECONDS,
        httponly=True,
        secure=_cookies_are_secure(),
        samesite="lax",
        path="/auth",
    )
    return response


@router.get("/google/callback")
def google_callback(
    code: str,
    state: str = "",
    db: Session = Depends(get_db),
    state_nonce: str | None = Cookie(default=None, alias=auth_service.OAUTH_STATE_COOKIE),
):
    """Exchanges Google's code, finds-or-creates the DashboardUser, and
    redirects back to the frontend with our own token attached -- a browser
    redirect flow, so errors go back as a query param the frontend can
    show, not a raw API error the user would never see.

    The token rides in the URL *fragment*, not the query string: a fragment
    is never sent to a server, so it stays out of proxy logs, `Referer`
    headers and the frontend's own analytics, and only the page's own JS
    (context/AppDataContext.jsx) ever reads it."""
    try:
        invite = auth_service.read_oauth_state(state, state_nonce)
        claims = auth_service.google_exchange_code(code)
        user = db.query(models.DashboardUser).filter_by(google_sub=claims["sub"]).one_or_none()
        if user is None:
            user = db.query(models.DashboardUser).filter_by(email=claims["email"]).one_or_none()
            if user is None:
                _check_signup_code(invite)
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
            elif user.password_hash:
                # Password signup never verifies the address, so anyone can
                # register victim@example.com before its owner ever visits.
                # Auto-linking here would then hand that owner's Google login
                # straight into the squatter's account -- with the squatter's
                # password still on it. A matching verified Google email is not
                # proof that whoever set the password owns the address, so this
                # is the one case that doesn't link itself. Linking the two is a
                # direct DB edit for now, same as promoting someone to admin.
                raise auth_service.AuthError(
                    "An account with that email already has a password -- sign in with it instead"
                )
            user.google_sub = claims["sub"]
            db.commit()
            db.refresh(user)
        token = auth_service.issue_token(user)
    except (auth_service.AuthError, HTTPException) as e:
        detail = e.detail if isinstance(e, HTTPException) else str(e)
        # quote(), because RedirectResponse's own escaping leaves `&` and `#`
        # alone -- an unescaped detail could otherwise inject query parameters
        # into the URL the browser lands on.
        return _clear_state_cookie(RedirectResponse(f"{_frontend_url()}/app?auth_error={quote(str(detail), safe='')}"))
    return _clear_state_cookie(RedirectResponse(f"{_frontend_url()}/app#token={token}"))


def _clear_state_cookie(response: RedirectResponse) -> RedirectResponse:
    """One round-trip, one nonce -- expire it whether the callback succeeded
    or failed, so a replay of the same `state` has nothing to match against."""
    response.delete_cookie(auth_service.OAUTH_STATE_COOKIE, path="/auth")
    return response


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.DashboardUser | None = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")
    return _user_out(user)
