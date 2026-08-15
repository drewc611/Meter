"""
Pulls merged PRs (and their CI status) straight from the GitHub REST API and
feeds them into the same ingest_outcome_event / ingest_quality_signal
pipeline /ingest/outcome and /ingest/quality-signal use -- a way to get real
Tier 1/2 signal from GitHub without standing up webhook infrastructure first.
Run via github_sync.py at the repo root; see that script for the CLI.

Author resolution reuses IdentityMapping the same way every other ingestion
path does: source_system="github", external_id=<github login>. A PR from an
unmapped login is skipped and counted, not silently dropped -- see
services/ingest.UnresolvedIdentityError.
"""

import re
from datetime import datetime

import httpx

from ..models import Identity, OutcomeEvent
from . import ingest

GITHUB_API = "https://api.github.com"

_REVERT_SHA_RE = re.compile(r"This reverts commit ([0-9a-f]{7,40})", re.IGNORECASE)


def _is_revert(pr: dict) -> bool:
    title = (pr.get("title") or "").strip().lower()
    body = pr.get("body") or ""
    return title.startswith("revert") or "this reverts commit" in body.lower()


def _parse_gh_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def _revert_blame_login(client: httpx.Client, owner: str, repo: str, pr: dict, default_login: str) -> str:
    """A revert PR's own author isn't who introduced the problem -- look up
    the commit named in "This reverts commit <sha>" and blame its author
    instead. Falls back to the revert PR's author if the body doesn't name a
    commit, or the lookup fails (private forks, deleted branches, etc)."""
    match = _REVERT_SHA_RE.search(pr.get("body") or "")
    if not match:
        return default_login
    try:
        resp = client.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits/{match.group(1)}")
        resp.raise_for_status()
        login = (resp.json().get("author") or {}).get("login")
        return login or default_login
    except httpx.HTTPError:
        return default_login


def fetch_merged_pulls(client: httpx.Client, owner: str, repo: str, since: datetime | None = None) -> list[dict]:
    """All merged PRs for owner/repo, newest-updated first, stopping once a
    page goes older than `since` -- GitHub's sort=updated ordering makes
    that a safe early exit rather than a full-history scan on every run."""
    prs: list[dict] = []
    page = 1
    while True:
        resp = client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
            params={"state": "closed", "sort": "updated", "direction": "desc", "per_page": 100, "page": page},
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        for pr in batch:
            if not pr.get("merged_at"):
                continue
            if since and _parse_gh_datetime(pr["updated_at"]) < since:
                return prs
            prs.append(pr)
        page += 1
    return prs


def fetch_ci_conclusion(client: httpx.Client, owner: str, repo: str, sha: str) -> str | None:
    """Overall CI conclusion for a commit: 'failure' if any check run failed,
    else the first completed conclusion, else None if nothing's reported."""
    resp = client.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}/check-runs")
    resp.raise_for_status()
    conclusions = [r["conclusion"] for r in resp.json().get("check_runs", []) if r.get("conclusion")]
    if not conclusions:
        return None
    return "failure" if "failure" in conclusions else conclusions[0]


def sync_repo(
    db,
    client: httpx.Client,
    *,
    org_id: int,
    owner: str,
    repo: str,
    since: datetime | None = None,
    check_ci: bool = True,
) -> dict:
    """Ingest every merged PR since `since` as a Tier 1 outcome, plus a Tier 2
    quality signal for reverts (auto-derived by ingest_outcome_event) and,
    if check_ci, for red CI at merge time. Idempotent by PR url -- matched
    against OutcomeEvent.external_ref, scoped to this org so two tenants
    syncing the same repo (or reusing a PR URL) never mark each other's
    events as already ingested -- so this is safe to run on a schedule
    against the same repo."""
    already_ingested = {
        ref
        for (ref,) in db.query(OutcomeEvent.external_ref)
        .join(Identity, Identity.id == OutcomeEvent.identity_id)
        .filter(OutcomeEvent.source == "github", Identity.org_id == org_id)
        .all()
    }

    ingested = 0
    skipped = 0
    unmapped: set[str] = set()
    ci_flagged = 0

    for pr in fetch_merged_pulls(client, owner, repo, since=since):
        url = pr["html_url"]
        if url in already_ingested:
            skipped += 1
            continue

        login = pr["user"]["login"]
        is_revert = _is_revert(pr)
        outcome_type = "pr_reverted" if is_revert else "pr_merged"
        blamed_login = _revert_blame_login(client, owner, repo, pr, login) if is_revert else login
        merged_at = _parse_gh_datetime(pr["merged_at"])

        try:
            ingest.ingest_outcome_event(
                db,
                org_id,
                source_system="github",
                external_id=blamed_login,
                source="github",
                outcome_type=outcome_type,
                occurred_at=merged_at,
                external_ref=url,
            )
        except ingest.UnresolvedIdentityError:
            unmapped.add(blamed_login)
            continue
        ingested += 1

        if check_ci and not is_revert and pr.get("merge_commit_sha"):
            conclusion = fetch_ci_conclusion(client, owner, repo, pr["merge_commit_sha"])
            if conclusion == "failure":
                ingest.ingest_quality_signal(
                    db,
                    org_id,
                    source_system="github",
                    external_id=login,
                    signal_type="ci_checks_failed",
                    occurred_at=merged_at,
                    external_ref=url,
                )
                ci_flagged += 1

    return {
        "ingested": ingested,
        "skipped_already_ingested": skipped,
        "unmapped_logins": sorted(unmapped),
        "ci_flagged": ci_flagged,
    }
