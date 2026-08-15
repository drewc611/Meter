"""The read API the dashboard consumes. Every endpoint reads the current
period's materialized PersonScore rows via services.analytics, scoped to
the calling user's own Organization."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_current_user, get_db, resolve_org_id
from ..periods import current_period, period_n_months_ago, prior_period, recent_periods
from ..services import analytics, forecasting

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/overview", response_model=schemas.OverviewOut)
def overview(db: Session = Depends(get_db), user: models.DashboardUser | None = Depends(get_current_user)):
    org_id = resolve_org_id(db, user)
    start, end = current_period()
    prior_start, prior_end = prior_period(start)
    prior_total = analytics.get_total_spend(db, org_id, prior_start, prior_end) or None
    return analytics.get_overview(db, org_id, start, end, prior_total_spend=prior_total)


@router.get("/people", response_model=list[schemas.PersonOut])
def people(
    months_ago: int = 0,
    db: Session = Depends(get_db),
    user: models.DashboardUser | None = Depends(get_current_user),
):
    org_id = resolve_org_id(db, user)
    start, end = period_n_months_ago(max(0, min(months_ago, 23)))
    return analytics.get_people(db, org_id, start, end)


@router.get("/teams", response_model=list[schemas.AggOut])
def teams(db: Session = Depends(get_db), user: models.DashboardUser | None = Depends(get_current_user)):
    org_id = resolve_org_id(db, user)
    start, end = current_period()
    return analytics.get_teams(db, org_id, start, end)


@router.get("/roles", response_model=list[schemas.AggOut])
def roles(db: Session = Depends(get_db), user: models.DashboardUser | None = Depends(get_current_user)):
    org_id = resolve_org_id(db, user)
    start, end = current_period()
    return analytics.get_roles(db, org_id, start, end)


@router.get("/trends", response_model=list[schemas.TrendPointOut])
def trends(
    months: int = 6,
    db: Session = Depends(get_db),
    user: models.DashboardUser | None = Depends(get_current_user),
):
    org_id = resolve_org_id(db, user)
    months = max(1, min(months, 24))
    return analytics.get_trends(db, org_id, recent_periods(months))


@router.get("/tool-breakdown", response_model=list[schemas.ToolBreakdownOut])
def tool_breakdown(db: Session = Depends(get_db), user: models.DashboardUser | None = Depends(get_current_user)):
    org_id = resolve_org_id(db, user)
    start, end = current_period()
    return analytics.get_tool_breakdown(db, org_id, start, end)


@router.get("/tool-performance", response_model=list[schemas.ToolPerformanceOut])
def tool_performance(db: Session = Depends(get_db), user: models.DashboardUser | None = Depends(get_current_user)):
    org_id = resolve_org_id(db, user)
    start, end = current_period()
    return analytics.get_tool_performance(db, org_id, start, end)


@router.get("/spend-forecast", response_model=schemas.SpendForecastOut)
def spend_forecast(
    months: int = 6,
    db: Session = Depends(get_db),
    user: models.DashboardUser | None = Depends(get_current_user),
):
    org_id = resolve_org_id(db, user)
    months = max(3, min(months, 24))
    trend_points = analytics.get_trends(db, org_id, recent_periods(months))
    forecast = forecasting.forecast_spend_ml(trend_points) or analytics.forecast_next_period_spend(trend_points)
    if forecast is None:
        return schemas.SpendForecastOut(available=False)
    return schemas.SpendForecastOut(available=True, **forecast)


@router.get("/adoption", response_model=schemas.AdoptionOut)
def adoption(db: Session = Depends(get_db), user: models.DashboardUser | None = Depends(get_current_user)):
    org_id = resolve_org_id(db, user)
    start, end = current_period()
    return analytics.get_adoption(db, org_id, start, end)
