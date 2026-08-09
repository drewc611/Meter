"""The read API the dashboard consumes. Every endpoint reads the current
period's materialized PersonScore rows via services.analytics."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_db
from ..periods import current_period, prior_period, recent_periods
from ..services import analytics

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/overview", response_model=schemas.OverviewOut)
def overview(db: Session = Depends(get_db)):
    start, end = current_period()
    prior_start, prior_end = prior_period(start)
    prior_scores = analytics._latest_scores(db, prior_start, prior_end)
    prior_total = sum(s.spend_usd for s in prior_scores) or None
    return analytics.get_overview(db, start, end, prior_total_spend=prior_total)


@router.get("/people", response_model=list[schemas.PersonOut])
def people(db: Session = Depends(get_db)):
    start, end = current_period()
    return analytics.get_people(db, start, end)


@router.get("/teams", response_model=list[schemas.AggOut])
def teams(db: Session = Depends(get_db)):
    start, end = current_period()
    return analytics.get_teams(db, start, end)


@router.get("/roles", response_model=list[schemas.AggOut])
def roles(db: Session = Depends(get_db)):
    start, end = current_period()
    return analytics.get_roles(db, start, end)


@router.get("/trends", response_model=list[schemas.TrendPointOut])
def trends(months: int = 6, db: Session = Depends(get_db)):
    months = max(1, min(months, 24))
    return analytics.get_trends(db, recent_periods(months))


@router.get("/tool-breakdown", response_model=list[schemas.ToolBreakdownOut])
def tool_breakdown(db: Session = Depends(get_db)):
    start, end = current_period()
    return analytics.get_tool_breakdown(db, start, end)


@router.get("/tool-performance", response_model=list[schemas.ToolPerformanceOut])
def tool_performance(db: Session = Depends(get_db)):
    start, end = current_period()
    return analytics.get_tool_performance(db, start, end)


@router.get("/spend-forecast", response_model=schemas.SpendForecastOut)
def spend_forecast(months: int = 6, db: Session = Depends(get_db)):
    months = max(3, min(months, 24))
    trend_points = analytics.get_trends(db, recent_periods(months))
    forecast = analytics.forecast_next_period_spend(trend_points)
    if forecast is None:
        return schemas.SpendForecastOut(available=False)
    return schemas.SpendForecastOut(available=True, **forecast)


@router.get("/adoption", response_model=schemas.AdoptionOut)
def adoption(db: Session = Depends(get_db)):
    start, end = current_period()
    return analytics.get_adoption(db, start, end)
