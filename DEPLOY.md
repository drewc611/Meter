# Deploying Merit AC to usemeritai.com

Two pieces, deployed separately, both from this repo — no separate repo
needed:

- **Backend** (FastAPI + SQLite) → Fly.io, serving `api.usemeritai.com`.
- **Frontend** (Vite/React, built to static assets) → a Cloudflare Worker
  with static assets, serving `usemeritai.com`.

The steps below are account-bound (your Fly account, your Cloudflare
account), so they're written as commands/clicks for you to run, not
something that can be automated from here.

## 1. Backend on Fly.io

Install `flyctl` if you don't have it: https://fly.io/docs/flyctl/install/

```bash
fly auth login

cd backend
fly launch --no-deploy
# Interactive: it'll suggest an app name and a region. If the suggested name
# differs from fly.toml's `app = 'meter'` line, update fly.toml to match --
# whatever name Fly actually assigns is the one that has to be there (this
# also applies if you use Fly's "Launch an App from GitHub" web flow instead
# of this CLI — that flow generates its own app config rather than reading
# fly.toml, so the first `fly deploy` afterward is what reconciles the two).
# Say no to a Postgres/Redis add-on -- this app uses SQLite on a volume,
# not a managed DB.

fly volumes create merit_data --size 1 --region <region-you-picked>
# (skip this if the volume already exists -- Fly's web launch flow creates
# it automatically on first deploy)

fly deploy
```

Then attach the custom domain — either via CLI:

```bash
fly certs add api.usemeritai.com
fly certs show api.usemeritai.com
```

or via the Fly dashboard's **Certificates** tab on the app, which is
equivalent and doesn't need the CLI. Either way, you'll get one or more DNS
records to add in the Cloudflare dashboard under `usemeritai.com` → DNS.
Fly's docs recommend DNS-only (grey cloud, not proxied) for the validation
records — if the orange-cloud proxy causes cert validation to hang, switch
that record to DNS-only and retry until it reports the cert as issued.

Verify: `curl https://api.usemeritai.com/healthz` should return `{"status":"ok"}`.

**Email the waitlist when you're ready** — `/admin/notify-waitlist` needs
`MERIT_SMTP_HOST`/`MERIT_FROM_EMAIL` (plus optionally `MERIT_SMTP_PORT`/
`MERIT_SMTP_USER`/`MERIT_SMTP_PASSWORD`) set as Fly secrets first, same as
`MERIT_API_KEY` below. See [`backend/README.md`](backend/README.md#outbound-email)
for the full list and how to preview the send with `dry_run=true` first.

**Seed it** (optional, but the dashboard is a lot more convincing with real
numbers in it): `fly ssh console -C "python seed.py"` once the volume is
attached — same seed script used locally, fabricates 6 months of sample data.

## 2. Frontend on Cloudflare

In the Cloudflare dashboard: **Workers & Pages → Create → Import a
repository** (this deploys as a Worker with static assets, not the older
"Pages" product — same dashboard section, different underlying flow).

1. Select the `drewc611/merit-ac` repo, branch `main`.
2. Root/working directory: `frontend`.
3. **Build command:** `npm run build`. **Build output directory:** `dist`.
   The dashboard is a Vite/React app (see `frontend/src/`) — this is what
   actually compiles it; without it Cloudflare would deploy the repo's
   source files as-is, not a built site.
4. `frontend/wrangler.jsonc` is committed in the repo and is load-bearing —
   without it, Cloudflare's build for any non-`main` branch (every PR
   preview) fails outright with "Missing entry-point to Worker script or to
   assets directory". The production-branch deploy command (`wrangler
   deploy`) auto-detects a static site fine on its own; the non-production
   command (`wrangler versions upload`) does not and needs this file. Its
   `assets.directory` points at `dist`, matching the build output directory
   from step 3.
5. Deploy. Confirm the build succeeds and the given `*.workers.dev` URL loads.
6. Worker's **Settings → Domains & Routes** → add `usemeritai.com` and
   `www.usemeritai.com` as custom domains. Since the domain's already in
   this Cloudflare account, DNS gets configured automatically for the root
   domain; `www` may need its own explicit custom-domain entry if visiting
   it 502s after adding just the root.

## 3. Wire them together

`backend/fly.toml` sets `MERIT_CORS_ORIGINS` to
`https://usemeritai.com,https://www.usemeritai.com`, and
`frontend/src/lib/api.js` points `API_BASE` at `https://api.usemeritai.com`
for any non-local origin (see the comment right above `API_BASE` in that
file). If either domain
ever changes, both of those need updating together — a mismatch there is
the most likely thing to silently produce "DEMO DATA" on a production visit
where you expected LIVE.

