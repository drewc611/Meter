"""Pydantic response/request models — the API contract the frontend codes against."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UsageEventIn(BaseModel):
    source_system: str          # "anthropic_api" | "openai_api" | "github_copilot" | "chatgpt_enterprise"
    external_id: str             # the id in that source system (api key id, seat email, etc.)
    tool: str
    cost_usd: float
    model: Optional[str] = None
    tokens_in: int = 0
    tokens_out: int = 0
    occurred_at: Optional[datetime] = None


class OutcomeEventIn(BaseModel):
    source_system: str
    external_id: str
    source: str                    # "github" | "jira" | "zendesk" | "hubspot"
    outcome_type: str               # see models.OUTCOME_VALUE_WEIGHTS
    occurred_at: Optional[datetime] = None
    external_ref: Optional[str] = None
    value_weight: Optional[float] = None


class QualitySignalIn(BaseModel):
    source_system: str
    external_id: str
    signal_type: str                # see models.QUALITY_SIGNAL_WEIGHTS
    occurred_at: Optional[datetime] = None
    external_ref: Optional[str] = None
    severity: Optional[float] = None


class IdentityMappingIn(BaseModel):
    email: str
    source_system: str
    external_id: str


class PersonOut(BaseModel):
    id: int
    name: str
    team: str
    role: str
    tier: str
    spend_usd: float
    value_per_dollar: float
    slop_risk: float
    confidence: str
    segment: str
    recommendation: str


class AggOut(BaseModel):
    name: str
    people_count: int
    spend_usd: float
    value_per_dollar: float
    slop_risk: float


class OverviewOut(BaseModel):
    period_start: datetime
    period_end: datetime
    total_spend_usd: float
    spend_change_pct: float
    blended_value_per_dollar: float
    avg_slop_risk: float
    recoverable_annual_usd: float
    recoverable_breakdown: List[dict]
    fund_count: int
    coach_count: int
    learn_count: int
    people: List[PersonOut]
