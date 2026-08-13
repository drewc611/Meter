"""
Pulls merged PRs (and CI status) from a GitHub repo straight into Merit --
for a team without webhook infrastructure set up yet, this is a lower-
friction way to get real Tier 1/2 signal than standing up a GitHub App.
Safe to run repeatedly (see app.services.github_ingest.sync_repo for the
idempotency note).

    MERIT_GITHUB_TOKEN=ghp_xxx python github_sync.py --owner drewc611 --repo Meter

Requires an IdentityMapping row (source_system="github") for every
contributor whose PRs should count -- same requirement as any other
ingestion path.

Whole-repo, every mapped contributor, writes to the DB directly (same
pattern as seed.py) -- for a company's own deployment. If you just want
your own PRs against a local instance, use `personal.py sync-github`
instead, which talks to the running API over HTTP one person at a time.
"""

import argparse
import os
import sys

import httpx

from app.database import SessionLocal
from app.periods import current_period
from app.services import github_ingest, scoring


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--owner", default=os.environ.get("MERIT_GITHUB_OWNER"), help="repo owner/org")
    parser.add_argument("--repo", default=os.environ.get("MERIT_GITHUB_REPO"), help="repo name")
    parser.add_argument(
        "--recompute", action="store_true", help="also run scoring.recompute_all() for the current period"
    )
    args = parser.parse_args()

    token = os.environ.get("MERIT_GITHUB_TOKEN")
    if not token:
        sys.exit("MERIT_GITHUB_TOKEN is not set")
    if not args.owner or not args.repo:
        sys.exit("--owner/--repo (or MERIT_GITHUB_OWNER/MERIT_GITHUB_REPO) are required")

    db = SessionLocal()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    with httpx.Client(headers=headers, timeout=30) as client:
        result = github_ingest.sync_repo(db, client, owner=args.owner, repo=args.repo)

    print(result)

    if args.recompute:
        start, end = current_period()
        n = scoring.recompute_all(db, start, end)
        print(f"recomputed scores for {n} people")


if __name__ == "__main__":
    main()