## 4. Verify

- `https://api.usemeritai.com/healthz` — should return `{"status":"ok"}`.
- `https://usemeritai.com` — shows the marketing/content landing page (see
  README.md's "Site content"). The dashboard is at `https://usemeritai.com/app`.
  The old "coming soon" placeholder (`frontend/coming-soon.html`) is still
  built and served, at `https://usemeritai.com/coming-soon.html` — it just
  isn't linked from anywhere in the site's navigation.

## Production status

Live: the ingestion token (`MERIT_API_KEY`) is generated, set, and enforced
on `/ingest/*`; the real dashboard is at `/app`
(`frontend/coming-soon.html` is the old placeholder, still built and served
at `/coming-soon.html` but unlinked); per-user login (`MERIT_JWT_SECRET`, Google OAuth,
`MERIT_SIGNUP_CODE`) is on, see "Turning on dashboard login" below; and
[`TRADEMARK.md`](TRADEMARK.md)'s events table has its first-use-in-commerce
date recorded.

**Multi-tenant migration**: the first boot after this deploy runs
`database._migrate_to_multi_tenant()` automatically (inside `init_db()`) —
it rewrites `teams`/`identities`/`identity_mappings` in place to add the new
`Organization` (tenant) scoping, backfilling every existing row onto one
`Default Organization` whose `ingest_token` is seeded from the current
`MERIT_API_KEY`, so the live integration keeps authenticating unchanged.
This is a one-time, one-way schema rewrite on the production SQLite volume
(not just an additive column) — take a manual snapshot immediately before
this deploy regardless of the routine coverage below:
```bash
fly volumes list -a meter
fly volumes snapshot create <volume-id> -a meter
```

Still open:

1. **Check backup coverage on the SQLite volume** — a single volume with no
   snapshot is a single point of failure for every customer's data:
   ```bash
   fly volumes list -a meter
   # note the volume ID, then:
   fly volumes show <volume-id> -a meter
   # check the snapshot retention window; increase it if you want more
   # headroom than the default:
   fly volumes update <volume-id> --snapshot-retention <days> -a meter
   ```
2. **Add the `www` custom domain** (known gap — root domain works, `www`
   currently 502s): Cloudflare dashboard → the `meter` Worker → **Settings →
   Domains & Routes** → add `www.usemeritai.com`.

## Turning on dashboard login

`/api/*` and `/admin/*` stay open until `MERIT_JWT_SECRET` is set — same
"unset = open" convention `MERIT_API_KEY` uses. Once it's set, visitors need
a real account (password or Google) to see live data.

1. **Generate a strong signing secret and set it as a Fly secret:**
   ```bash
   openssl rand -hex 32
   fly secrets set MERIT_JWT_SECRET=<the-token-above> -a meter
   ```
2. **(Optional) Gate new account creation** so not anyone who finds the URL
   can sign up and see your company's AI spend data — skip this if you're
   still the only user:
   ```bash
   fly secrets set MERIT_SIGNUP_CODE=<something-only-you-share> -a meter
   ```
3. **(Optional) Set up "Sign in with Google"** — see the section below for
   the Google Cloud Console steps, then:
   ```bash
   fly secrets set GOOGLE_CLIENT_ID=<...> GOOGLE_CLIENT_SECRET=<...> \
     GOOGLE_REDIRECT_URI=https://api.usemeritai.com/auth/google/callback \
     MERIT_FRONTEND_URL=https://usemeritai.com -a meter
   ```
   Password login/signup work fine without this — the Google button just
   won't until it's configured.
4. **Verify it's actually enforced:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://api.usemeritai.com/api/overview
   # -> 401

   curl -s -X POST https://api.usemeritai.com/auth/signup -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"<a-real-password>","name":"You"}'
   # -> 201, with an access_token in the response

   curl -s -o /dev/null -w "%{http_code}\n" \
     -H "Authorization: Bearer <the-access_token-above>" \
     https://api.usemeritai.com/api/overview
   # -> 200

   curl -s https://api.usemeritai.com/healthz
   # -> {"status":"ok"} -- must stay open with no token, or Fly's own health
   #    check starts failing and the machine gets marked unhealthy.
   ```
5. Sign up for your own account at `https://usemeritai.com/app` (or via the
   curl above) and confirm the dashboard loads with the `LIVE · Merit AC API` badge.
   The first account ever created on a deployment automatically gets
   `is_admin` (needed for `/admin/recompute-scores` and
   `/admin/identity-mapping`) -- sign up before sharing the URL with anyone
   else, or set `MERIT_ADMIN_EMAILS` (comma-separated) as a Fly secret
   first so specific emails get admin on signup instead:
   ```bash
   fly secrets set MERIT_ADMIN_EMAILS=you@example.com,cofounder@example.com -a meter
   ```
   There's no UI to promote someone to admin later -- that's a direct
   database edit (`UPDATE dashboard_users SET is_admin = 1 WHERE email = ...`).

