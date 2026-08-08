"""The three ingestion endpoints — spend, outcomes, quality signals.

All three return 422 if the external id has no IdentityMapping yet: an unmapped
id is a shadow-AI candidate (§5.5 of the spec), not a silently dropped event.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..constants import OUTCOME_VALUE_WEIGHTS
from ..dependencies import get_db
from ..services import ingest

router = APIRouter(tags=["ingestion"])


@router.post("/ingest/usage", status_code=201, response_model=schemas.IngestAccepted)
def post_usage(evt: schemas.UsageEventIn, db: Session = Depends(get_db)):
    try:
        row = ingest.ingest_usage_event(
            db,
            source_system=evt.source_system,
            external_id=evt.external_id,
            tool=evt.tool,
            cost_usd=evt.cost_usd,
            model=evt.model,
            tokens_in=evt.tokens_in,
            tokens_out=evt.tokens_out,
            occurred_at=evt.occurred_at,
        )
    except ingest.UnresolvedIdentityError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return schemas.IngestAccepted(id=row.id)


@router.post("/ingest/outcome", status_code=201, response_model=schemas.IngestAccepted)
def post_outcome(evt: schemas.OutcomeEventIn, db: Session = Depends(get_db)):
    if evt.outcome_type not in OUTCOME_VALUE_WEIGHTS and evt.value_weight is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown outcome_type '{evt.outcome_type}' — pass value_weight explicitly to use a custom type.",
        )
    try:
        row = ingest.ingest_outcome_event(
            db,
            source_system=evt.source_system,
            external_id=evt.external_id,
            source=evt.source,
            outcome_type=evt.outcome_type,
            occurred_at=evt.occurred_at,
            external_ref=evt.external_ref,
            value_weight=evt.value_weight,
        )
    except ingest.UnresolvedIdentityError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return schemas.IngestAccepted(id=row.id)


@router.post("/ingest/quality-signal", status_code=201, response_model=schemas.IngestAccepted)
def post_quality_signal(evt: schemas.QualitySignalIn, db: Session = Depends(get_db)):
    try:
        row = ingest.ingest_quality_signal(
            db,
            source_system=evt.source_system,
            external_id=evt.external_id,
            signal_type=evt.signal_type,
            occurred_at=evt.occurred_at,
            external_ref=evt.external_ref,
            severity=evt.severity,
        )
    except ingest.UnresolvedIdentityError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return schemas.IngestAccepted(id=row.id)
