from datetime import datetime, timedelta

from app.services import scoring
from app.services.analytics import (
    _aggregate,
    get_adoption,
    get_overview,
    get_tool_breakdown,
    get_trends,
    recommend_action,
    segment,
)

START = datetime(2026, 8, 1)
END = datetime(2026, 9, 1)

# --------------------------------------------------------------- segment


def test_segment_fund_is_high_value_high_spend():
    assert segment(spend=1500, value=2.0) == "fund"


def test_segment_learn_is_high_value_low_spend():
    assert segment(spend=300, value=2.0) == "learn"


def test_segment_coach_is_low_value_high_spend():
    assert segment(spend=1500, value=0.5) == "coach"


def test_segment_watch_is_low_value_low_spend():
    assert segment(spend=300, value=0.5) == "watch"


# ------------------------------------------------------- recommend_action


def test_recommend_top_performer():
    assert recommend_action(spend=500, value=2.5, slop=10) == "Keep — top performer"


def test_recommend_re_tier_and_coach():
    assert recommend_action(spend=1200, value=0.5, slop=70) == "Re-tier + coach"


def test_recommend_review_quality_when_slop_high_but_spend_low():
    assert recommend_action(spend=200, value=0.5, slop=70) == "Review output quality"


def test_recommend_over_tiered():
    assert recommend_action(spend=1600, value=1.0, slop=20) == "Over-tiered for usage"


def test_recommend_on_track_default():
    assert recommend_action(spend=700, value=1.2, slop=40) == "On track"


# ------------------------------------------------------------- aggregate


def test_aggregate_spend_weights_value_and_slop():
    people = [
        {"team": "Eng", "spend_usd": 100.0, "value_per_dollar": 2.0, "slop_risk": 10.0},
        {"team": "Eng", "spend_usd": 300.0, "value_per_dollar": 1.0, "slop_risk": 50.0},
    ]
    (row,) = _aggregate(people, "team")
    assert row["name"] == "Eng"
    assert row["people_count"] == 2
    assert row["spend_usd"] == 400.0
    # spend-weighted value: (2.0*100 + 1.0*300) / 400 = 1.25
    assert row["value_per_dollar"] == 1.25
    # spend-weighted slop: (10*100 + 50*300) / 400 = 40.0
    assert row["slop_risk"] == 40.0


def test_aggregate_sorts_by_spend_desc():
    people = [
        {"team": "Small", "spend_usd": 50.0, "value_per_dollar": 1.0, "slop_risk": 0.0},
        {"team": "Big", "spend_usd": 500.0, "value_per_dollar": 1.0, "slop_risk": 0.0},
    ]
    rows = _aggregate(people, "team")
    assert [r["name"] for r in rows] == ["Big", "Small"]


# ---------------------------------------------------------- get_overview: confidence_breakdown


def test_get_overview_confidence_breakdown(db, person, ingest_helpers):
    tier1_only = person(name="Tier1 Only")
    tier1_and_2 = person(name="Tier1And2")

    for ident in (tier1_only, tier1_and_2):
        ingest_helpers.usage(
            source_system="anthropic_api",
            external_id=f"key_{ident.id}",
            tool="anthropic_api",
            cost_usd=100.0,
            occurred_at=START + timedelta(days=5),
        )
    ingest_helpers.quality(
        source_system="github",
        external_id=f"gh_{tier1_and_2.id}",
        signal_type="regeneration_loop",
        occurred_at=START + timedelta(days=6),
    )
    scoring.recompute_all(db, START, END)

    overview = get_overview(db, START, END)
    assert overview["confidence_breakdown"] == {"tier1": 1, "tier1+2": 1}


# -------------------------------------------------------------------- get_trends


def test_get_trends_reads_each_given_period(db, person, ingest_helpers):
    p = person(name="Trendy")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=100.0,
        occurred_at=START + timedelta(days=5),
    )
    scoring.recompute_all(db, START, END)

    prior_start = datetime(2026, 7, 1)
    trends = get_trends(db, [(prior_start, START), (START, END)])

    assert len(trends) == 2
    # earlier period has no PersonScore rows yet — zeros, not an error
    assert trends[0]["total_spend_usd"] == 0.0
    assert trends[0]["people_scored"] == 0
    assert trends[1]["period_start"] == START
    assert trends[1]["total_spend_usd"] == 100.0
    assert trends[1]["people_scored"] == 1


# ------------------------------------------------------------- get_tool_breakdown


def test_get_tool_breakdown_groups_by_tool_and_model(db, person, ingest_helpers):
    p = person(name="Toolie")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        model="claude-opus-4",
        cost_usd=40.0,
        occurred_at=START + timedelta(days=2),
    )
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        model="claude-opus-4",
        cost_usd=10.0,
        occurred_at=START + timedelta(days=3),
    )
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="github_copilot",
        cost_usd=5.0,
        occurred_at=START + timedelta(days=4),
    )

    rows = get_tool_breakdown(db, START, END)
    assert rows[0] == {"tool": "anthropic_api", "model": "claude-opus-4", "spend_usd": 50.0, "event_count": 2}
    assert rows[1] == {"tool": "github_copilot", "model": None, "spend_usd": 5.0, "event_count": 1}


def test_get_tool_breakdown_excludes_events_outside_period(db, person, ingest_helpers):
    p = person(name="Outsider")
    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{p.id}",
        tool="anthropic_api",
        cost_usd=999.0,
        occurred_at=datetime(2026, 7, 15),  # before START
    )
    assert get_tool_breakdown(db, START, END) == []


# ------------------------------------------------------------------ get_adoption


def test_get_adoption_counts_active_vs_total_by_tier(db, person, ingest_helpers):
    active = person(name="Active", tier="Frontier")
    person(name="Idle", tier="Frontier")  # provisioned, never spends
    person(name="Basic Idle", tier="Basic")

    ingest_helpers.usage(
        source_system="anthropic_api",
        external_id=f"key_{active.id}",
        tool="anthropic_api",
        cost_usd=20.0,
        occurred_at=START + timedelta(days=1),
    )

    result = get_adoption(db, START, END)
    assert result["total_seats"] == 3
    assert result["active_users"] == 1
    assert result["utilization_pct"] == 33.3

    by_tier = {row["tier"]: row for row in result["by_tier"]}
    assert by_tier["Frontier"] == {"tier": "Frontier", "total_seats": 2, "active_users": 1, "utilization_pct": 50.0}
    assert by_tier["Basic"] == {"tier": "Basic", "total_seats": 1, "active_users": 0, "utilization_pct": 0.0}
