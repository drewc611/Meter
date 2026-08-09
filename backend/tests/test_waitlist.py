"""Public /waitlist signup: no auth required, idempotent on repeat email.

Also covers /admin/notify-waitlist, the one-off announcement send."""

import smtplib

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


def _configure_smtp(monkeypatch):
    monkeypatch.setenv("MERIT_SMTP_HOST", "smtp.test.internal")
    monkeypatch.setenv("MERIT_FROM_EMAIL", "noreply@usemeritai.com")


def test_notify_waitlist_without_smtp_configured_returns_503(client):
    r = client.post("/admin/notify-waitlist")
    assert r.status_code == 503


def test_notify_waitlist_dry_run_does_not_require_smtp_or_send(client, db):
    client.post("/waitlist", json={"email": "dry1@example.com"})
    client.post("/waitlist", json={"email": "dry2@example.com"})
    r = client.post("/admin/notify-waitlist?dry_run=true")
    assert r.status_code == 200
    assert r.json() == {"sent": 2, "failed": 0, "dry_run": True}
    assert db.query(models.WaitlistSignup).filter(models.WaitlistSignup.notified_at.isnot(None)).count() == 0


def test_notify_waitlist_sends_and_marks_notified_once(client, db, monkeypatch):
    _configure_smtp(monkeypatch)
    sent_to = []
    monkeypatch.setattr("app.services.email.send_email", lambda to, subject, html, text: sent_to.append(to))

    client.post("/waitlist", json={"email": "notify1@example.com"})
    client.post("/waitlist", json={"email": "notify2@example.com"})

    r = client.post("/admin/notify-waitlist")
    assert r.status_code == 200
    assert r.json() == {"sent": 2, "failed": 0, "dry_run": False}
    assert sorted(sent_to) == ["notify1@example.com", "notify2@example.com"]
    assert db.query(models.WaitlistSignup).filter(models.WaitlistSignup.notified_at.isnot(None)).count() == 2

    # Re-running reaches nobody new -- everyone's already notified.
    sent_to.clear()
    r2 = client.post("/admin/notify-waitlist")
    assert r2.json() == {"sent": 0, "failed": 0, "dry_run": False}
    assert sent_to == []


def test_notify_waitlist_counts_failed_sends_without_aborting_the_batch(client, db, monkeypatch):
    _configure_smtp(monkeypatch)

    def flaky_send(to, subject, html, text):
        if to == "bounces@example.com":
            raise smtplib.SMTPRecipientsRefused({to: (550, b"mailbox unavailable")})

    monkeypatch.setattr("app.services.email.send_email", flaky_send)

    client.post("/waitlist", json={"email": "bounces@example.com"})
    client.post("/waitlist", json={"email": "notify3@example.com"})

    r = client.post("/admin/notify-waitlist")
    assert r.json() == {"sent": 1, "failed": 1, "dry_run": False}
    notified = {s.email for s in db.query(models.WaitlistSignup).filter(models.WaitlistSignup.notified_at.isnot(None))}
    assert notified == {"notify3@example.com"}
