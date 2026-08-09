"""
Core data model — mirrors §7 of the Merit product spec.

Identity -> Team / Role         (who someone is)
UsageEvent                       (a dollar spent, attributed to an Identity)
OutcomeEvent                     (Tier 1: work that landed — PR merged, ticket closed)
QualitySignal                    (Tier 2: what happened to AI-touched output after the fact)
PersonScore                      (materialized nightly: value/$ + slop risk, what the API/UI reads)

IdentityMapping is the load-bearing table: every external system (an LLM proxy API key,
a GitHub login, a Zendesk agent id) maps to exactly one canonical Identity. Attribution
is only as good as this table — see services/ingest.py for how it gets populated.

The outcome/quality weight tables that used to live here now live in constants.py.
"""

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base
from .time_utils import utcnow


class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)


class Identity(Base):
    """A real person, resolved once across every tool they touch."""

    __tablename__ = "identities"
    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)  # e.g. "Senior Engineer"
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    tier = Column(String, default="Standard")  # AI seat tier: Basic / Standard / Frontier
    created_at = Column(DateTime, default=utcnow)

    team = relationship("Team")
    mappings = relationship("IdentityMapping", back_populates="identity")


class IdentityMapping(Base):
    """
    Resolves an external-system identifier to a canonical Identity.
    Populated from SSO/SCIM on employee provisioning, plus a per-tool
    mapping step when a new API key / bot account is issued.
    """

    __tablename__ = "identity_mappings"
    id = Column(Integer, primary_key=True)
    identity_id = Column(Integer, ForeignKey("identities.id"), nullable=False)
    source_system = Column(String, nullable=False)  # "anthropic_api", "github", "zendesk", "okta"
    external_id = Column(String, nullable=False)  # api key id, github login, agent id, sso subject
    identity = relationship("Identity", back_populates="mappings")

    __table_args__ = (UniqueConstraint("source_system", "external_id", name="uq_source_external"),)


class UsageEvent(Base):
    """One AI usage event: a completion, a Copilot suggestion accepted, a seat-month of ChatGPT."""

    __tablename__ = "usage_events"
    id = Column(Integer, primary_key=True)
    identity_id = Column(Integer, ForeignKey("identities.id"), nullable=False)
    tool = Column(String, nullable=False)  # "anthropic_api", "github_copilot", "chatgpt_enterprise"
    model = Column(String, nullable=True)  # "claude-opus-4", "gpt-4.1", null for flat-fee seats
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    cost_usd = Column(Float, nullable=False)
    occurred_at = Column(DateTime, nullable=False)
    ingested_at = Column(DateTime, default=utcnow)


class OutcomeEvent(Base):
    """
    Tier 1 signal. Pulled from systems of record the company already runs
    (GitHub/GitLab, Jira/Linear, Zendesk, Salesforce/HubSpot) via their webhooks
    or a nightly pull. Not AI-specific — Merit correlates these against nearby
    UsageEvents rather than requiring the source system to say "AI wrote this".

    value_weight is resolved at ingest time from constants.OUTCOME_VALUE_WEIGHTS
    (or an explicit override) and stored, so a later change to the weight table
    does not silently rewrite history.
    """

    __tablename__ = "outcome_events"
    id = Column(Integer, primary_key=True)
    identity_id = Column(Integer, ForeignKey("identities.id"), nullable=False)
    source = Column(String, nullable=False)  # "github", "jira", "zendesk", "hubspot"
    outcome_type = Column(String, nullable=False)  # key into constants.OUTCOME_VALUE_WEIGHTS
    value_weight = Column(Float, nullable=False)
    occurred_at = Column(DateTime, nullable=False)
    external_ref = Column(String, nullable=True)  # PR url, ticket id, deal id — for drill-down
    ingested_at = Column(DateTime, default=utcnow)


class QualitySignal(Base):
    """
    Tier 2 signal: what happened to a specific AI-touched output after it shipped.
    One row per observed event; PersonScore aggregates these into a 0-100 Slop Risk Score.
    """

    __tablename__ = "quality_signals"
    id = Column(Integer, primary_key=True)
    identity_id = Column(Integer, ForeignKey("identities.id"), nullable=False)
    signal_type = Column(String, nullable=False)  # key into constants.QUALITY_SIGNAL_WEIGHTS
    severity = Column(Float, nullable=False)  # 0-1, defaults to the type's weight
    occurred_at = Column(DateTime, nullable=False)
    external_ref = Column(String, nullable=True)
    ingested_at = Column(DateTime, default=utcnow)


class RubricGrade(Base):
    """
    Tier 3 (optional): a sampled output graded against a rubric — human, LLM-judge,
    or both. High confidence, low volume. Used to calibrate Tier 1/2 weights over time
    (see services/scoring.calibrate_weights, stubbed).
    """

    __tablename__ = "rubric_grades"
    id = Column(Integer, primary_key=True)
    identity_id = Column(Integer, ForeignKey("identities.id"), nullable=False)
    grader = Column(String, nullable=False)  # "human:jsmith" or "llm:claude-opus-4"
    rubric_version = Column(String, nullable=False)
    score = Column(Float, nullable=False)  # 0-100
    notes = Column(Text, nullable=True)
    sample_ref = Column(String, nullable=True)
    graded_at = Column(DateTime, default=utcnow)


class WaitlistSignup(Base):
    """
    Pre-launch lead capture from the coming-soon page (frontend/index.html).
    Deliberately outside the product data model above -- not tied to an
    Identity, since a waitlist signup happens before anyone's a customer.
    See routers/waitlist.py: this is the one router mounted without the
    MERIT_API_KEY gate, since anonymous visitors have no token.
    """

    __tablename__ = "waitlist_signups"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    company = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class PersonScore(Base):
    """
    Materialized output of the nightly scoring job (see services/scoring.recompute_all).
    This is the table the dashboard API actually reads — computing value/$ and
    slop risk live on every page load doesn't scale past a few hundred people.
    One row per (identity, period).
    """

    __tablename__ = "person_scores"
    id = Column(Integer, primary_key=True)
    identity_id = Column(Integer, ForeignKey("identities.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    spend_usd = Column(Float, nullable=False)
    value_per_dollar = Column(Float, nullable=False)  # normalized to company median = 1.0x
    slop_risk = Column(Float, nullable=False)  # 0-100
    confidence = Column(String, nullable=False)  # "tier1" | "tier1+2" | "tier1+2+3"
    computed_at = Column(DateTime, default=utcnow)

    identity = relationship("Identity")

    __table_args__ = (UniqueConstraint("identity_id", "period_start", "period_end", name="uq_person_period"),)
