"""
Three auth layers, tested separately:

- MERIT_API_KEY (dependencies.require_api_key): a service token, gates
  /ingest/* only now -- machines (proxies, webhooks, personal.py), not a
  human login.
- MERIT_JWT_SECRET (dependencies.get_current_user): real per-user login via
  /auth/signup, /auth/login, or Google, gates /api/* and /admin/*.
- is_admin (dependencies.require_admin): a second gate layered on top of
  get_current_user for /admin/* specifically -- being logged in isn't
  enough, the DashboardUser also needs is_admin set (see
  routers/auth.py's _should_be_admin for how that gets assigned).

Both env vars are read live, so these tests toggle with monkeypatch.setenv
rather than touching Settings.
"""

from urllib.parse import parse_qs, quote, urlsplit

from app.services import auth as auth_service

# --------------------------------------------------------------- MERIT_API_KEY


def test_ingest_open_when_api_key_unset(client, monkeypatch):
    monkeypatch.delenv("MERIT_API_KEY", raising=False)
    r = client.post(
        "/ingest/usage",
        json={"source_system": "anthropic_api", "external_id": "nope", "tool": "anthropic_api", "cost_usd": 1.0},
    )
    assert r.status_code == 422  # unmapped id -> UnresolvedIdentityError -> 422, not 401: auth let it through


