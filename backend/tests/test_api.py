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


def test_identity_mapping_unknown_email_404(client, db):
    r = _map(client, "nobody@example.com", "slack", "U123")
    assert r.status_code == 404


def test_identity_mapping_success(client, db):
    _bootstrap_person(db)
    r = _map(client, "live@example.com", "slack", "U123")
    assert r.status_code == 201
    assert r.json()["status"] == "mapped"
