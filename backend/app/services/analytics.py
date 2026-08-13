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
from ..models import Identity, PersonScore, UsageEvent


def recommend_action(spend: float, value: float, slop: float) -> str:
    if value >= TOP_VALUE and slop < TOP_LOW_SLOP:
        return "Keep — top performer"
    if slop >= SLOP_HIGH and spend >= SPEND_THRESHOLD:
        return "Re-tier + coach"
    if slop >= SLOP_HIGH:
        return "Review output quality"
    if spend >= OVER_TIERED_SPEND and value < OVER_TIERED_VALUE:
        return "Over-tiered for usage"
    if value >= TOP_VALUE and spend < STUDY_SPEND:
        return "Study & spread habits"
    return "On track"


def segment(spend: float, value: float) -> str:
    if value >= VALUE_THRESHOLD:
        return "fund" if spend >= SPEND_THRESHOLD else "learn"
    return "coach" if spend >= SPEND_THRESHOLD else "watch"


def _latest_scores(db: Session, period_start: datetime, period_end: datetime) -> list[PersonScore]:
    return (
        db.query(PersonScore)
        .filter(PersonScore.period_start == period_start, PersonScore.period_end == period_end)
        .all()
    )


def get_total_spend(db: Session, period_start: datetime, period_end: datetime) -> float:
    """Total spend for a period, straight off PersonScore -- no per-row assembly needed."""
    return sum(s.spend_usd for s in _latest_scores(db, period_start, period_end))


def get_people(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    out = []
    for s in _latest_scores(db, period_start, period_end):
        ident = s.identity
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
                "recommendation": recommend_action(s.spend_usd, s.value_per_dollar, s.slop_risk),
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


def get_teams(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    return _aggregate(get_people(db, period_start, period_end), "team")


def get_roles(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    return _aggregate(get_people(db, period_start, period_end), "role")


def get_overview(
    db: Session,
    period_start: datetime,
    period_end: datetime,
    prior_total_spend: float | None = None,
) -> dict:
    people = get_people(db, period_start, period_end)
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

    # Shadow AI: not modeled in this demo's ingestion (§5.5 ships separately) —
    # illustrative placeholder, flagged as an estimate rather than a measured figure.
    shadow_ai_recoverable = total_spend * SHADOW_AI_RATE

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
            {"label": "Shadow-AI consolidated (est.)", "amount_usd": round(shadow_ai_recoverable * MONTHS_PER_YEAR, 0)},
        ],
        "fund_count": segment_counts["fund"],
        "coach_count": segment_counts["coach"],
        "learn_count": segment_counts["learn"],
        "confidence_breakdown": dict(confidence_breakdown),
        "people": people,
    }


def get_trends(db: Session, periods: list[tuple[datetime, datetime]]) -> list[dict]:
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
        people = get_people(db, start, end)
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


def get_tool_breakdown(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    """
    Spend by (tool, model) for one period. Deliberately reads UsageEvent
    directly rather than PersonScore, unlike everything above — PersonScore
    doesn't retain tool/model, and there's nowhere else to get this. It's a
    scoped exception to the "dashboard only reads PersonScore" rule (see
    module docstring): a single period-bounded [start, end) group-by, the
    same filter/group shape scoring._spend_by_identity already runs nightly,
    not an unbounded scan — so it doesn't reintroduce the cost-scales-with-
    history problem PersonScore exists to avoid.
    """
    rows = (
        db.query(
            UsageEvent.tool,
            UsageEvent.model,
            func.sum(UsageEvent.cost_usd),
            func.count(UsageEvent.id),
        )
        .filter(UsageEvent.occurred_at >= period_start, UsageEvent.occurred_at < period_end)
        .group_by(UsageEvent.tool, UsageEvent.model)
        .all()
    )
    out = [
        {"tool": tool, "model": model, "spend_usd": round(float(spend or 0.0), 2), "event_count": count}
        for tool, model, spend, count in rows
    ]
    return sorted(out, key=lambda r: -r["spend_usd"])


def get_tool_performance(db: Session, period_start: datetime, period_end: datetime) -> list[dict]:
    """
    Spend-weighted value/$ and slop risk per tool, for one period.

    An honest approximation, not causal attribution: PersonScore doesn't know
    which specific tool produced which specific outcome or quality signal --
    that link doesn't exist in the data model (see models.py). So each
    person's overall score is attributed across the tools they used that
    period, weighted by how much they spent on each. Someone who splits spend
    evenly across two tools contributes half their score's weight to each.
    This is a real, defensible rollup of data Merit already has -- it is not
    a claim that tool X caused outcome Y. Surface it in the UI with that
    caveat, not as a per-tool causal ranking.

    Same deliberate, period-scoped exception to the PersonScore-only rule as
    get_tool_breakdown()/get_adoption() -- reads UsageEvent directly because
    per-tool spend isn't an attribute PersonScore carries, but stays bounded
    to a single [start, end) group-by, not an unbounded scan.
    """
    tool_spend_by_identity = (
        db.query(UsageEvent.identity_id, UsageEvent.tool, func.sum(UsageEvent.cost_usd))
        .filter(UsageEvent.occurred_at >= period_start, UsageEvent.occurred_at < period_end)
        .group_by(UsageEvent.identity_id, UsageEvent.tool)
        .all()
    )
    scores_by_identity = {s.identity_id: s for s in _latest_scores(db, period_start, period_end)}

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
    points = [(i, p["total_spend_usd"]) for i, p in enumerate(trend_points) if p["total_spend_usd"] > 0]
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
        "trend_direction": "up" if slope > 0.01 else ("down" if slope < -0.01 else "flat"),
        "based_on_periods": n,
    }


def get_adoption(db: Session, period_start: datetime, period_end: datetime) -> dict:
    """
    Active (had a UsageEvent this period) vs. provisioned Identity count,
    overall and by seat tier. Same deliberate, period-scoped exception to the
    PersonScore-only rule as get_tool_breakdown() above — active users aren't
    on PersonScore either (a person with zero spend never gets a row there).
    """

    def _pct(active: int, total: int) -> float:
        return round(active / total * 100, 1) if total else 0.0

    total_by_tier = dict(db.query(Identity.tier, func.count(Identity.id)).group_by(Identity.tier).all())
    active_by_tier = dict(
        db.query(Identity.tier, func.count(func.distinct(UsageEvent.identity_id)))
        .join(UsageEvent, UsageEvent.identity_id == Identity.id)
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
