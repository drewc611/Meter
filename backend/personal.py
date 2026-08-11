"""
Optional, personal-only helper -- not part of the demo, not run by tests.
Wires YOUR real AI-tool usage into a LOCAL Merit instance (defaults to
http://localhost:8000) so you're looking at your own numbers instead of
seed.py's fabricated company.

No leak by construction, not just by promise: Merit's schema has nowhere to
put source code, diffs, or prompt/conversation content (see models.py) --
a UsageEvent is cost/tokens/tool/model, an OutcomeEvent is a URL reference.
This script doesn't change that; it's just a convenient way to feed your
own metadata into it instead of typing curl by hand. `sync-github` talks
only to api.github.com with a token *you* supply via GITHUB_TOKEN -- it
never goes anywhere near an LLM or any Merit-hosted server.

This is exactly the "personal use" case ../LICENSE grants free of charge --
an individual tracking their own usage, not business/commercial use.

    # one-time: create your personal Identity + IdentityMapping(s)
    python personal.py setup --name "Ada Novak" --email you@example.com \\
        --github-username yourhandle

    # log a Cursor/Copilot/other bill by hand -- run whenever you like
    python personal.py log-usage --email you@example.com --tool cursor --cost 20.00

    # pull your own merged/reverted PRs as outcome events
    GITHUB_TOKEN=ghp_xxx python personal.py sync-github \\
        --repo yourorg/yourrepo --github-username yourhandle --since 2026-07-01

Then `python -m app.main` (or `make run`) and `POST /admin/recompute-scores`
(or restart -- seed.py's period math already runs on every request) to see
yourself on the dashboard.
"""

import argparse
import os
import sys
from datetime import datetime, timedelta

import httpx

from app.database import Base, SessionLocal, engine
from app.models import Identity, IdentityMapping, Team

MERIT_BASE_URL = os.environ.get("MERIT_BASE_URL", "http://localhost:8000")
GITHUB_SOURCE = "github"
MANUAL_SOURCE = "manual"


def _auth_headers() -> dict:
    key = os.environ.get("MERIT_API_KEY")
    return {"Authorization": f"Bearer {key}"} if key else {}


def _db():
    Base.metadata.create_all(bind=engine)  # create tables if missing -- never drops existing data
    return SessionLocal()


def _ensure_mapping(db, ident, source_system, external_id):
    existing = db.query(IdentityMapping).filter_by(source_system=source_system, external_id=external_id).one_or_none()
    if existing:
        print(f"  mapping already exists: {source_system}:{external_id}")
        return
    db.add(IdentityMapping(identity_id=ident.id, source_system=source_system, external_id=external_id))
    db.commit()
    print(f"  mapped {source_system}:{external_id} -> Identity #{ident.id}")


def cmd_setup(args):
    db = _db()
    team = db.query(Team).filter_by(name=args.team).one_or_none()
    if team is None:
        team = Team(name=args.team)
        db.add(team)
        db.commit()

    ident = db.query(Identity).filter_by(email=args.email).one_or_none()
    if ident is None:
        ident = Identity(full_name=args.name, email=args.email, role=args.role, team_id=team.id, tier=args.tier)
        db.add(ident)
        db.commit()
        db.refresh(ident)
        print(f"Created Identity #{ident.id}: {args.name} <{args.email}>")
    else:
        print(f"Identity already exists: #{ident.id} {ident.full_name} <{ident.email}>")

    _ensure_mapping(db, ident, MANUAL_SOURCE, args.email)
    if args.github_username:
        _ensure_mapping(db, ident, GITHUB_SOURCE, args.github_username)

    print(f"\nReady. Try:\n  python personal.py log-usage --email {args.email} --tool cursor --cost 20")


