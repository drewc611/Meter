"""
Read-side query logic backing the dashboard. Almost everything here reads
PersonScore (materialized by scoring.recompute_all), never raw events —
keeps every dashboard page load to a handful of indexed queries regardless
of how many millions of UsageEvent rows exist underneath.

get_tool_breakdown() and get_adoption() are the deliberate exception: tool/
model and "who's actually active" aren't attributes PersonScore carries, so
they read UsageEvent directly, scoped to a single [start, end) period — see
their docstrings for why that's still bounded, not a regression of the rule
above.

The thresholds and recovery coefficients are all in constants.py; this module
is only the shape of the queries and the assembly of the response payloads.
"""

from collections import defaultdict
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..constants import (
    HIGH_SLOP_RECOVERY_RATE,
    MONTHS_PER_YEAR,
    OVER_TIERED_RECOVERY_RATE,
    OVER_TIERED_SPEND,
    OVER_TIERED_VALUE,
    SHADOW_AI_RATE,
    SLOP_HIGH,
    SPEND_THRESHOLD,
    STUDY_SPEND,
    TOP_LOW_SLOP,
    TOP_TIER,
    TOP_VALUE,
    VALUE_THRESHOLD,
)
from ..models import Identity, PersonScore, UnmappedIdentityEvent, UsageEvent

RECOMMENDATION_LABELS = {
    "keep_top_performer": "Keep — top performer",
    "retier_coach": "Re-tier + coach",
    "review_output_quality": "Review output quality",
    "over_tiered": "Over-tiered for usage",
    "study_spread_habits": "Study & spread habits",
    "on_track": "On track",
}


def recommend_action_code(spend: float, value: float, slop: float) -> str:
    if value >= TOP_VALUE and slop < TOP_LOW_SLOP:
        return "keep_top_performer"
    if slop >= SLOP_HIGH and spend >= SPEND_THRESHOLD:
        return "retier_coach"
    if slop >= SLOP_HIGH:
        return "review_output_quality"
    if spend >= OVER_TIERED_SPEND and value < OVER_TIERED_VALUE:
        return "over_tiered"
    if value >= TOP_VALUE and spend < STUDY_SPEND:
        return "study_spread_habits"
    return "on_track"


def recommend_action(spend: float, value: float, slop: float) -> str:
    return RECOMMENDATION_LABELS[recommend_action_code(spend, value, slop)]


def segment(spend: float, value: float) -> str:
    if value >= VALUE_THRESHOLD:
        return "fund" if spend >= SPEND_THRESHOLD else "learn"
    return "coach" if spend >= SPEND_THRESHOLD else "watch"