def test_ingest_rejects_missing_or_wrong_key_when_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    payload = {"source_system": "anthropic_api", "external_id": "x", "tool": "anthropic_api", "cost_usd": 1.0}
    assert client.post("/ingest/usage", json=payload).status_code == 401
    assert client.post("/ingest/usage", json=payload, headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_ingest_accepts_correct_key(client, monkeypatch, db):
    """The bearer token has to match some Organization's ingest_token now,
    not just a literal env-var string -- create one with that token first
    (this is what the multi-tenant migration does for MERIT_API_KEY)."""
    from app import models

    db.add(models.Organization(name="Test Org", plan="company", ingest_token="s3cret"))
    db.commit()
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    r = client.post(
        "/ingest/usage",
        json={"source_system": "anthropic_api", "external_id": "nope", "tool": "anthropic_api", "cost_usd": 1.0},
        headers={"Authorization": "Bearer s3cret"},
    )
    assert r.status_code == 422  # reached the handler; failed on the unmapped id, not auth


def test_ingest_rejects_no_header_once_two_orgs_exist(client, db):
    """The safety property that makes multi-tenancy safe by default: with
    MERIT_API_KEY unset, an unauthenticated write is fine while there's at
    most one Organization, but the instant a second one exists it's
    ambiguous which org the write belongs to, and is rejected."""
    from app import models

    db.add(models.Organization(name="Org A", plan="personal"))
    db.add(models.Organization(name="Org B", plan="personal"))
    db.commit()
    r = client.post(
        "/ingest/usage",
        json={"source_system": "anthropic_api", "external_id": "nope", "tool": "anthropic_api", "cost_usd": 1.0},
    )
    assert r.status_code == 401


def test_api_key_no_longer_gates_dashboard_or_admin(client, monkeypatch):
    """The load-bearing behavior change this file exists to pin down:
    MERIT_API_KEY governs /ingest/* only now."""
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    assert client.get("/api/overview").status_code == 200
    r = client.post(
        "/admin/identity-mapping", json={"email": "a@example.com", "source_system": "x", "external_id": "y"}
    )
    assert r.status_code == 404  # reached the handler (no such Identity), not blocked by auth


def test_healthz_always_open(client, monkeypatch):
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    assert client.get("/healthz").status_code == 200


# --------------------------------------------------------------- MERIT_JWT_SECRET gate


def test_dashboard_and_admin_open_when_jwt_secret_unset(client, monkeypatch):
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    assert client.get("/api/overview").status_code == 200
    r = client.post(
        "/admin/identity-mapping", json={"email": "a@example.com", "source_system": "x", "external_id": "y"}
    )
    assert r.status_code == 404  # reached the handler, not blocked


def test_dashboard_rejects_missing_or_bad_token_when_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    assert client.get("/api/overview").status_code == 401
    assert client.get("/api/overview", headers={"Authorization": "Bearer garbage"}).status_code == 401
    assert client.get("/api/overview", headers={"Authorization": "NotBearer x"}).status_code == 401


def test_dashboard_accepts_token_from_signup(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    signup = client.post("/auth/signup", json={"email": "a@example.com", "password": "hunter22", "name": "Ada"})
    assert signup.status_code == 201
    token = signup.json()["access_token"]
    r = client.get("/api/overview", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_token_signed_with_wrong_secret_is_rejected(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    token = client.post("/auth/signup", json={"email": "a@example.com", "password": "hunter22", "name": "Ada"}).json()[
        "access_token"
    ]
    monkeypatch.setenv("MERIT_JWT_SECRET", "different")  # simulate a rotated secret
    r = client.get("/api/overview", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


# --------------------------------------------------------------- /auth/signup


def test_signup_without_jwt_secret_returns_503(client, monkeypatch):
    """Signup itself always works (it's not gated), but issuing a token
    needs MERIT_JWT_SECRET -- fails loud, not a silent fake success."""
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    r = client.post("/auth/signup", json={"email": "a@example.com", "password": "hunter22", "name": "Ada"})
    assert r.status_code == 503


def test_signup_rejects_duplicate_email(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    body = {"email": "a@example.com", "password": "hunter22", "name": "Ada"}
    assert client.post("/auth/signup", json=body).status_code == 201
    assert client.post("/auth/signup", json=body).status_code == 409


def test_signup_rejects_short_password(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    r = client.post("/auth/signup", json={"email": "a@example.com", "password": "short", "name": "Ada"})
    assert r.status_code == 422


def test_signup_requires_matching_code_when_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("MERIT_SIGNUP_CODE", "letmein")
    body = {"email": "a@example.com", "password": "hunter22", "name": "Ada"}
    assert client.post("/auth/signup", json=body).status_code == 403
    assert client.post("/auth/signup", json={**body, "signup_code": "wrong"}).status_code == 403
    assert client.post("/auth/signup", json={**body, "signup_code": "letmein"}).status_code == 201


def test_signup_code_never_adopts_someones_personal_org(client, db, monkeypatch):
    """A deployment that ran public before being locked down has personal
    orgs in the table. Picking "the oldest organization" as the shared one
    put every later company signup inside an individual's private org, where
    they could read that person's dashboard. The shared org must be a
    company org -- created if there isn't one."""
    from app import models

    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.delenv("MERIT_SIGNUP_CODE", raising=False)
    alice = client.post(
        "/auth/signup", json={"email": "alice@example.com", "password": "hunter22", "name": "Alice"}
    ).json()["user"]

    monkeypatch.setenv("MERIT_SIGNUP_CODE", "letmein")
    bob = client.post(
        "/auth/signup",
        json={"email": "bob@example.com", "password": "hunter22", "name": "Bob", "signup_code": "letmein"},
    ).json()["user"]

    assert bob["org_id"] != alice["org_id"], "company signup landed in a personal org"
    assert db.query(models.Organization).filter_by(id=bob["org_id"]).one().plan == "company"


# --------------------------------------------------------------- /auth/login


def test_login_round_trip(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    client.post("/auth/signup", json={"email": "a@example.com", "password": "hunter22", "name": "Ada"})
    r = client.post("/auth/login", json={"email": "a@example.com", "password": "hunter22"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "a@example.com"
    assert r.json()["user"]["has_password"] is True
    assert r.json()["user"]["has_google"] is False


def test_login_rejects_wrong_password(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    client.post("/auth/signup", json={"email": "a@example.com", "password": "hunter22", "name": "Ada"})
    r = client.post("/auth/login", json={"email": "a@example.com", "password": "wrong password"})
    assert r.status_code == 401


def test_login_rejects_unknown_email(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "hunter22"})
    assert r.status_code == 401


def test_login_pays_the_same_bcrypt_cost_for_an_unknown_email(client, monkeypatch):
    """An unknown email must still run a real bcrypt check, against
    DUMMY_PASSWORD_HASH, so it costs the same as a wrong password on a real
    account -- otherwise the timing gap alone reveals which emails have
    accounts, even though both return the identical 401."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    from app.services import auth as auth_service

    calls = []
    real_verify = auth_service.verify_password

    def spy(password, password_hash):
        calls.append(password_hash)
        return real_verify(password, password_hash)

    monkeypatch.setattr("app.routers.auth.auth_service.verify_password", spy)
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "hunter22"})
    assert r.status_code == 401
    assert calls == [auth_service.DUMMY_PASSWORD_HASH]


def test_login_pays_the_same_bcrypt_cost_for_a_google_only_account(client, monkeypatch):
    """A real account with no password set (Google-only) must also check
    against DUMMY_PASSWORD_HASH, not skip the bcrypt call entirely."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    from app import models
    from app.database import SessionLocal
    from app.services import auth as auth_service

    # Simplest reliable way to get a real user row with no password: sign up
    # normally, then clear the password hash to model a Google-only account.
    client.post("/auth/signup", json={"email": "google-only@example.com", "password": "hunter22", "name": "Ada"})
    db = SessionLocal()
    try:
        user = db.query(models.DashboardUser).filter_by(email="google-only@example.com").one()
        user.password_hash = None
        db.commit()
    finally:
        db.close()

    calls = []
    real_verify = auth_service.verify_password

    def spy(password, password_hash):
        calls.append(password_hash)
        return real_verify(password, password_hash)

    monkeypatch.setattr("app.routers.auth.auth_service.verify_password", spy)
    r = client.post("/auth/login", json={"email": "google-only@example.com", "password": "hunter22"})
    assert r.status_code == 401
    assert calls == [auth_service.DUMMY_PASSWORD_HASH]


# --------------------------------------------------------------- oversized passwords (bcrypt's 72-byte limit)


def test_oversized_password_is_422_on_signup_and_login(client, monkeypatch):
    """bcrypt raises past 72 bytes. Rejecting at the validation layer keeps
    that out of the handler entirely -- it used to surface as a 500."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    huge = "a" * 200
    assert (
        client.post("/auth/signup", json={"email": "a@example.com", "password": huge, "name": "Ada"}).status_code == 422
    )
    assert client.post("/auth/login", json={"email": "a@example.com", "password": huge}).status_code == 422
    # Multibyte: 72 characters, 144 bytes -- the character-count cap alone
    # would let this through to bcrypt.
    multibyte = "é" * 72
    assert (
        client.post("/auth/signup", json={"email": "b@example.com", "password": multibyte, "name": "Bo"}).status_code
        == 422
    )
    assert client.post("/auth/login", json={"email": "b@example.com", "password": multibyte}).status_code == 422


def test_oversized_password_does_not_reveal_whether_the_account_exists(client, monkeypatch):
    """The enumeration oracle this closes: an existing email used to crash
    into a 500 while an unknown one cleanly 401'd, because `or` short-circuits
    past verify_password. Both are the same status now."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    client.post("/auth/signup", json={"email": "real@example.com", "password": "hunter22", "name": "Ada"})
    huge = "a" * 200
    existing = client.post("/auth/login", json={"email": "real@example.com", "password": huge})
    unknown = client.post("/auth/login", json={"email": "nobody@example.com", "password": huge})
    assert existing.status_code == unknown.status_code == 422


def test_verify_password_returns_false_for_oversized_input(monkeypatch):
    """The backstop under the schema cap: verify_password itself never
    raises, whatever reaches it."""
    from app.services import auth as auth_service

    hashed = auth_service.hash_password("hunter22")
    assert auth_service.verify_password("a" * 200, hashed) is False
    assert auth_service.verify_password("hunter22", hashed) is True


# --------------------------------------------------------------- /auth/me


def test_me_requires_login_when_jwt_secret_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    assert client.get("/auth/me").status_code == 401


def test_me_returns_401_when_jwt_secret_unset(client, monkeypatch):
    """Auth is fully off in this state -- there's no session to ask about."""
    monkeypatch.delenv("MERIT_JWT_SECRET", raising=False)
    assert client.get("/auth/me").status_code == 401


def test_me_returns_current_user(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    token = client.post("/auth/signup", json={"email": "a@example.com", "password": "hunter22", "name": "Ada"}).json()[
        "access_token"
    ]
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() == {
        "id": 1,
        "email": "a@example.com",
        "name": "Ada",
        "has_password": True,
        "has_google": False,
        "is_admin": True,  # signup with no MERIT_SIGNUP_CODE always admins its own new org
        "org_id": 1,
        "org_name": "Ada's Merit AC",
    }


# --------------------------------------------------------------- Google OAuth


def test_google_login_unconfigured_returns_503(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    assert client.get("/auth/google/login", follow_redirects=False).status_code == 503


def test_google_login_redirects_to_google(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client123")
    r = client.get("/auth/google/login", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert r.headers["location"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=client123" in r.headers["location"]


def _configure_google(monkeypatch, *, claims=None, **env):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client123")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "secret123")
    monkeypatch.setenv("MERIT_FRONTEND_URL", "https://usemeritai.com")
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setattr(
        "app.routers.auth.auth_service.google_exchange_code",
        lambda code: (
            claims or {"sub": "google-sub-1", "email": "ada@example.com", "name": "Ada", "email_verified": True}
        ),
    )


def _begin_google_login(client, invite=None):
    """Walk the real first leg of the flow so the client is holding the state
    cookie, and return the `state` Google would echo back. Calling the
    callback without doing this is precisely what the CSRF check rejects."""
    path = "/auth/google/login" + (f"?invite={invite}" if invite else "")
    r = client.get(path, follow_redirects=False)
    assert r.status_code in (302, 307)
    return parse_qs(urlsplit(r.headers["location"]).query)["state"][0]


def _finish_google_login(client, state):
    return client.get(f"/auth/google/callback?code=fake-code&state={quote(state)}", follow_redirects=False)


def test_google_callback_creates_new_user_and_redirects_with_token(client, monkeypatch):
    _configure_google(monkeypatch)
    r = _finish_google_login(client, _begin_google_login(client))
    assert r.status_code in (302, 307)
    # Fragment, not query string: a fragment never reaches a server, so the
    # session token stays out of proxy logs and Referer headers.
    assert r.headers["location"].startswith("https://usemeritai.com/app#token=")
    assert "?token=" not in r.headers["location"]


def test_google_callback_refuses_to_link_onto_an_existing_password_account(client, monkeypatch, db):
    """Account pre-hijacking: password signup never verifies the address, so
    anyone can register a victim's email first. If Google sign-in then linked
    itself onto that row, the victim would land in the squatter's account --
    with the squatter's own password still on it."""
    from app import models

    _configure_google(monkeypatch)
    client.post("/auth/signup", json={"email": "ada@example.com", "password": "hunter22", "name": "Ada"})

    r = _finish_google_login(client, _begin_google_login(client))
    assert "auth_error" in r.headers["location"]
    assert "#token=" not in r.headers["location"]
    user = db.query(models.DashboardUser).filter_by(email="ada@example.com").one()
    assert user.google_sub is None  # never linked


def test_google_callback_still_links_an_account_with_no_password(client, monkeypatch, db):
    """The safe half of the same path: an account created by an earlier Google
    login (or provisioned without one) has no password to hijack it with, so a
    matching verified Google address still links rather than duplicating."""
    from app import models

    _configure_google(monkeypatch)
    _finish_google_login(client, _begin_google_login(client))
    db.query(models.DashboardUser).filter_by(email="ada@example.com").update({"google_sub": None})
    db.commit()

    r = _finish_google_login(client, _begin_google_login(client))
    assert "#token=" in r.headers["location"]
    users = db.query(models.DashboardUser).all()
    assert len(users) == 1  # linked, not duplicated
    assert users[0].google_sub == "google-sub-1"


def test_google_callback_rejects_a_state_this_browser_never_started(client, monkeypatch):
    """Login CSRF. Without a nonce to check, a forged callback carrying the
    attacker's own authorization code switched the victim's browser into the
    attacker's account."""
    _configure_google(monkeypatch)
    r = client.get("/auth/google/callback?code=fake-code&state=attacker-chosen", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert "auth_error" in r.headers["location"]
    assert "#token=" not in r.headers["location"]


def test_google_callback_survives_a_non_ascii_state(client, monkeypatch):
    """`state` is a query parameter anyone can set, and compare_digest raises
    TypeError on a non-ASCII str -- which would escape the handler as a 500
    rather than the error redirect every other bad state gets."""
    _configure_google(monkeypatch)
    _begin_google_login(client)  # so there is a cookie nonce to compare against
    r = client.get("/auth/google/callback?code=fake-code&state=%C3%A9", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert "auth_error" in r.headers["location"]


def test_google_callback_rejects_a_replayed_state(client, monkeypatch):
    """One round-trip, one nonce -- the cookie is cleared either way, so the
    same state can't be used twice."""
    _configure_google(monkeypatch)
    state = _begin_google_login(client)
    assert "#token=" in _finish_google_login(client, state).headers["location"]
    assert "auth_error" in _finish_google_login(client, state).headers["location"]


def test_google_callback_enforces_signup_code_for_new_accounts_only(client, monkeypatch):
    _configure_google(monkeypatch, MERIT_SIGNUP_CODE="letmein")
    # No invite carried -> rejected, surfaced as an error redirect, not a raw 401
    r = _finish_google_login(client, _begin_google_login(client))
    assert r.status_code in (302, 307)
    assert "auth_error" in r.headers["location"]
    # Correct code carried through state -> account created
    r2 = _finish_google_login(client, _begin_google_login(client, invite="letmein"))
    assert "#token=" in r2.headers["location"]


def test_google_error_redirect_cannot_inject_query_parameters(client, monkeypatch):
    """RedirectResponse's own escaping leaves `&` and `#` alone, so an
    unescaped error detail could append parameters to the URL the browser
    lands on."""

    def explode(code):
        raise auth_service.AuthError("broke&token=forged#x")

    _configure_google(monkeypatch)
    monkeypatch.setattr("app.routers.auth.auth_service.google_exchange_code", explode)
    location = _finish_google_login(client, _begin_google_login(client)).headers["location"]
    assert location.count("?") == 1
    assert "&" not in location and "#" not in location
    assert "token%3Dforged" in location


# --------------------------------------------------------------- /admin/* RBAC (is_admin)

_MAP_BODY = {"email": "nobody@example.com", "source_system": "x", "external_id": "y"}


def _signup(client, email="a@example.com", name="Ada"):
    return _signup_with(client, email, name)


def _signup_with(client, email, name, **extra):
    r = client.post("/auth/signup", json={"email": email, "password": "hunter22", "name": name, **extra})
    assert r.status_code == 201
    return r.json()


def test_first_signup_becomes_admin(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    user = _signup(client)["user"]
    assert user["is_admin"] is True


def test_every_signup_admins_its_own_org_when_no_signup_code(client, monkeypatch):
    """With MERIT_SIGNUP_CODE unset (the public, free-personal-use posture),
    every signup gets a brand-new isolated Organization and is its sole
    admin -- there's no "second user" of someone else's org to not-admin."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    first = _signup(client, "first@example.com", "First")["user"]
    second = _signup(client, "second@example.com", "Second")["user"]
    assert first["is_admin"] is True
    assert second["is_admin"] is True
    assert first["org_id"] != second["org_id"]


def test_second_signup_is_not_admin_when_signup_code_shares_one_org(client, monkeypatch):
    """With MERIT_SIGNUP_CODE set (a company deployment gated to one org),
    signups join the single shared org instead -- the original bootstrap
    behavior this test used to cover, preserved for that case."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("MERIT_SIGNUP_CODE", "letmein")
    body = {"signup_code": "letmein"}
    first = _signup_with(client, "first@example.com", "First", **body)["user"]
    second = _signup_with(client, "second@example.com", "Second", **body)["user"]
    assert first["is_admin"] is True
    assert second["is_admin"] is False
    assert first["org_id"] == second["org_id"]


def test_merit_admin_emails_grants_admin_to_non_first_signup(client, monkeypatch):
    """MERIT_ADMIN_EMAILS only makes sense within one shared org, so this
    also needs MERIT_SIGNUP_CODE set -- otherwise boss@example.com would
    just land in its own brand-new org and be admin of that regardless."""
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("MERIT_SIGNUP_CODE", "letmein")
    monkeypatch.setenv("MERIT_ADMIN_EMAILS", "boss@example.com, other@example.com")
    body = {"signup_code": "letmein"}
    _signup_with(client, "first@example.com", "First", **body)  # takes the bootstrap slot
    boss = _signup_with(client, "boss@example.com", "Boss", **body)["user"]
    assert boss["is_admin"] is True


def test_admin_endpoints_reject_non_admin_when_jwt_secret_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("MERIT_SIGNUP_CODE", "letmein")
    body = {"signup_code": "letmein"}
    _signup_with(client, "first@example.com", "First", **body)  # bootstrap admin, not used here
    token = _signup_with(client, "second@example.com", "Second", **body)["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/admin/identity-mapping", json=_MAP_BODY, headers=headers).status_code == 403
    assert client.post("/admin/recompute-scores", headers=headers).status_code == 403


def test_admin_endpoints_accept_admin(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    token = _signup(client)["access_token"]  # first signup -> admin of its own org
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post("/admin/identity-mapping", json=_MAP_BODY, headers=headers)
    assert r.status_code == 404  # reached the handler (no such Identity) -- not blocked by auth
    assert client.post("/admin/recompute-scores", headers=headers).status_code == 200
