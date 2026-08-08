"""
Meter API — FastAPI app wiring ingestion, scoring, and the read endpoints
the dashboard consumes. Run with:

    uvicorn app.main:app --reload --port 8000

CORS is wide open here because this is a local demo served to a static HTML
file (file:// origin); lock this to your actual frontend origin(s) before
this ever sees real customer data.
"""
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, ingest, scoring, api
from .database import engine, get_db, Base
from .periods import current_period, prior_period

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Meter API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- ingestion

@app.post("/ingest/usage", status_code=201)
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
        raise HTTPException(status_code=422, detail=str(e))
    return {"id": row.id, "status": "ingested"}


@app.post("/ingest/outcome", status_code=201)
def post_outcome(evt: schemas.OutcomeEventIn, db: Session = Depends(get_db)):
    if evt.outcome_type not in models.OUTCOME_VALUE_WEIGHTS and evt.value_weight is None:
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
        raise HTTPException(status_code=422, detail=str(e))
    return {"id": row.id, "status": "ingested"}


@app.post("/ingest/quality-signal", status_code=201)
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
        raise HTTPException(status_code=422, detail=str(e))
    return {"id": row.id, "status": "ingested"}


# ------------------------------------------------------------------- admin

@app.post("/admin/identity-mapping", status_code=201)
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
    return {"status": "mapped", "identity_id": ident.id}


@app.post("/admin/recompute-scores")
def recompute(start: datetime | None = None, end: datetime | None = None, db: Session = Depends(get_db)):
    """
    Nightly job entry point — wire this to a scheduler (cron, Airflow, a
    simple `while True: sleep(86400)` worker, whatever the deployment uses).
    """
    if start is None or end is None:
        start, end = current_period()
    n = scoring.recompute_all(db, start, end)
    return {"period_start": start, "period_end": end, "people_scored": n}


# --------------------------------------------------------------------- api

@app.get("/api/overview", response_model=schemas.OverviewOut)
def overview(db: Session = Depends(get_db)):
    start, end = current_period()
    prior_start, prior_end = prior_period(start)
    prior_scores = api._latest_scores(db, prior_start, prior_end)
    prior_total = sum(s.spend_usd for s in prior_scores) or None
    return api.get_overview(db, start, end, prior_total_spend=prior_total)


@app.get("/api/people")
def people(db: Session = Depends(get_db)):
    start, end = current_period()
    return api.get_people(db, start, end)


@app.get("/api/teams")
def teams(db: Session = Depends(get_db)):
    start, end = current_period()
    return api.get_teams(db, start, end)


@app.get("/api/roles")
def roles(db: Session = Depends(get_db)):
    start, end = current_period()
    return api.get_roles(db, start, end)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
