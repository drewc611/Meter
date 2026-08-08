from app.services.analytics import _aggregate, recommend_action, segment

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
