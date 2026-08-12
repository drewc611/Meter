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

import os
import time
from urllib.parse import urlencode

import bcrypt
import httpx
import jwt as pyjwt

from .. import models

TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 14  # 14 days
_JWT_ALGORITHM = "HS256"

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
# Google's ID tokens carry either form depending on token version -- accept both.
GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")


class AuthError(Exception):
    """Any login/signup/token failure meant to surface as a 400/401 to the caller."""


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


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


def google_authorize_url(state: str) -> str:
    """The URL to send the browser to for Google's consent screen. `state`
    round-trips through Google unmodified -- the callback checks it against
    what was issued, both to block CSRF and (see routers/auth.py) to carry
    an optional signup code through the redirect."""
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
        raise AuthError(f"Google token exchange failed: {resp.text}")
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
