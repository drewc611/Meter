"""
Core data model — mirrors §7 of the Merit AC product spec.

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

import secrets

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base
from .time_utils import utcnow


class Organization(Base):
    """The tenant boundary -- every Team/Identity/DashboardUser/PersonScore
    row belongs to exactly one Organization, and no query ever crosses that
    line. A company deployment has one Organization shared by everyone who
    signs up with the right MERIT_SIGNUP_CODE; an individual signing up on
    a public deployment (no code set) gets a brand-new one of their own.
    See routers/auth.py for which case applies on signup.

    ingest_token authenticates /ingest/* for this org (see
    dependencies.require_api_key) -- the multi-tenant replacement for the
    old single shared MERIT_API_KEY secret."""

    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    plan = Column(String, nullable=False, default="personal")
    ingest_token = Column(String, unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    created_at = Column(DateTime, default=utcnow)


class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_team_org_name"),)


class Identity(Base):
    """A real person, resolved once across every tool they touch."""

    __tablename__ = "identities"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)  # e.g. "Senior Engineer"
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    tier = Column(String, default="Standard")  # AI seat tier: Basic / Standard / Frontier
    created_at = Column(DateTime, default=utcnow)

    team = relationship("Team")
    mappings = relationship("IdentityMapping", back_populates="identity")

    __table_args__ = (UniqueConstraint("org_id", "email", name="uq_identity_org_email"),)


class IdentityMapping(Base):
    """
    Resolves an external-system identifier to a canonical Identity.
    Populated from SSO/SCIM on employee provisioning, plus a per-tool
    mapping step when a new API key / bot account is issued.

    org_id is duplicated from the target Identity rather than joined,
    because resolve_identity() has to disambiguate by org *before* it
    knows which Identity it's resolving to -- it's set once, from the
    same request that already knows the org, alongside identity_id.
    """

    __tablename__ = "identity_mappings"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    identity_id = Column(Integer, ForeignKey("identities.id"), nullable=False)
    source_system = Column(String, nullable=False)  # "anthropic_api", "github", "zendesk", "okta"
    external_id = Column(String, nullable=False)  # api key id, github login, agent id, sso subject
    identity = relationship("Identity", back_populates="mappings")

    __table_args__ = (UniqueConstraint("org_id", "source_system", "external_id", name="uq_source_external"),)


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
    or a nightly pull. Not AI-specific — Merit AC correlates these against nearby
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


class DashboardUser(Base):
    """Someone who can log into the dashboard -- separate from Identity (a
    person being tracked). password_hash/google_sub are both nullable so a
    password account can later link Google, or vice versa, without a
    second row. See services/auth.py.

    email stays globally unique (not scoped to org_id) -- it's the login
    identifier, one flat namespace across the whole product regardless of
    which org the account belongs to."""

    __tablename__ = "dashboard_users"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)
    google_sub = Column(String, unique=True, nullable=True)  # Google's stable per-account id ("sub" claim)
    # Gates /admin/* (routers/admin.py) via dependencies.require_admin -- see
    # routers/auth.py for how this gets set on creation.
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow)

    org = relationship("Organization")


class WaitlistSignup(Base):
    """Pre-launch lead capture from the coming-soon page -- not tied to an
    Identity. See routers/waitlist.py."""

    __tablename__ = "waitlist_signups"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    company = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    notified_at = Column(DateTime, nullable=True)  # set by /admin/notify-waitlist, so a re-run doesn't double-email


class PersonScore(Base):
    """
    Materialized output of the nightly scoring job (see services/scoring.recompute_all).
    This is the table the dashboard API actually reads — computing value/$ and
    slop risk live on every page load doesn't scale past a few hundred people.
    One row per (identity, period).

    org_id is duplicated from the owning Identity rather than joined, since
    this is the hottest read path in the app (every /api/* call filters on
    it) and it's rewritten from scratch on every recompute -- no drift risk.
    """

    __tablename__ = "person_scores"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
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
