from datetime import datetime

import httpx

from app.models import OutcomeEvent, QualitySignal
from app.services import github_ingest


def _pr(number, login, *, merged=True, title="Add feature", body="", merge_sha=None):
    return {
        "html_url": f"https://github.com/acme/widget/pull/{number}",
        "title": title,
        "body": body,
        "user": {"login": login},
        "merged_at": "2026-08-01T12:00:00Z" if merged else None,
        "updated_at": "2026-08-01T12:00:00Z",
        "merge_commit_sha": merge_sha or f"sha{number}",
    }


def _transport(pulls_by_page, check_runs_by_sha=None, commit_author_by_sha=None):
    check_runs_by_sha = check_runs_by_sha or {}
    commit_author_by_sha = commit_author_by_sha or {}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/pulls"):
            page = int(request.url.params.get("page", "1"))
            return httpx.Response(200, json=pulls_by_page.get(page, []))
        if path.endswith("/check-runs"):
            sha = path.split("/")[-2]
            conclusion = check_runs_by_sha.get(sha)
            runs = [{"conclusion": conclusion}] if conclusion else []
            return httpx.Response(200, json={"check_runs": runs})
        sha = path.rsplit("/", 1)[-1]
        login = commit_author_by_sha.get(sha)
        return httpx.Response(200, json={"author": {"login": login} if login else None})

    return httpx.MockTransport(handler)


def test_fetch_merged_pulls_filters_unmerged_and_stops_on_empty_page():
    pulls_by_page = {
        1: [_pr(1, "alice"), _pr(2, "bob", merged=False)],
        2: [],
    }
    client = httpx.Client(transport=_transport(pulls_by_page))
    prs = github_ingest.fetch_merged_pulls(client, "acme", "widget")
    assert [pr["html_url"] for pr in prs] == ["https://github.com/acme/widget/pull/1"]


def test_sync_repo_ingests_merged_pr(db, person):
    p = person()
    login = f"gh_{p.id}"
    pulls_by_page = {1: [_pr(1, login, merge_sha="deadbeef")], 2: []}
    client = httpx.Client(transport=_transport(pulls_by_page, check_runs_by_sha={"deadbeef": "success"}))

    result = github_ingest.sync_repo(db, client, owner="acme", repo="widget")

    assert result == {"ingested": 1, "skipped_already_ingested": 0, "unmapped_logins": [], "ci_flagged": 0}
    row = db.query(OutcomeEvent).one()
    assert row.identity_id == p.id
    assert row.outcome_type == "pr_merged"
    assert row.source == "github"


def test_sync_repo_flags_failing_ci_as_quality_signal(db, person):
    p = person()
    login = f"gh_{p.id}"
    pulls_by_page = {1: [_pr(1, login, merge_sha="deadbeef")], 2: []}
    client = httpx.Client(transport=_transport(pulls_by_page, check_runs_by_sha={"deadbeef": "failure"}))

    result = github_ingest.sync_repo(db, client, owner="acme", repo="widget")

    assert result["ci_flagged"] == 1
    signal = db.query(QualitySignal).filter_by(signal_type="ci_checks_failed").one()
    assert signal.identity_id == p.id


def test_sync_repo_revert_blames_original_commit_author(db, person):
    original_author = person(name="Grace Hopper")
    reverter = person(name="Ada Lovelace")
    original_login = f"gh_{original_author.id}"
    reverter_login = f"gh_{reverter.id}"

    revert_pr = _pr(
        2,
        reverter_login,
        title='Revert "Add feature"',
        body="This reverts commit deadbeefcafe1234.",
    )
    pulls_by_page = {1: [revert_pr], 2: []}
    client = httpx.Client(
        transport=_transport(pulls_by_page, commit_author_by_sha={"deadbeefcafe1234": original_login})
    )

    result = github_ingest.sync_repo(db, client, owner="acme", repo="widget")

    assert result["ingested"] == 1
    row = db.query(OutcomeEvent).one()
    assert row.outcome_type == "pr_reverted"
    assert row.identity_id == original_author.id


def test_sync_repo_tracks_unmapped_logins_without_raising(db):
    pulls_by_page = {1: [_pr(1, "ghost-user")], 2: []}
    client = httpx.Client(transport=_transport(pulls_by_page))

    result = github_ingest.sync_repo(db, client, owner="acme", repo="widget")

    assert result["ingested"] == 0
    assert result["unmapped_logins"] == ["ghost-user"]
    assert db.query(OutcomeEvent).count() == 0


def test_sync_repo_is_idempotent_on_rerun(db, person):
    p = person()
    login = f"gh_{p.id}"
    pulls_by_page = {1: [_pr(1, login, merge_sha="deadbeef")], 2: []}
    client = httpx.Client(transport=_transport(pulls_by_page, check_runs_by_sha={"deadbeef": "success"}))

    first = github_ingest.sync_repo(db, client, owner="acme", repo="widget")
    second = github_ingest.sync_repo(db, client, owner="acme", repo="widget")

    assert first["ingested"] == 1
    assert second == {"ingested": 0, "skipped_already_ingested": 1, "unmapped_logins": [], "ci_flagged": 0}
    assert db.query(OutcomeEvent).count() == 1


def test_since_filter_stops_pagination_early(db):
    old_pr = _pr(1, "alice")
    old_pr["updated_at"] = "2020-01-01T00:00:00Z"
    pulls_by_page = {1: [old_pr], 2: []}
    client = httpx.Client(transport=_transport(pulls_by_page))

    prs = github_ingest.fetch_merged_pulls(client, "acme", "widget", since=datetime(2026, 1, 1))
    assert prs == []
