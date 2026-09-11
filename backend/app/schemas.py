"""Pydantic request/response models — the API contract the frontend codes against."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# bcrypt hashes at most 72 *bytes* and raises ValueError past that, so both
# password fields below are capped here -- an oversized password is then a
# clean 422 at the validation layer instead of ever reaching bcrypt (where
# it used to become a 500, and on /auth/login an account-existence oracle:
# an unknown email short-circuits to 401 without hashing anything).
# Field(max_length=...) counts characters, so _bcrypt_safe_password also
# checks the encoded length for multibyte passwords.
BCRYPT_MAX_PASSWORD_BYTES = 72

# Every free-text field below is bounded. None of them have a natural length --
# a display name, a tool slug, an external id -- and unbounded means a single
# request can park megabytes in the database, in a log line and in every later
# response that reads the row back. 200 is the cap the waitlist fields already
# used; external identifiers get more room because some of them are URLs.
MAX_NAME_LENGTH = 200
MAX_IDENTIFIER_LENGTH = 500


def _bcrypt_safe_password(v: str) -> str:
    if len(v.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
        raise ValueError(f"password must be at most {BCRYPT_MAX_PASSWORD_BYTES} bytes")
    return v


def _validated_email(v: str) -> str:
    """Deliberately not pydantic's EmailStr -- that needs the optional
    email-validator dependency, which isn't installed. This is a lightweight
    sanity check, not RFC 5321 validation; the real bar is "does mail actually
    land," which no amount of regex checking here can guarantee anyway.

    It does have to reject *control characters*, though, and checking only for
    a literal space did not. An address containing a newline passed validation,
    got stored, and then made every later /admin/notify-waitlist run raise
    HeaderParseError from the email library -- a 500 that aborted the whole
    send before any notified_at was committed, so one poisoned row disabled the
    announcement permanently and re-sent to everyone already emailed.
    """
    v = v.strip()
    if "@" not in v or len(v) > 254:
        raise ValueError("not a valid email address")
    if any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in v):
        raise ValueError("not a valid email address")
    return v


# ------------------------------------------------------------- requests


class WaitlistSignupIn(BaseModel):
    email: str
    company: str | None = Field(default=None, max_length=200)
    # e.g. "challenge-paid-track" for the /challenge interest form
    source: str = Field(default="coming-soon", max_length=200)

    @field_validator("email")
    @classmethod
    def _basic_email_shape(cls, v: str) -> str:
        return _validated_email(v)


class UsageEventIn(BaseModel):
    # "anthropic_api" | "openai_api" | "github_copilot" | "chatgpt_enterprise"
    source_system: str = Field(max_length=MAX_NAME_LENGTH)
    # the id in that source system (api key id, seat email, etc.)
    external_id: str = Field(max_length=MAX_IDENTIFIER_LENGTH)
    tool: str = Field(max_length=MAX_NAME_LENGTH)
    cost_usd: float
    model: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    tokens_in: int = 0
    tokens_out: int = 0
    occurred_at: datetime | None = None


class OutcomeEventIn(BaseModel):
    source_system: str = Field(max_length=MAX_NAME_LENGTH)
    external_id: str = Field(max_length=MAX_IDENTIFIER_LENGTH)
    source: str = Field(max_length=MAX_NAME_LENGTH)  # "github" | "jira" | "zendesk" | "hubspot"
    outcome_type: str = Field(max_length=MAX_NAME_LENGTH)  # see constants.OUTCOME_VALUE_WEIGHTS
    occurred_at: datetime | None = None
    external_ref: str | None = Field(default=None, max_length=MAX_IDENTIFIER_LENGTH)
    value_weight: float | None = None


class QualitySignalIn(BaseModel):
    source_system: str = Field(max_length=MAX_NAME_LENGTH)
    external_id: str = Field(max_length=MAX_IDENTIFIER_LENGTH)
    signal_type: str = Field(max_length=MAX_NAME_LENGTH)  # see constants.QUALITY_SIGNAL_WEIGHTS
    occurred_at: datetime | None = None
    external_ref: str | None = Field(default=None, max_length=MAX_IDENTIFIER_LENGTH)
    severity: float | None = None


class IdentityMappingIn(BaseModel):
    email: str
    source_system: str = Field(max_length=MAX_NAME_LENGTH)
    external_id: str = Field(max_length=MAX_IDENTIFIER_LENGTH)

    @field_validator("email")
    @classmethod
    def _basic_email_shape(cls, v: str) -> str:
        return _validated_email(v)


class SignupIn(BaseModel):
    email: str
    password: str = Field(max_length=BCRYPT_MAX_PASSWORD_BYTES)
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    signup_code: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)

    @field_validator("email")
    @classmethod
    def _basic_email_shape(cls, v: str) -> str:
        return _validated_email(v)

    @field_validator("password")
    @classmethod
    def _length_bounds(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return _bcrypt_safe_password(v)


class LoginIn(BaseModel):
    email: str
    password: str = Field(max_length=BCRYPT_MAX_PASSWORD_BYTES)

    @field_validator("password")
    @classmethod
    def _max_bytes(cls, v: str) -> str:
        return _bcrypt_safe_password(v)


# ------------------------------------------------------------- responses


class WaitlistSignupOut(BaseModel):
    status: str = "joined"


class WaitlistEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # constructed from WaitlistSignup ORM rows, not a dict

    email: str
    company: str | None
    source: str
    created_at: datetime
    notified_at: datetime | None


class WaitlistListOut(BaseModel):
    count: int
    entries: list[WaitlistEntryOut]


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    has_password: bool
    has_google: bool
    is_admin: bool
    org_id: int
    org_name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class OrgOut(BaseModel):
    id: int
    name: str
    plan: str
    ingest_token: str
    created_at: datetime


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
    recommendation_code: str


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
    value_threshold: float
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
    model: str = "linear_trend"
    confidence_low_usd: float | None = None
    confidence_high_usd: float | None = None


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
