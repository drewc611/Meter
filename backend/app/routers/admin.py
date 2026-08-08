"""Admin endpoints: manual identity mapping and the scoring-job entry point."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_db
from ..periods import current_period
from ..services import scoring

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/identity-mapping", status_code=201, response_model=schemas.IdentityMapped)
def map_identity(body: schemas.IdentityMappingIn, db: Session = Depends(get_db)):
    """Wire a new external id (a fresh API key, a bot account) to an existing person."""
    ident = db.query(models.Identity).filter_by(email=body.email).one_or_none()
    if not ident:
        raise HTTPException(status_code=404, detail=f"No Identity with email {body.email}. Provision via SCIM first.")
    mapping = models.IdentityMapping(
        identity_id=ident.id, source_system=body.source_system, external_id=body.external_id
    )
    db.add(mapping)
    db.commit()
    return schemas.IdentityMapped(identity_id=ident.id)


@router.post("/recompute-scores", response_model=schemas.RecomputeResult)
def recompute(
    start: datetime | None = None,
    end: datetime | None = None,
    db: Session = Depends(get_db),
):
    """
    Nightly job entry point — wire this to a scheduler (cron, Airflow, a
    simple `while True: sleep(86400)` worker, whatever the deployment uses).
    """
    if start is None or end is None:
        start, end = current_period()
    n = scoring.recompute_all(db, start, end)
    return schemas.RecomputeResult(period_start=start, period_end=end, people_scored=n)
