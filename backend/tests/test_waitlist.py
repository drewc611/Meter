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


def test_rejects_control_characters_in_email(client, db):
    """A newline passed the old check (it only looked for a literal space),
    got stored, and then made every later /admin/notify-waitlist run raise
    HeaderParseError from the email library -- a 500 that aborted the whole
    send, so one poisoned row disabled the announcement permanently."""
    for payload in ("a@b.com\nBcc:attacker@evil.com", "a@b.com\rX:y", "a\tb@c.com"):
        assert client.post("/waitlist", json={"email": payload}).status_code == 422
    assert db.query(models.WaitlistSignup).count() == 0


def test_rejects_unbounded_company_field(client):
    r = client.post("/waitlist", json={"email": "a@b.com", "company": "x" * 500})
    assert r.status_code == 422


def test_notify_survives_an_unreachable_mail_server(client, db, monkeypatch):
    """The old handler caught only smtplib.SMTPException, but a mail server
    that is down raises ConnectionRefusedError -- an OSError, which escaped
    as a 500 and lost every notified_at in the batch, re-sending to everyone
    already emailed on the next attempt."""
    _configure_smtp(monkeypatch)

    def refuses(to, subject, html, text):
        raise ConnectionRefusedError(111, "Connection refused")

    monkeypatch.setattr("app.services.email.send_email", refuses)
    client.post("/waitlist", json={"email": "notify4@example.com"})

    r = client.post("/admin/notify-waitlist")
    assert r.status_code == 200
    assert r.json() == {"sent": 0, "failed": 1, "dry_run": False}
    # Nothing was sent, so nothing may be marked notified -- otherwise these
    # recipients are silently dropped from the next run.
    assert db.query(models.WaitlistSignup).filter(models.WaitlistSignup.notified_at.isnot(None)).count() == 0


def test_notify_keeps_earlier_sends_when_a_later_one_fails(client, db, monkeypatch):
    """notified_at is committed per recipient, so a failure partway through
    can't roll back the bookkeeping for mail that already went out."""
    _configure_smtp(monkeypatch)
    sent_to = []

    def send_then_die(to, subject, html, text):
        if to == "boom@example.com":
            raise ConnectionRefusedError(111, "Connection refused")
        sent_to.append(to)

    monkeypatch.setattr("app.services.email.send_email", send_then_die)
    client.post("/waitlist", json={"email": "first@example.com"})
    client.post("/waitlist", json={"email": "boom@example.com"})

    r = client.post("/admin/notify-waitlist")
    assert r.status_code == 200
    notified = {s.email for s in db.query(models.WaitlistSignup).filter(models.WaitlistSignup.notified_at.isnot(None))}
    assert notified == set(sent_to) == {"first@example.com"}
