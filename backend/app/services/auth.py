"""
Login/session logic: password hashing (bcrypt), JWT issue/verify (pyjwt),
and the "Sign in with Google" OAuth flow. Backs routers/auth.py.

Stateless sessions: a login (password or Google) issues a signed JWT the
frontend stores and sends back as `Authorization: Bearer <token>` on every
request -- the same delivery mechanism the old shared MERIT_API_KEY used,
just per-user now instead of one secret everyone shares. No server-side
session table to garbage-collect; a token is valid until it expires
(TOKEN_LIFETIME_SECONDS) or MERIT_JWT_SECRET is rotated, whichever comes
first -- rotating the secret is the "log everyone out" lever if it's ever
needed.
"""

import logging
import os
import secrets
import time
from urllib.parse import urlencode

import bcrypt
import httpx
import jwt as pyjwt

from .. import models

logger = logging.getLogger(__name__)

TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 14  # 14 days
_JWT_ALGORITHM = "HS256"

# The OAuth round-trip's CSRF nonce: minted in /auth/google/login, parked in
# this cookie, echoed back inside Google's `state`, and compared on the way
# out. Ten minutes is generous for a consent screen and short enough that a
# leaked nonce is worthless by the time anyone finds it.
OAUTH_STATE_COOKIE = "merit_oauth_state"
OAUTH_STATE_TTL_SECONDS = 600
# `state` carries two things now, so it needs a separator that cannot occur in
# the nonce (token_urlsafe is [A-Za-z0-9_-]) and does not need URL-escaping.
_STATE_SEPARATOR = "."

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
# Google's ID tokens carry either form depending on token version -- accept both.
GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")


class AuthError(Exception):
    """Any login/signup/token failure meant to surface as a 400/401 to the caller."""


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# A real bcrypt hash, at the same cost as hash_password() above, that no
# actual account will ever match. login() below checks a submitted password
# against this whenever the email doesn't resolve to a real user, so that
# path costs the same bcrypt work as a wrong password on a real account --
# otherwise a nonexistent email returns near-instantly while a real one takes
# ~100ms, and that timing gap alone lets an attacker enumerate which emails
# have accounts even though both cases return the same error message.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-password-timing-decoy")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # bcrypt refuses anything over 72 bytes (and any malformed hash)
        # by raising. schemas.LoginIn caps the input long before this, but
        # an uncaught raise here would surface as a 500 -- and since
        # routers/auth.py's `or` short-circuits past this call for an
        # unknown email, a 500-vs-401 split would say "that account exists,"
        # which is exactly what that handler's same-message-either-way
        # comment is there to prevent. A wrong password, whatever its
        # shape, is just False.
        return False


def issue_token(user: models.DashboardUser) -> str:
    jwt_secret = os.environ.get("MERIT_JWT_SECRET")
    if not jwt_secret:
        raise AuthError("MERIT_JWT_SECRET is not set -- login is disabled until it is")
    now = int(time.time())
    payload = {"sub": str(user.id), "email": user.email, "iat": now, "exp": now + TOKEN_LIFETIME_SECONDS}
    return pyjwt.encode(payload, jwt_secret, algorithm=_JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Raises jwt.PyJWTError (expired, bad signature, malformed) -- callers catch that."""
    jwt_secret = os.environ.get("MERIT_JWT_SECRET")
    if not jwt_secret:
        raise AuthError("MERIT_JWT_SECRET is not set")
    return pyjwt.decode(token, jwt_secret, algorithms=[_JWT_ALGORITHM])


def new_oauth_state(invite: str | None) -> tuple[str, str]:
    """Mint a fresh (nonce, state) pair for one Google round-trip. The nonce
    goes in a cookie; `state` is what travels through Google and carries both
    the nonce and the optional signup code."""
    nonce = secrets.token_urlsafe(24)
    return nonce, f"{nonce}{_STATE_SEPARATOR}{invite or ''}"


def read_oauth_state(state: str, cookie_nonce: str | None) -> str | None:
    """Verify a returning `state` against the nonce this browser was issued,
    and return the signup code it carried (None if it carried none).

    Without this check `state` was just an attacker-chosen string nobody
    validated, which is login CSRF: a forged callback carrying the attacker's
    own authorization code silently switches the victim's browser into the
    attacker's account, and anything the victim then enters lands there.

    compare_digest, not ==, so a wrong nonce doesn't leak its correct prefix
    through response timing -- and compared as bytes, because `state` is a
    query parameter anyone can set and compare_digest raises TypeError on a
    non-ASCII str, which would escape the caller's handler as a 500. Same
    reason routers/auth._check_signup_code encodes before comparing."""
    nonce, _, invite = state.partition(_STATE_SEPARATOR)
    if not cookie_nonce or not nonce:
        raise AuthError("This sign-in link has expired or didn't start here -- try again")
    if not secrets.compare_digest(nonce.encode("utf-8"), cookie_nonce.encode("utf-8")):
        raise AuthError("This sign-in link has expired or didn't start here -- try again")
    return invite or None


def google_authorize_url(state: str) -> str:
    """The URL to send the browser to for Google's consent screen. `state`
    round-trips through Google unmodified; build it with new_oauth_state()
    and check it with read_oauth_state() on the way back."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise AuthError("GOOGLE_CLIENT_ID is not set -- Google sign-in isn't configured")
    params = {
        "client_id": client_id,
        "redirect_uri": os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def google_exchange_code(code: str) -> dict:
    """Exchange an OAuth authorization code for the caller's Google identity
    -- sub/email/name/email_verified, cryptographically verified against
    Google's public keys (fetched live via pyjwt's PyJWKClient), not just
    decoded and trusted."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise AuthError("Google sign-in isn't configured")
    resp = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"),
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    if resp.status_code != 200:
        # Google's body is echoed to the server log, not to the caller -- an
        # AuthError here ends up in a redirect URL the browser shows, and the
        # upstream body is both attacker-influenced (it quotes the submitted
        # code) and none of the caller's business.
        logger.warning("Google token exchange failed: %s %s", resp.status_code, resp.text)
        raise AuthError("Google sign-in failed -- try again")
    id_token = resp.json().get("id_token")
    if not id_token:
        raise AuthError("Google didn't return an id_token")

    jwk_client = pyjwt.PyJWKClient(GOOGLE_JWKS_URL)
    signing_key = jwk_client.get_signing_key_from_jwt(id_token)
    try:
        claims = pyjwt.decode(id_token, signing_key.key, algorithms=["RS256"], audience=client_id)
    except pyjwt.PyJWTError as e:
        raise AuthError(f"Invalid Google id_token: {e}") from e

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise AuthError("Unexpected Google token issuer")
    if not claims.get("email_verified"):
        raise AuthError("Google account email is not verified")
    return claims
