"""End-to-end API tests through the full stack: ingest -> recompute -> read."""

from datetime import datetime

from app.periods import current_period


def _map(client, email, source_system, external_id):
    return client.post(
        "/admin/identity-mapping",
        json={
            "email": email,
            "source_system": source_system,
            "external_id": external_id,
        },
    )


def _bootstrap_person(db):
    """Create one team + identity directly, return (identity, email)."""
    from app import models

    team = models.Team(name="Engineering")
    db.add(team)
    db.commit()
    ident = models.Identity(
        full_name="Live Person",
        email="live@example.com",
        role="Engineer",
        team_id=team.id,
        tier="Standard",
    )
    db.add(ident)
    db.commit()
    db.refresh(ident)
    db.add(models.IdentityMapping(identity_id=ident.id, source_system="anthropic_api", external_id="key_live"))
    db.add(models.IdentityMapping(identity_id=ident.id, source_system="github", external_id="gh_live"))
    db.commit()
    return ident


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_ingest_unmapped_id_returns_422(client, db):
    _bootstrap_person(db)
    r = client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "totally_unknown",
            "tool": "anthropic_api",
            "cost_usd": 5.0,
        },
    )
    assert r.status_code == 422


def test_unknown_outcome_type_without_weight_returns_400(client, db):
    _bootstrap_person(db)
    r = client.post(
        "/ingest/outcome",
        json={
            "source_system": "github",
            "external_id": "gh_live",
            "source": "github",
            "outcome_type": "not_a_real_type",
        },
    )
    assert r.status_code == 400


def test_full_pipeline_overview(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)  # a day inside the current period

    for _ in range(3):
        assert (
            client.post(
                "/ingest/usage",
                json={
                    "source_system": "anthropic_api",
                    "external_id": "key_live",
                    "tool": "anthropic_api",
                    "cost_usd": 100.0,
                    "occurred_at": now.isoformat(),
                },
            ).status_code
            == 201
        )
    for _ in range(5):
        assert (
            client.post(
                "/ingest/outcome",
                json={
                    "source_system": "github",
                    "external_id": "gh_live",
                    "source": "github",
                    "outcome_type": "pr_merged",
                    "occurred_at": now.isoformat(),
                },
            ).status_code
            == 201
        )

    # Recompute the current period, then read it back.
    rc = client.post("/admin/recompute-scores")
    assert rc.status_code == 200
    assert rc.json()["people_scored"] == 1

    ov = client.get("/api/overview")
    assert ov.status_code == 200
    body = ov.json()
    assert body["total_spend_usd"] == 300.0
    assert len(body["people"]) == 1
    assert body["people"][0]["name"] == "Live Person"

    people = client.get("/api/people").json()
    assert people[0]["spend_usd"] == 300.0

    teams = client.get("/api/teams").json()
    assert teams[0]["name"] == "Engineering"
    assert teams[0]["people_count"] == 1

    roles = client.get("/api/roles").json()
    assert roles[0]["name"] == "Engineer"


def test_people_months_ago_reads_a_prior_period(client, db):
    from app.periods import prior_period

    _bootstrap_person(db)
    cur_start, cur_end = current_period()
    prior_start, _ = prior_period(cur_start)
    prior_day = datetime(prior_start.year, prior_start.month, 10)

    assert (
        client.post(
            "/ingest/usage",
            json={
                "source_system": "anthropic_api",
                "external_id": "key_live",
                "tool": "anthropic_api",
                "cost_usd": 150.0,
                "occurred_at": prior_day.isoformat(),
            },
        ).status_code
        == 201
    )
    rc = client.post("/admin/recompute-scores", params={"start": prior_start.isoformat(), "end": cur_start.isoformat()})
    assert rc.status_code == 200
    assert rc.json()["people_scored"] == 1

    assert client.get("/api/people").json() == []
    people = client.get("/api/people", params={"months_ago": 1}).json()
    assert len(people) == 1
    assert people[0]["spend_usd"] == 150.0


def test_overview_includes_confidence_breakdown(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 50.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    body = client.get("/api/overview").json()
    assert body["confidence_breakdown"] == {"tier1": 1}


def test_trends_endpoint_returns_requested_months(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 75.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    r = client.get("/api/trends?months=3")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 3
    assert body[-1]["total_spend_usd"] == 75.0
    # earlier months have no PersonScore rows yet — zeros, not an error
    assert body[0]["total_spend_usd"] == 0.0


def test_tool_breakdown_endpoint(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "model": "claude-opus-4",
            "cost_usd": 30.0,
            "occurred_at": now.isoformat(),
        },
    )

    r = client.get("/api/tool-breakdown")
    assert r.status_code == 200
    assert r.json() == [{"tool": "anthropic_api", "model": "claude-opus-4", "spend_usd": 30.0, "event_count": 1}]


def test_adoption_endpoint(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 15.0,
            "occurred_at": now.isoformat(),
        },
    )

    r = client.get("/api/adoption")
    assert r.status_code == 200
    body = r.json()
    assert body["total_seats"] == 1
    assert body["active_users"] == 1
    assert body["utilization_pct"] == 100.0


def test_tool_performance_endpoint(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 40.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    r = client.get("/api/tool-performance")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["tool"] == "anthropic_api"
    assert body[0]["spend_usd"] == 40.0
    assert body[0]["people_count"] == 1


def test_spend_forecast_endpoint_insufficient_history(client, db):
    _bootstrap_person(db)
    now = datetime(*current_period()[0].timetuple()[:3], 10)
    client.post(
        "/ingest/usage",
        json={
            "source_system": "anthropic_api",
            "external_id": "key_live",
            "tool": "anthropic_api",
            "cost_usd": 40.0,
            "occurred_at": now.isoformat(),
        },
    )
    client.post("/admin/recompute-scores")

    # Fresh test DB has no backfilled history -- fewer than 3 non-zero periods.
    r = client.get("/api/spend-forecast")
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_identity_mapping_unknown_email_404(client, db):
    r = _map(client, "nobody@example.com", "slack", "U123")
    assert r.status_code == 404


def test_identity_mapping_success(client, db):
    _bootstrap_person(db)
    r = _map(client, "live@example.com", "slack", "U123")
    assert r.status_code == 201
    assert r.json()["status"] == "mapped"
