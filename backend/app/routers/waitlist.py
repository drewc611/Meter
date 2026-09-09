"""
Pre-launch lead capture from the coming-soon page. Deliberately the one
router NOT gated by dependencies.require_api_key (see main.py) -- an
anonymous visitor filling out a signup form has no bearer token, and
shouldn't need one.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_db

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.post("", status_code=201, response_model=schemas.WaitlistSignupOut)
def join_waitlist(body: schemas.WaitlistSignupIn, db: Session = Depends(get_db)):
    """Idempotent per email: re-submitting updates company/source in place
    (the latest interest wins) rather than erroring or tracking duplicate
    rows -- so someone already on the general waitlist who later signs up
    for a specific interest list (e.g. the /challenge paid track) still
    shows up under that source."""
    existing = db.query(models.WaitlistSignup).filter_by(email=body.email).one_or_none()
    if existing is None:
        db.add(models.WaitlistSignup(email=body.email, company=body.company, source=body.source))
    else:
        existing.company = body.company or existing.company  # don't blank out a prior value with an empty form
        existing.source = body.source
    db.commit()
    return schemas.WaitlistSignupOut()
