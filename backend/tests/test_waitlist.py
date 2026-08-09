"""Public /waitlist signup: no auth required, idempotent on repeat email."""

from app import models


def test_join_waitlist(client, db):
    r = client.post("/waitlist", json={"email": "a@example.com", "company": "Acme"})
    assert r.status_code == 201
    assert r.json() == {"status": "joined"}
    row = db.query(models.WaitlistSignup).filter_by(email="a@example.com").one()
    assert row.company == "Acme"


def test_join_waitlist_without_company(client):
    r = client.post("/waitlist", json={"email": "b@example.com"})
    assert r.status_code == 201


def test_duplicate_email_is_idempotent(client, db):
    client.post("/waitlist", json={"email": "c@example.com"})
    r = client.post("/waitlist", json={"email": "c@example.com"})
    assert r.status_code == 201
    assert db.query(models.WaitlistSignup).filter_by(email="c@example.com").count() == 1


def test_rejects_malformed_email(client):
    r = client.post("/waitlist", json={"email": "not-an-email"})
    assert r.status_code == 422


def test_reachable_without_a_token_even_when_api_key_is_set(client, monkeypatch):
    """The one endpoint MERIT_API_KEY must never gate -- anonymous visitors have no token."""
    monkeypatch.setenv("MERIT_API_KEY", "s3cret")
    r = client.post("/waitlist", json={"email": "d@example.com"})
    assert r.status_code == 201