def cmd_log_usage(args):
    resp = httpx.post(
        f"{MERIT_BASE_URL}/ingest/usage",
        json={
            "source_system": MANUAL_SOURCE,
            "external_id": args.email,
            "tool": args.tool,
            "cost_usd": args.cost,
            "model": args.model,
            "tokens_in": args.tokens_in,
            "tokens_out": args.tokens_out,
        },
        headers=_auth_headers(),
    )
    if resp.status_code == 422:
        sys.exit(f"{resp.json()['detail']}\n\nRun `python personal.py setup --email {args.email} ...` first.")
    resp.raise_for_status()
    print(f"Logged ${args.cost:.2f} of {args.tool} usage for {args.email}.")


def _fetch_merged_prs(repo: str, github_username: str, since: str, token: str) -> list[dict]:
    """
    GitHub's search API. "Reverted" here is the common-case heuristic (title
    starts with "Revert" -- what GitHub's own Revert button produces), not
    real revert detection -- GitHub doesn't expose that as a queryable flag.
    Good enough for your own trend line, not a claim of ground truth.
    """
    query = f"repo:{repo} type:pr is:merged author:{github_username} merged:>={since}"
    resp = httpx.get(
        "https://api.github.com/search/issues",
        params={"q": query, "per_page": 100},
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        timeout=30,
    )
    resp.raise_for_status()
    prs = []
    for item in resp.json()["items"]:
        pr_resp = httpx.get(item["pull_request"]["url"], headers={"Authorization": f"Bearer {token}"}, timeout=30)
        pr_resp.raise_for_status()
        pr = pr_resp.json()
        prs.append({"title": pr["title"], "merged_at": pr["merged_at"], "html_url": pr["html_url"]})
    return prs


def cmd_sync_github(args):
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        sys.exit("Set GITHUB_TOKEN (a personal access token, repo:read scope) before running sync-github.")

    since = args.since or (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    prs = _fetch_merged_prs(args.repo, args.github_username, since, token)
    sent = 0
    for pr in prs:
        outcome_type = "pr_reverted" if pr["title"].lower().startswith("revert") else "pr_merged"
        resp = httpx.post(
            f"{MERIT_BASE_URL}/ingest/outcome",
            json={
                "source_system": GITHUB_SOURCE,
                "external_id": args.github_username,
                "source": "github",
                "outcome_type": outcome_type,
                "occurred_at": pr["merged_at"],
                "external_ref": pr["html_url"],
            },
            headers=_auth_headers(),
        )
        if resp.status_code == 422:
            sys.exit(
                f"{resp.json()['detail']}\n\nRun `python personal.py setup --github-username {args.github_username} ...` first."
            )
        resp.raise_for_status()
        sent += 1
    print(f"Sent {sent} PR outcome(s) from {args.repo} since {since}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_setup = sub.add_parser("setup", help="Create your personal Identity + IdentityMapping(s)")
    p_setup.add_argument("--name", required=True)
    p_setup.add_argument("--email", required=True)
    p_setup.add_argument("--role", default="Engineer")
    p_setup.add_argument("--team", default="Personal")
    p_setup.add_argument("--tier", default="Standard", choices=["Basic", "Standard", "Frontier"])
    p_setup.add_argument("--github-username", default=None)
    p_setup.set_defaults(func=cmd_setup)

    p_log = sub.add_parser("log-usage", help="Manually log one usage event (e.g. Cursor/Copilot spend)")
    p_log.add_argument("--email", required=True, help="the --email you used in `setup`")
    p_log.add_argument("--tool", required=True, help="e.g. cursor, github_copilot, chatgpt_enterprise")
    p_log.add_argument("--cost", type=float, required=True)
    p_log.add_argument("--model", default=None)
    p_log.add_argument("--tokens-in", type=int, default=0)
    p_log.add_argument("--tokens-out", type=int, default=0)
    p_log.set_defaults(func=cmd_log_usage)

    p_sync = sub.add_parser("sync-github", help="Pull your own merged/reverted PRs as outcome events")
    p_sync.add_argument("--repo", required=True, help="owner/repo")
    p_sync.add_argument("--github-username", required=True)
    p_sync.add_argument("--since", default=None, help="YYYY-MM-DD, defaults to 30 days ago")
    p_sync.set_defaults(func=cmd_sync_github)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
