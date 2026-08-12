"""
Two independent auth layers, tested separately:

- MERIT_API_KEY (dependencies.require_api_key): a service token, gates
  /ingest/* only now -- machines (proxies, webhooks, personal.py), not a
  human login.
- MERIT_JWT_SECRET (dependencies.get_current_user): real per-user login via
  /auth/signup, /auth/login, or Google, gates /api/* and /admin/*.

Both read their env var live, so these tests toggle with monkeypatch.setenv
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


def test_ingest_accepts_correct_key(client, monkeypatch):
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    r = client.post(
        "/ingest/usage",
        json={"source_system": "anthropic_api", "external_id": "nope", "tool": "anthropic_api", "cost_usd": 1.0},
        headers={"Authorization": "Bearer s3cret"},
    )
    assert r.status_code == 422  # reached the handler; failed on the unmapped id, not auth


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
    assert r.json() == {"id": 1, "email": "a@example.com", "name": "Ada", "has_password": True, "has_google": False}


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
    assert r.headers["location"].startswith("https://usemeritai.com/?token=")


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
