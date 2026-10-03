# Security audit — Meter — 2026-09-27

Part of a 22-repository audit of this account. The cross-repository report (method, pain points, business impact, solution analysis, roadmap) is published at https://claude.ai/artifact/KgdrC9eNyCwdqjvSfwMNuB.

## Summary for this repository

| Severity | Count |
|---|---|
| Low | 5 |

Automated passes run against this repository: gitleaks 8.24.2 (full history and tree), the placeholder-credential checker now shipped in `scripts/`, semgrep 1.178.0 (`p/security-audit`, `p/secrets`, `p/owasp-top-ten`, `p/github-actions`), bandit, pip-audit and npm audit where applicable, plus a manual review of auth, input handling, workflows and deployment files.

## Findings

| ID | Severity | Category | Location | Evidence | Impact | Fix | Status |
|---|---|---|---|---|---|---|---|
| MT-1 | Low | CORS wildcard default outside production | `backend/app/config.py:26-29; docker-compose.yml:13,24` | `MERIT_CORS_ORIGINS` defaults to `*`; compose publishes 8000 | Production refuses `*` at startup; only dev exposed. | Default compose to the frontend origin. | fixed (e3c5b35) |
| MT-2 | Low | Open API when JWT secret is unset (guarded in production) | `backend/app/dependencies.py:72-91` | `if not os.environ.get("MERIT_JWT_SECRET"): return None` | Production startup requires a 32+ char secret; dev is open by design. | Require an explicit `MERIT_ALLOW_OPEN_DEV=1` opt-in. | fixed (e3c5b35) |
| MT-3 | Low | Rate-limit key trusts a header unconditionally | `backend/app/services/ratelimit.py` | `fly-client-ip` header used as the caller identity | Outside Fly a client can spoof it and evade throttles. | Gate on `FLY_APP_NAME` being set. | fixed (e3c5b35) |
| MT-4 | Low | CI job with write to main | `.github/workflows/refresh-screenshots.yml:19-63` | `permissions: contents: write`; `npm ci`; `npx playwright install`; `git push` to `main` | A build-time dependency compromise can push to `main` as the bot. | Push to a branch and open a PR; fine-grained token. | fixed (06605fd) |
| MT-5 | Low | Floating dependency floors | `backend/requirements.txt` | `fastapi>=0.141.1`, `numpy>=2.2.6`, `anthropic>=1.5.0` | Non-reproducible installs (Dependabot and audit workflow mitigate). | Hash-pinned constraints file. | fixed (62bb82c); direct dependencies only, transitive ones and hashes are not pinned |

## Guardrails added in this change

- `scripts/check-placeholder-secrets.sh` — fails the build on placeholder credentials, secret defaults, disabled-auth defaults, `debug=True`, literal secret assignments, private keys and committed `.env` files.
- `.gitleaks.toml` — gitleaks defaults plus custom placeholder rules and a fixture allowlist.
- `.github/workflows/secret-scan.yml` — runs both on every push and pull request and weekly over full history (SHA-pinned actions).
- `.pre-commit-config.yaml` — the same checks locally; run `pre-commit install` once.
- `docs/security/AI-CODING-GUARDRAILS.md` — the binding rules for any AI-assisted change, with references.
- A "Security rules for AI-assisted changes" section in `CLAUDE.md` (and `AGENTS.md` / Copilot instructions where present).
- `.gitignore` rules for `.env`, keys and Terraform state where they were missing.

See the cross-repository report for the fail-closed pattern by language and the prioritised fix list.
