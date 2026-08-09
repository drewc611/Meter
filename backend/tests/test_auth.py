"""MERIT_API_KEY bearer-token gate on /ingest/*, /admin/*, /api/*.

require_api_key reads the env var live (see dependencies.py), so these tests
toggle it with monkeypatch.setenv/delenv rather than touching Settings.
"""


def test_open_when_unset(client, monkeypatch):
    """The default (no MERIT_API_KEY) preserves today's open behavior."""
    monkeypatch.delenv("MERIT_API_KEY", raising=False)
    assert client.get("/api/overview").status_code == 200
    assert client.get("/healthz").status_code == 200


def test_rejects_missing_header_when_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    r = client.get("/api/overview")
    assert r.status_code == 401


def test_rejects_wrong_token_when_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    r = client.get("/api/overview", headers={"Authorization": "Bearer wrong"})
    assert r.status_code == 401


def test_accepts_correct_token_when_set(client, monkeypatch):
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    r = client.get("/api/overview", headers={"Authorization": "Bearer s3cret"})
    assert r.status_code == 200


def test_healthz_stays_open_when_set(client, monkeypatch):
    """Fly's health check hits /healthz without a token -- it must never 401."""
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    assert client.get("/healthz").status_code == 200


def test_ingest_and_admin_routers_are_gated_too(client, monkeypatch):
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    assert (
        client.post(
            "/ingest/usage",
            json={"source_system": "anthropic_api", "external_id": "x", "tool": "anthropic_api", "cost_usd": 1.0},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/admin/identity-mapping",
            json={"email": "a@example.com", "source_system": "anthropic_api", "external_id": "x"},
        ).status_code
        == 401
    )
