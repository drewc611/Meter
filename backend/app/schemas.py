"""Pydantic request/response models — the API contract the frontend codes against."""

from datetime import datetime

from pydantic import BaseModel, field_validator

# ------------------------------------------------------------- requests


class WaitlistSignupIn(BaseModel):
    email: str
    company: str | None = None

    @field_validator("email")
    @classmethod
    def _basic_email_shape(cls, v: str) -> str:
        # Deliberately not pydantic's EmailStr -- that needs the optional
        # email-validator dependency, which isn't installed. This is a
        # lightweight sanity check for a pre-launch signup form, not RFC 5321
        # validation; the real bar is "does mail actually land," which no
        # amount of regex checking here can guarantee anyway.
        v = v.strip()
        if "@" not in v or " " in v or len(v) > 254:
            raise ValueError("not a valid email address")
        return v


class UsageEventIn(BaseModel):
    source_system: str  # "anthropic_api" | "openai_api" | "github_copilot" | "chatgpt_enterprise"
    external_id: str  # the id in that source system (api key id, seat email, etc.)
    tool: str
    cost_usd: float
    model: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    occurred_at: datetime | None = None


class OutcomeEventIn(BaseModel):
    source_system: str
    external_id: str
    source: str  # "github" | "jira" | "zendesk" | "hubspot"
    outcome_type: str  # see constants.OUTCOME_VALUE_WEIGHTS
    occurred_at: datetime | None = None
    external_ref: str | None = None
    value_weight: float | None = None


class QualitySignalIn(BaseModel):
    source_system: str
    external_id: str
    signal_type: str  # see constants.QUALITY_SIGNAL_WEIGHTS
    occurred_at: datetime | None = None
    external_ref: str | None = None
    severity: float | None = None


class IdentityMappingIn(BaseModel):
    email: str
    source_system: str
    external_id: str


class SignupIn(BaseModel):
    email: str
    password: str
    name: str
    signup_code: str | None = None

    @field_validator("email")
    @classmethod
    def _basic_email_shape(cls, v: str) -> str:
        v = v.strip()
        if "@" not in v or " " in v or len(v) > 254:
            raise ValueError("not a valid email address")
        return v

    @field_validator("password")
    @classmethod
    def _min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


# ------------------------------------------------------------- responses


class WaitlistSignupOut(BaseModel):
    status: str = "joined"


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    has_password: bool
    has_google: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class IngestAccepted(BaseModel):
    id: int
    status: str = "ingested"


class IdentityMapped(BaseModel):
    status: str = "mapped"
    identity_id: int


class RecomputeResult(BaseModel):
    period_start: datetime
    period_end: datetime
    people_scored: int


class NotifyWaitlistResult(BaseModel):
    sent: int
    failed: int
    dry_run: bool


class HealthOut(BaseModel):
    status: str = "ok"


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


class RecoverableItem(BaseModel):
    label: str
    amount_usd: float


class OverviewOut(BaseModel):
    period_start: datetime
    period_end: datetime
    total_spend_usd: float
    spend_change_pct: float
    blended_value_per_dollar: float
    avg_slop_risk: float
    rework_tax_pct: float
    recoverable_annual_usd: float
    recoverable_breakdown: list[RecoverableItem]
    fund_count: int
    coach_count: int
    learn_count: int
    confidence_breakdown: dict[str, int]
    people: list[PersonOut]


class TrendPointOut(BaseModel):
    period_start: datetime
    period_end: datetime
    total_spend_usd: float
    blended_value_per_dollar: float
    avg_slop_risk: float
    people_scored: int


class ToolBreakdownOut(BaseModel):
    tool: str
    model: str | None
    spend_usd: float
    event_count: int


class ToolPerformanceOut(BaseModel):
    tool: str
    spend_usd: float
    value_per_dollar: float
    slop_risk: float
    people_count: int


class SpendForecastOut(BaseModel):
    available: bool
    projected_spend_usd: float = 0.0
    trend_direction: str = "insufficient_data"
    based_on_periods: int = 0


class AdoptionTierOut(BaseModel):
    tier: str
    total_seats: int
    active_users: int
    utilization_pct: float


class AdoptionOut(BaseModel):
    total_seats: int
    active_users: int
    utilization_pct: float
    by_tier: list[AdoptionTierOut]
