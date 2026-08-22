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


def test_google_callback_creates_new_user_and_redirects_with_token(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client123")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "secret123")
    monkeypatch.setenv("MERIT_FRONTEND_URL", "https://usemeritai.com")
    monkeypatch.setattr(
        "app.routers.auth.auth_service.google_exchange_code",
        lambda code: {"sub": "google-sub-1", "email": "ada@example.com", "name": "Ada", "email_verified": True},
    )
    r = client.get("/auth/google/callback?code=fake-code", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert r.headers["location"].startswith("https://usemeritai.com/app?token=")


def test_google_callback_links_existing_password_account_by_email(client, monkeypatch, db):
    from app import models

    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client123")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "secret123")
    client.post("/auth/signup", json={"email": "ada@example.com", "password": "hunter22", "name": "Ada"})
    monkeypatch.setattr(
        "app.routers.auth.auth_service.google_exchange_code",
        lambda code: {"sub": "google-sub-1", "email": "ada@example.com", "name": "Ada", "email_verified": True},
    )
    client.get("/auth/google/callback?code=fake-code", follow_redirects=False)
    users = db.query(models.DashboardUser).all()
    assert len(users) == 1  # linked, not duplicated
    assert users[0].google_sub == "google-sub-1"
    assert users[0].password_hash is not None  # password login still works after linking


def test_google_callback_enforces_signup_code_for_new_accounts_only(client, monkeypatch):
    monkeypatch.setenv("MERIT_JWT_SECRET", "shh")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client123")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "secret123")
    monkeypatch.setenv("MERIT_SIGNUP_CODE", "letmein")
    monkeypatch.setenv("MERIT_FRONTEND_URL", "https://usemeritai.com")
    monkeypatch.setattr(
        "app.routers.auth.auth_service.google_exchange_code",
        lambda code: {"sub": "google-sub-1", "email": "ada@example.com", "name": "Ada", "email_verified": True},
    )
    # No state (no code carried) -> rejected, surfaced as an error redirect, not a raw 401
    r = client.get("/auth/google/callback?code=fake-code", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert "auth_error" in r.headers["location"]
    # Correct code in state -> account created
    r2 = client.get("/auth/google/callback?code=fake-code&state=letmein", follow_redirects=False)
    assert "token=" in r2.headers["location"]


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
