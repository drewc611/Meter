"""
Ingestion layer — where external systems become UsageEvent / OutcomeEvent /
QualitySignal rows. Three independent paths feed this, matching §8 of the spec:

  1. Spend/usage   — an LLM proxy or provider billing export calls /ingest/usage
                      for every completion (see proxy_example.py for a concrete
                      middleware that does this against the Anthropic API).
  2. Outcomes      — GitHub/Jira/Zendesk/HubSpot webhooks call /ingest/outcome
                      when a PR merges, a ticket closes, a deal advances.
  3. Quality       — either derived server-side from outcome patterns (a PR that
                      gets reverted within N days auto-generates a QualitySignal)
                      or pushed directly by an integration that already computes
                      it (e.g. a code-review bot flags high rework).

The one thing every path shares: they identify the actor by an *external id*
(an API key id, a GitHub login, an Okta subject) and resolve_identity() is
what turns that into a canonical Identity row. Get this wrong and every
number downstream is attributed to the wrong person.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from ..constants import OUTCOME_VALUE_WEIGHTS, QUALITY_SIGNAL_WEIGHTS
from ..models import Identity, IdentityMapping, OutcomeEvent, QualitySignal, UsageEvent
from ..time_utils import utcnow

# A reverted PR is both a negative Tier-1 outcome and a Tier-2 quality signal;
# this maps the outcome type to the quality signal it auto-derives.
_AUTO_QUALITY_FROM_OUTCOME = {"pr_reverted": "code_reverted"}


class UnresolvedIdentityError(Exception):
    """Raised when an external id has no IdentityMapping row yet.
    Callers should route this to a 'shadow AI / unmapped user' queue
    (§5.5 of the spec) rather than dropping the event."""


def resolve_identity(db: Session, source_system: str, external_id: str) -> Identity:
    mapping = db.query(IdentityMapping).filter_by(source_system=source_system, external_id=external_id).one_or_none()
    if mapping is None:
        raise UnresolvedIdentityError(
            f"No identity mapped for {source_system}:{external_id}. "
            f"Provision via SCIM sync or map manually before usage can be attributed."
        )
    return mapping.identity


def ingest_usage_event(
    db: Session,
    *,
    source_system: str,
    external_id: str,
    tool: str,
    cost_usd: float,
    model: str | None = None,
    tokens_in: int = 0,
    tokens_out: int = 0,
    occurred_at: datetime | None = None,
) -> UsageEvent:
    identity = resolve_identity(db, source_system, external_id)
    event = UsageEvent(
        identity_id=identity.id,
        tool=tool,
        model=model,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost_usd,
        occurred_at=occurred_at or utcnow(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def ingest_outcome_event(
    db: Session,
    *,
    source_system: str,
    external_id: str,
    source: str,
    outcome_type: str,
    occurred_at: datetime | None = None,
    external_ref: str | None = None,
    value_weight: float | None = None,
) -> OutcomeEvent:
    identity = resolve_identity(db, source_system, external_id)
    weight = value_weight if value_weight is not None else OUTCOME_VALUE_WEIGHTS.get(outcome_type, 0.0)
    event = OutcomeEvent(
        identity_id=identity.id,
        source=source,
        outcome_type=outcome_type,
        value_weight=weight,
        occurred_at=occurred_at or utcnow(),
        external_ref=external_ref,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Auto-derivation path described in the module docstring: some outcomes are
    # also a Tier-2 quality signal from the same webhook payload.
    auto_signal = _AUTO_QUALITY_FROM_OUTCOME.get(outcome_type)
    if auto_signal:
        db.add(
            QualitySignal(
                identity_id=identity.id,
                signal_type=auto_signal,
                severity=QUALITY_SIGNAL_WEIGHTS[auto_signal],
                occurred_at=event.occurred_at,
                external_ref=external_ref,
            )
        )
        db.commit()

    return event


def ingest_quality_signal(
    db: Session,
    *,
    source_system: str,
    external_id: str,
    signal_type: str,
    occurred_at: datetime | None = None,
    external_ref: str | None = None,
    severity: float | None = None,
) -> QualitySignal:
    identity = resolve_identity(db, source_system, external_id)
    sev = severity if severity is not None else QUALITY_SIGNAL_WEIGHTS.get(signal_type, 0.5)
    signal = QualitySignal(
        identity_id=identity.id,
        signal_type=signal_type,
        severity=sev,
        occurred_at=occurred_at or utcnow(),
        external_ref=external_ref,
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)
    return signal
