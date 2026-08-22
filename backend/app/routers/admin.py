"""Admin endpoints: manual identity mapping, the scoring-job entry point,
and the one-off waitlist announcement send."""

import smtplib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_current_user, get_db, resolve_org_id
from ..periods import current_period
from ..services import email, scoring
from ..time_utils import utcnow

router = APIRouter(prefix="/admin", tags=["admin"])

_NOTIFY_SUBJECT = "Merit AC is live — see what your AI spend is actually producing"

_NOTIFY_TEXT = """\
Hi,

Thanks for joining the Merit AC waitlist. The site's live at https://usemeritai.com \
-- including a free calculator that estimates your AI ROI (licensing cost, \
estimated rework, net value, Merit AC Score) in about 30 seconds.

Merit AC measures whether AI coding tools are actually producing value, not just \
tracking what they cost -- spend, outcomes, and rework, rolled into one score.

Take a look: https://usemeritai.com

Reply to this email any time with questions, or if you'd like early access to \
the full dashboard.

-- Merit AC
"""

_NOTIFY_HTML = """\
<p>Hi,</p>
<p>Thanks for joining the Merit AC waitlist. The site's live at
<a href="https://usemeritai.com">usemeritai.com</a> &mdash; including a free
calculator that estimates your AI ROI (licensing cost, estimated rework, net
value, Merit AC Score) in about 30 seconds.</p>
<p>Merit AC measures whether AI coding tools are actually producing value, not
just tracking what they cost &mdash; spend, outcomes, and rework, rolled into
one score.</p>
<p><a href="https://usemeritai.com">Take a look</a></p>
<p>Reply to this email any time with questions, or if you'd like early access
to the full dashboard.</p>
<p>&mdash; Merit AC</p>
"""


@router.post("/identity-mapping", status_code=201, response_model=schemas.IdentityMapped)
def map_identity(
    body: schemas.IdentityMappingIn,
    db: Session = Depends(get_db),
    user: models.DashboardUser | None = Depends(get_current_user),
):
    """Wire a new external id (a fresh API key, a bot account) to an existing person."""
    org_id = resolve_org_id(db, user)
    ident = db.query(models.Identity).filter_by(org_id=org_id, email=body.email).one_or_none()
    if not ident:
        raise HTTPException(status_code=404, detail=f"No Identity with email {body.email}. Provision via SCIM first.")
    mapping = models.IdentityMapping(
        org_id=org_id, identity_id=ident.id, source_system=body.source_system, external_id=body.external_id
    )
    db.add(mapping)
    db.commit()
    return schemas.IdentityMapped(identity_id=ident.id)


@router.post("/recompute-scores", response_model=schemas.RecomputeResult)
def recompute(
    start: datetime | None = None,
    end: datetime | None = None,
    db: Session = Depends(get_db),
    user: models.DashboardUser | None = Depends(get_current_user),
):
    """
    Self-service recompute for the calling admin's own org. The real
    nightly batch job is backend/recompute.py, which loops over every
    Organization -- this endpoint only ever touches one.
    """
    if start is None or end is None:
        start, end = current_period()
    org_id = resolve_org_id(db, user)
    n = scoring.recompute_all(db, org_id, start, end)
    return schemas.RecomputeResult(period_start=start, period_end=end, people_scored=n)


@router.get("/org", response_model=schemas.OrgOut)
def get_org(db: Session = Depends(get_db), user: models.DashboardUser | None = Depends(get_current_user)):
    """The calling admin's own Organization, including its ingest_token --
    how a self-signed-up individual discovers the credential to wire up
    personal.py or a proxy against their own account."""
    org_id = resolve_org_id(db, user)
    org = db.query(models.Organization).filter_by(id=org_id).one_or_none() if org_id else None
    if org is None:
        raise HTTPException(status_code=404, detail="No organization found")
    return org


@router.post("/notify-waitlist", response_model=schemas.NotifyWaitlistResult)
def notify_waitlist(dry_run: bool = False, db: Session = Depends(get_db)):
    """
    Emails every waitlist signup that hasn't been notified yet (see
    WaitlistSignup.notified_at) with a single fixed announcement -- a
    one-off "the site is live" send, not a campaign tool.

    Requires MERIT_SMTP_HOST + MERIT_FROM_EMAIL (see services/email.py),
    503 if unset. dry_run=true skips the actual sends, so you can see the
    pending-recipient count without emailing anyone.
    """
    if not dry_run and not email.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Email isn't configured -- set MERIT_SMTP_HOST and MERIT_FROM_EMAIL (see backend/README.md).",
        )

    pending = db.query(models.WaitlistSignup).filter(models.WaitlistSignup.notified_at.is_(None)).all()
    sent = failed = 0
    for signup in pending:
        if dry_run:
            sent += 1
            continue
        try:
            email.send_email(signup.email, _NOTIFY_SUBJECT, _NOTIFY_HTML, _NOTIFY_TEXT)
        except smtplib.SMTPException:
            failed += 1
            continue
        signup.notified_at = utcnow()
        sent += 1
    if not dry_run:
        db.commit()
    return schemas.NotifyWaitlistResult(sent=sent, failed=failed, dry_run=dry_run)