## Setting up "Sign in with Google"

Entirely optional — password login works without it. In
[Google Cloud Console](https://console.cloud.google.com/):

1. Create a project (or use an existing one) → **APIs & Services →
   OAuth consent screen**. User type "External" is fine for a small number
   of named users; fill in the required app name/support email fields.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   application type **Web application**.
3. **Authorized redirect URIs** → add exactly
   `https://api.usemeritai.com/auth/google/callback` (must match
   `GOOGLE_REDIRECT_URI` above, including scheme and no trailing slash).
4. Save, then copy the generated **Client ID** and **Client secret** into
   the `fly secrets set` command in step 3 above.
5. While the OAuth consent screen is in "Testing" mode, only email
   addresses you explicitly add as test users can complete the flow —
   add yours under **OAuth consent screen → Test users**, or publish the
   app if you want it open to any Google account.

**What this doesn't give you:** rate limiting on login attempts, an audit
log of who accessed what, or a forgot-password flow. See
[`ARCHITECTURE.md`](ARCHITECTURE.md#3-does-this-hosting-choice-make-sense)
for what to prioritize next.

## Repository automation (GitHub Actions)

Beyond `ci.yml`/`eslint.yml`/`codeql.yml` on push/PR, `.github/workflows/`
runs a handful of other things, some on a cron against the live Fly
deployment, some on every PR:

| Workflow | Trigger | What it does |
|---|---|---|
| `nightly-recompute.yml` | daily | `flyctl ssh console` → `python recompute.py` — recomputes `PersonScore` for the current period |
| `github-sync.yml` | every 6h | `flyctl ssh console` → `python github_sync.py` — pulls merged PRs/CI status |
| `dependency-audit.yml` | weekly | `pip-audit` + `npm audit` — no secrets needed |
| `backup-verification.yml` | weekly | checks the `merit_data` volume has a snapshot newer than 2 days |
| `stale.yml` | daily | labels/closes inactive issues and PRs — no secrets needed |
| `refresh-screenshots.yml` | push to `main` (frontend changes) | recaptures `docs/screenshots/*.png` against the built dashboard and commits them if changed — no secrets needed, uses the built-in `GITHUB_TOKEN` |
| `docker-build.yml` | PR/push touching `backend/`, `frontend/`, or `docker-compose.yml` | `docker compose build` — catches Dockerfile drift; doesn't run the containers |
| `gitleaks.yml` | every PR/push | scans the diff for committed secrets |
| `labeler.yml` | every PR | labels PRs `backend`/`frontend`/`infra`/`docs` by changed path (`.github/labeler.yml`) |

Plus two things that aren't workflows: **`.github/dependabot.yml`** opens
weekly PRs bumping outdated/vulnerable npm, pip, Docker base image, and
GitHub Action dependencies — the thing that actually fixes what
`dependency-audit.yml` only reports. **`.github/CODEOWNERS`** auto-requests
review from the repo owner on every PR.

The two `flyctl ssh console` workflows need a **`FLY_API_TOKEN`** repo
secret (**Settings → Secrets and variables → Actions**), generated with:

```bash
fly tokens create deploy -a meter
```

`github-sync.yml` also assumes `MERIT_GITHUB_OWNER`/`MERIT_GITHUB_REPO`/
`MERIT_GITHUB_TOKEN` are already set as **Fly** secrets (`fly secrets set
...`, not GitHub) — same requirement as running `make github-sync` by hand,
see `backend/github_sync.py`'s docstring. Without `FLY_API_TOKEN`, those two
workflows fail closed (red run in the Actions tab) rather than doing
nothing silently. Everything else in the table needs no secrets at all.
