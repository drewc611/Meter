"""services/email.py -- the SMTP sender behind /admin/notify-waitlist.

Nothing here talks to a real mail server; the point is what the client hands
smtplib, not what a server does with it.
"""

import ssl

import pytest

from app.services import email


class _FakeSMTP:
    """Enough of smtplib.SMTP to record how the session was set up."""

    def __init__(self, host, port, timeout=None):
        self.host = host
        self.port = port
        self.starttls_context = None
        self.login_args = None
        self.sent = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self, context=None):
        self.starttls_context = context

    def login(self, user, password):
        self.login_args = (user, password)

    def sendmail(self, from_addr, to_addrs, message):
        self.sent.append((from_addr, to_addrs, message))


@pytest.fixture
def smtp(monkeypatch):
    """Captures the single _FakeSMTP a send_email() call constructs."""
    made = []
    monkeypatch.setattr(email.smtplib, "SMTP", lambda *a, **kw: made.append(_FakeSMTP(*a, **kw)) or made[-1])
    monkeypatch.setenv("MERIT_SMTP_HOST", "smtp.test.internal")
    monkeypatch.setenv("MERIT_FROM_EMAIL", "noreply@usemeritai.com")
    monkeypatch.delenv("MERIT_SMTP_USER", raising=False)
    monkeypatch.delenv("MERIT_SMTP_PASSWORD", raising=False)
    return made


def test_starttls_verifies_the_server_certificate(smtp):
    """starttls() with no context builds one from ssl._create_stdlib_context(),
    which is CERT_NONE with check_hostname off -- encrypted but unauthenticated,
    so anyone who can answer for MERIT_SMTP_HOST reads the session and harvests
    the AUTH credentials sent over it."""
    email.send_email("someone@example.com", "Subject", "<p>hi</p>", "hi")

    context = smtp[0].starttls_context
    assert isinstance(context, ssl.SSLContext)
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True


def test_the_tls_context_is_built_once_and_shared(smtp):
    """Parsing the system CA bundle costs ~20ms. /admin/notify-waitlist calls
    send_email() once per recipient, so building a context per call put 20
    seconds of certificate parsing into a thousand-recipient send."""
    email.send_email("one@example.com", "S", "<p>hi</p>", "hi")
    email.send_email("two@example.com", "S", "<p>hi</p>", "hi")
    assert smtp[0].starttls_context is smtp[1].starttls_context


def test_credentials_are_only_sent_after_tls_is_up(smtp, monkeypatch):
    """Ordering matters as much as the context: a login() before starttls()
    would put the password on the wire in clear text."""
    monkeypatch.setenv("MERIT_SMTP_USER", "apikey")
    monkeypatch.setenv("MERIT_SMTP_PASSWORD", "hunter2")
    calls = []
    monkeypatch.setattr(_FakeSMTP, "starttls", lambda self, context=None: calls.append("starttls"))
    monkeypatch.setattr(_FakeSMTP, "login", lambda self, u, p: calls.append("login"))

    email.send_email("someone@example.com", "Subject", "<p>hi</p>", "hi")

    assert calls == ["starttls", "login"]


def test_unconfigured_smtp_raises_rather_than_silently_dropping_the_mail(monkeypatch):
    monkeypatch.delenv("MERIT_SMTP_HOST", raising=False)
    monkeypatch.delenv("MERIT_FROM_EMAIL", raising=False)
    with pytest.raises(email.EmailNotConfigured):
        email.send_email("someone@example.com", "Subject", "<p>hi</p>", "hi")