def _latest_scores(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> list[PersonScore]:
    return (
        db.query(PersonScore)
        .filter(PersonScore.org_id == org_id)
        .filter(PersonScore.period_start == period_start, PersonScore.period_end == period_end)
        .all()
    )


def get_total_spend(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> float:
    """Total spend for a period, straight off PersonScore -- no per-row assembly needed."""
    return sum(s.spend_usd for s in _latest_scores(db, org_id, period_start, period_end))


def get_people(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> list[dict]:
    out = []
    for s in _latest_scores(db, org_id, period_start, period_end):
        ident = s.identity
        rec_code = recommend_action_code(s.spend_usd, s.value_per_dollar, s.slop_risk)
        out.append(
            {
                "id": ident.id,
                "name": ident.full_name,
                "team": ident.team.name,
                "role": ident.role,
                "tier": ident.tier,
                "spend_usd": round(s.spend_usd, 2),
                "value_per_dollar": s.value_per_dollar,
                "slop_risk": s.slop_risk,
                "confidence": s.confidence,
                "segment": segment(s.spend_usd, s.value_per_dollar),
                "recommendation": RECOMMENDATION_LABELS[rec_code],
                "recommendation_code": rec_code,
            }
        )
    return sorted(out, key=lambda r: -r["spend_usd"])


def _weighted_totals(people: list[dict]) -> tuple[float, float, float]:
    """Spend-weighted (total_spend, blended value/$, avg slop risk) for a people list."""
    total_spend = sum(p["spend_usd"] for p in people)
    if not total_spend:
        return 0.0, 0.0, 0.0
    blended_value = sum(p["value_per_dollar"] * p["spend_usd"] for p in people) / total_spend
    avg_slop = sum(p["slop_risk"] * p["spend_usd"] for p in people) / total_spend
    return total_spend, blended_value, avg_slop


def _aggregate(people: list[dict], key: str) -> list[dict]:
    buckets = defaultdict(lambda: {"people_count": 0, "spend_usd": 0.0, "vw": 0.0, "sw": 0.0})
    for p in people:
        b = buckets[p[key]]
        b["people_count"] += 1
        b["spend_usd"] += p["spend_usd"]
        b["vw"] += p["value_per_dollar"] * p["spend_usd"]
        b["sw"] += p["slop_risk"] * p["spend_usd"]
    out = []
    for name, b in buckets.items():
        spend = b["spend_usd"] or 1e-9
        out.append(
            {
                "name": name,
                "people_count": b["people_count"],
                "spend_usd": round(b["spend_usd"], 2),
                "value_per_dollar": round(b["vw"] / spend, 2),
                "slop_risk": round(b["sw"] / spend, 1),
            }
        )
    return sorted(out, key=lambda r: -r["spend_usd"])


def get_teams(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> list[dict]:
    return _aggregate(get_people(db, org_id, period_start, period_end), "team")


def get_roles(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> list[dict]:
    return _aggregate(get_people(db, org_id, period_start, period_end), "role")


def get_overview(
    db: Session,
    org_id: int | None,
    period_start: datetime,
    period_end: datetime,
    prior_total_spend: float | None = None,
) -> dict:
    people = get_people(db, org_id, period_start, period_end)
    total_spend, blended_value, avg_slop = _weighted_totals(people)

    segment_counts = defaultdict(int)
    confidence_breakdown = defaultdict(int)
    for p in people:
        segment_counts[p["segment"]] += 1
        confidence_breakdown[p["confidence"]] += 1

    # Recoverable-spend estimate (§11 of the spec) — heuristic, always labeled as
    # such, and deliberately conservative. Coefficients live in constants.py and
    # are the kind of thing a real deployment calibrates against actual re-tier
    # outcomes.
    over_tiered = [p for p in people if p["tier"] == TOP_TIER and p["value_per_dollar"] < OVER_TIERED_VALUE]
    over_tiered_recoverable = sum(p["spend_usd"] for p in over_tiered) * OVER_TIERED_RECOVERY_RATE

    high_slop = [p for p in people if p["slop_risk"] >= SLOP_HIGH]
    slop_recoverable = sum(p["spend_usd"] for p in high_slop) * HIGH_SLOP_RECOVERY_RATE

    # "AI Rework Tax": the share of this period's spend sitting in high-slop-risk
    # usage. Not a new signal -- high_slop and total_spend are both already
    # computed above for the recoverable-spend estimate -- just a ratio of two
    # real numbers, not a fabricated one. Answers "how much of what we spend is
    # in the danger zone" more directly than a 0-100 risk score does on its own.
    high_slop_spend = sum(p["spend_usd"] for p in high_slop)
    rework_tax_pct = round(high_slop_spend / total_spend * 100, 1) if total_spend else 0.0

    # Shadow AI (§5.5): real observed cost from unmapped usage-path attempts
    # this period (see UnmappedIdentityEvent, populated by
    # services.ingest.resolve_identity) whenever there's been at least one to
    # measure. SHADOW_AI_RATE is now only a cold-start fallback -- an org with
    # no recorded unmapped activity yet (brand new, or predating this table)
    # still gets a labeled estimate instead of a bare zero.
    shadow_ai_observed = get_shadow_ai_observed_cost(db, org_id, period_start, period_end)
    shadow_ai_measured = shadow_ai_observed > 0
    shadow_ai_recoverable = shadow_ai_observed if shadow_ai_measured else total_spend * SHADOW_AI_RATE

    recoverable_total = over_tiered_recoverable + slop_recoverable + shadow_ai_recoverable

    spend_change_pct = (
        round((total_spend - prior_total_spend) / prior_total_spend * 100, 1) if prior_total_spend else 0.0
    )

    return {
        "period_start": period_start,
        "period_end": period_end,
        "total_spend_usd": round(total_spend, 2),
        "spend_change_pct": spend_change_pct,
        "blended_value_per_dollar": round(blended_value, 2),
        "avg_slop_risk": round(avg_slop, 1),
        "rework_tax_pct": rework_tax_pct,
        "recoverable_annual_usd": round(recoverable_total * MONTHS_PER_YEAR, 0),
        "recoverable_breakdown": [
            {"label": "Over-tiered seats", "amount_usd": round(over_tiered_recoverable * MONTHS_PER_YEAR, 0)},
            {
                "label": "High-slop spend re-tiered or coached",
                "amount_usd": round(slop_recoverable * MONTHS_PER_YEAR, 0),
            },
            {
                "label": "Shadow-AI consolidated" if shadow_ai_measured else "Shadow-AI consolidated (est.)",
                "amount_usd": round(shadow_ai_recoverable * MONTHS_PER_YEAR, 0),
            },
        ],
        "fund_count": segment_counts["fund"],
        "coach_count": segment_counts["coach"],
        "learn_count": segment_counts["learn"],
        "confidence_breakdown": dict(confidence_breakdown),
        "value_threshold": VALUE_THRESHOLD,
        "people": people,
    }


def get_trends(db: Session, org_id: int | None, periods: list[tuple[datetime, datetime]]) -> list[dict]:
    """
    Spend/value/slop across the given periods (oldest first — the caller
    passes e.g. periods.recent_periods(), same as every other function here
    takes its [start, end) from the caller rather than resolving "now"
    itself). Reuses the same weighted-average math as get_overview() and
    reads only PersonScore — a period with no scored rows yet simply comes
    back as zeros, no special-casing.
    """
    out = []
    for start, end in periods:
        people = get_people(db, org_id, start, end)
        total_spend, blended_value, avg_slop = _weighted_totals(people)
        out.append(
            {
                "period_start": start,
                "period_end": end,
                "total_spend_usd": round(total_spend, 2),
                "blended_value_per_dollar": round(blended_value, 2),
                "avg_slop_risk": round(avg_slop, 1),
                "people_scored": len(people),
            }
        )
    return out


def get_tool_breakdown(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> list[dict]:
    """Spend by (tool, model) for one period -- the PersonScore-only
    exception noted in the module docstring, since tool/model isn't an
    attribute PersonScore carries."""
    rows = (
        db.query(
            UsageEvent.tool,
            UsageEvent.model,
            func.sum(UsageEvent.cost_usd),
            func.count(UsageEvent.id),
        )
        .join(Identity, Identity.id == UsageEvent.identity_id)
        .filter(Identity.org_id == org_id)
        .filter(UsageEvent.occurred_at >= period_start, UsageEvent.occurred_at < period_end)
        .group_by(UsageEvent.tool, UsageEvent.model)
        .all()
    )
    out = [
        {"tool": tool, "model": model, "spend_usd": round(float(spend or 0.0), 2), "event_count": count}
        for tool, model, spend, count in rows
    ]
    return sorted(out, key=lambda r: -r["spend_usd"])


def get_tool_performance(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> list[dict]:
    """
    Spend-weighted value/$ and slop risk per tool, for one period.

    An honest approximation, not causal attribution: PersonScore doesn't know
    which specific tool produced which specific outcome or quality signal --
    that link doesn't exist in the data model (see models.py). So each
    person's overall score is attributed across the tools they used that
    period, weighted by how much they spent on each. Someone who splits spend
    evenly across two tools contributes half their score's weight to each.
    This is a real, defensible rollup of data Merit AC already has -- it is not
    a claim that tool X caused outcome Y. Surface it in the UI with that
    caveat, not as a per-tool causal ranking.
    """
    tool_spend_by_identity = (
        db.query(UsageEvent.identity_id, UsageEvent.tool, func.sum(UsageEvent.cost_usd))
        .join(Identity, Identity.id == UsageEvent.identity_id)
        .filter(Identity.org_id == org_id)
        .filter(UsageEvent.occurred_at >= period_start, UsageEvent.occurred_at < period_end)
        .group_by(UsageEvent.identity_id, UsageEvent.tool)
        .all()
    )
    scores_by_identity = {s.identity_id: s for s in _latest_scores(db, org_id, period_start, period_end)}

    buckets = defaultdict(lambda: {"spend_usd": 0.0, "vw": 0.0, "sw": 0.0, "people": set()})
    for identity_id, tool, spend in tool_spend_by_identity:
        spend = float(spend or 0.0)
        score = scores_by_identity.get(identity_id)
        if score is None or spend <= 0:
            continue
        b = buckets[tool]
        b["spend_usd"] += spend
        b["vw"] += score.value_per_dollar * spend
        b["sw"] += score.slop_risk * spend
        b["people"].add(identity_id)

    out = []
    for tool, b in buckets.items():
        spend = b["spend_usd"] or 1e-9
        out.append(
            {
                "tool": tool,
                "spend_usd": round(b["spend_usd"], 2),
                "value_per_dollar": round(b["vw"] / spend, 2),
                "slop_risk": round(b["sw"] / spend, 1),
                "people_count": len(b["people"]),
            }
        )
    return sorted(out, key=lambda r: -r["spend_usd"])


def nonzero_trend_points(trend_points: list[dict]) -> list[tuple[int, float]]:
    """(period index, total_spend_usd) for periods with real spend -- shared
    by both spend-forecast implementations (this module's linear fallback
    and services.forecasting's ML model) so they agree on what counts as
    history to project from."""
    return [(i, p["total_spend_usd"]) for i, p in enumerate(trend_points) if p["total_spend_usd"] > 0]


def classify_trend_direction(slope: float) -> str:
    """Shared up/down/flat labeling for a fitted spend-trend slope -- same
    threshold used by both spend-forecast implementations."""
    return "up" if slope > 0.01 else ("down" if slope < -0.01 else "flat")


def forecast_next_period_spend(trend_points: list[dict]) -> dict | None:
    """
    A transparent linear trend projection over trailing-period spend --
    literally ordinary least squares on (period index, total_spend_usd).
    Deliberately not a black-box model: with a handful of monthly points,
    that's the right amount of sophistication for the data available, and
    every number in it is inspectable by hand. Returns None with fewer than
    3 non-zero periods -- not enough signal to project responsibly, and a
    caller should show "not enough history yet" rather than a number.
    """
    points = nonzero_trend_points(trend_points)
    if len(points) < 3:
        return None
    n = len(points)
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    denom = sum((x - mean_x) ** 2 for x, _ in points)
    if denom == 0:
        return None
    slope = sum((x - mean_x) * (y - mean_y) for x, y in points) / denom
    intercept = mean_y - slope * mean_x
    next_x = max(x for x, _ in points) + 1
    projected = max(0.0, slope * next_x + intercept)
    return {
        "projected_spend_usd": round(projected, 2),
        "trend_direction": classify_trend_direction(slope),
        "based_on_periods": n,
    }


def get_adoption(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> dict:
    """Active (had a UsageEvent this period) vs. provisioned Identity count,
    overall and by seat tier -- active users aren't on PersonScore either
    (a person with zero spend never gets a row there), same exception as
    get_tool_breakdown()."""

    def _pct(active: int, total: int) -> float:
        return round(active / total * 100, 1) if total else 0.0

    total_by_tier = dict(
        db.query(Identity.tier, func.count(Identity.id)).filter(Identity.org_id == org_id).group_by(Identity.tier).all()
    )
    active_by_tier = dict(
        db.query(Identity.tier, func.count(func.distinct(UsageEvent.identity_id)))
        .join(UsageEvent, UsageEvent.identity_id == Identity.id)
        .filter(Identity.org_id == org_id)
        .filter(UsageEvent.occurred_at >= period_start, UsageEvent.occurred_at < period_end)
        .group_by(Identity.tier)
        .all()
    )

    by_tier = [
        {
            "tier": tier,
            "total_seats": total,
            "active_users": active_by_tier.get(tier, 0),
            "utilization_pct": _pct(active_by_tier.get(tier, 0), total),
        }
        for tier, total in sorted(total_by_tier.items())
    ]
    total_seats = sum(total_by_tier.values())
    active_users = sum(active_by_tier.values())
    return {
        "total_seats": total_seats,
        "active_users": active_users,
        "utilization_pct": _pct(active_users, total_seats),
        "by_tier": by_tier,
    }


def get_shadow_ai_candidates(
    db: Session, org_id: int | None, period_start: datetime, period_end: datetime
) -> list[dict]:
    """§5.5 of the spec, made real instead of estimated: every distinct
    (source_system, external_id) that hit /ingest/* with no IdentityMapping
    during this period, grouped from UnmappedIdentityEvent (see
    services.ingest.resolve_identity). known_cost_usd is only ever nonzero
    for usage-path attempts -- outcome/quality-signal attempts don't carry
    a dollar figure, so a candidate that only ever showed up on those paths
    is real signal (someone's using a tool nobody provisioned) with an
    honestly-zero cost, not a missing number.

    Same bounded-by-period exception as get_tool_breakdown()/get_adoption():
    UnmappedIdentityEvent isn't rolled into PersonScore (it isn't attributed
    to anyone yet), so this reads the raw table directly, scoped to one
    [start, end) window."""
    rows = (
        db.query(
            UnmappedIdentityEvent.source_system,
            UnmappedIdentityEvent.external_id,
            func.count(UnmappedIdentityEvent.id),
            func.sum(UnmappedIdentityEvent.cost_usd),
            func.min(UnmappedIdentityEvent.occurred_at),
            func.max(UnmappedIdentityEvent.occurred_at),
        )
        .filter(UnmappedIdentityEvent.org_id == org_id)
        .filter(UnmappedIdentityEvent.occurred_at >= period_start, UnmappedIdentityEvent.occurred_at < period_end)
        .group_by(UnmappedIdentityEvent.source_system, UnmappedIdentityEvent.external_id)
        .all()
    )
    out = [
        {
            "source_system": source_system,
            "external_id": external_id,
            "attempt_count": attempt_count,
            "known_cost_usd": round(float(known_cost or 0.0), 2),
            "first_seen_at": first_seen_at,
            "last_seen_at": last_seen_at,
        }
        for source_system, external_id, attempt_count, known_cost, first_seen_at, last_seen_at in rows
    ]
    return sorted(out, key=lambda r: (-r["known_cost_usd"], -r["attempt_count"]))


def get_shadow_ai_observed_cost(db: Session, org_id: int | None, period_start: datetime, period_end: datetime) -> float:
    """Sum of known_cost_usd across every shadow-AI candidate this period --
    the one piece of get_overview()'s recoverable-spend estimate that's a
    measurement instead of a heuristic, whenever there's been at least one
    unmapped usage-path attempt to measure. See get_overview() for how this
    combines with SHADOW_AI_RATE."""
    total = (
        db.query(func.sum(UnmappedIdentityEvent.cost_usd))
        .filter(UnmappedIdentityEvent.org_id == org_id)
        .filter(UnmappedIdentityEvent.occurred_at >= period_start, UnmappedIdentityEvent.occurred_at < period_end)
        .filter(UnmappedIdentityEvent.ingest_path == "usage")
        .scalar()
    )
    return float(total or 0.0)
