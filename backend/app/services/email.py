"""
Outbound email — currently just /admin/notify-waitlist. Talks plain SMTP
rather than a specific vendor's API, so it works with whatever provider is
already on hand (Postmark, SES, Resend, a Workspace account) without a new
dependency or a vendor lock-in decision baked into the code.

Reads MERIT_SMTP_* from the environment live (same pattern as
dependencies.require_api_key), not cached on Settings, so tests can
monkeypatch it per-test and a rotated credential takes effect on restart.
Unset host/from-address means "not configured" -- callers get a clear
EmailNotConfigured, not a silent no-op, since silently pretending an
announcement email went out is worse than failing loudly.
"""

import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import cache


class EmailNotConfigured(Exception):
    """Raised when MERIT_SMTP_HOST or MERIT_FROM_EMAIL isn't set."""


@cache
def _tls_context() -> ssl.SSLContext:
    """Built once and shared. Reading and parsing the system CA bundle costs
    ~20ms, and /admin/notify-waitlist calls send_email() once per recipient --
    per-call construction put 20 seconds of pure certificate parsing into a
    thousand-recipient send. An SSLContext is designed to be reused across
    connections."""
    return ssl.create_default_context()


def is_configured() -> bool:
    return bool(os.environ.get("MERIT_SMTP_HOST")) and bool(os.environ.get("MERIT_FROM_EMAIL"))


def send_email(to: str, subject: str, html_body: str, text_body: str) -> None:
    """Send one email via SMTP (certificate-verified STARTTLS on the
    configured port, default 587).

    Raises EmailNotConfigured if MERIT_SMTP_HOST/MERIT_FROM_EMAIL aren't set,
    or smtplib.SMTPException (uncaught -- the caller decides how to handle a
    per-recipient send failure) if the send itself fails.
    """
    host = os.environ.get("MERIT_SMTP_HOST")
    from_addr = os.environ.get("MERIT_FROM_EMAIL")
    if not host or not from_addr:
        raise EmailNotConfigured("MERIT_SMTP_HOST and MERIT_FROM_EMAIL must both be set to send email")
    port = int(os.environ.get("MERIT_SMTP_PORT", "587"))
    user = os.environ.get("MERIT_SMTP_USER")
    password = os.environ.get("MERIT_SMTP_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(host, port, timeout=10) as smtp:
        # starttls() with no context builds one via ssl._create_stdlib_context(),
        # which is CERT_NONE + check_hostname=False -- it encrypts, but verifies
        # nothing, so anyone able to answer for MERIT_SMTP_HOST reads the session
        # and collects MERIT_SMTP_USER/PASSWORD from the AUTH that follows.
        smtp.starttls(context=_tls_context())
        if user and password:
            smtp.login(user, password)
        smtp.sendmail(from_addr, [to], msg.as_string())
