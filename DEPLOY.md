# Deploying Merit to usemeritai.com

Two pieces, deployed separately, both from this repo — no separate repo
needed:

- **Backend** (FastAPI + SQLite) → Fly.io, serving `api.usemeritai.com`.
- **Frontend** (static files) → a Cloudflare Worker with static assets,
  serving `usemeritai.com`.

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

**Seed it** (optional, but the dashboard is a lot more convincing with real
numbers in it): `fly ssh console -C "python seed.py"` once the volume is
attached — same seed script used locally, fabricates 6 months of sample data.

## 2. Frontend on Cloudflare

In the Cloudflare dashboard: **Workers & Pages → Create → Import a
repository** (this deploys as a Worker with static assets, not the older
"Pages" product — same dashboard section, different underlying flow).

1. Select the `drewc611/Meter` repo, branch `main`.
2. Root/working directory: `frontend`.
3. `frontend/wrangler.jsonc` is committed in the repo and is load-bearing —
   without it, Cloudflare's build for any non-`main` branch (every PR
   preview) fails outright with "Missing entry-point to Worker script or to
   assets directory". The production-branch deploy command (`wrangler
   deploy`) auto-detects a static site fine on its own; the non-production
   command (`wrangler versions upload`) does not and needs this file.
4. Deploy. Confirm the build succeeds and the given `*.workers.dev` URL loads.
5. Worker's **Settings → Domains & Routes** → add `usemeritai.com` and
   `www.usemeritai.com` as custom domains. Since the domain's already in
   this Cloudflare account, DNS gets configured automatically for the root
   domain; `www` may need its own explicit custom-domain entry if visiting
   it 502s after adding just the root.

## 3. Wire them together

`backend/fly.toml` sets `MERIT_CORS_ORIGINS` to
`https://usemeritai.com,https://www.usemeritai.com`, and `frontend/app.js`
points `API_BASE` at `https://api.usemeritai.com` for any non-local origin
(see the comment right above `API_BASE` in that file). If either domain
ever changes, both of those need updating together — a mismatch there is
the most likely thing to silently produce "DEMO DATA" on a production visit
where you expected LIVE.

## 4. Verify

- `https://api.usemeritai.com/healthz` — should return `{"status":"ok"}`.
- `https://usemeritai.com` — currently shows the "coming soon" placeholder
  (`frontend/index.html`), not the dashboard. That's deliberate: the backend
  has no authentication on any endpoint yet (`/api/*`, `/ingest/*`,
  `/admin/*` are all open to anyone with the URL — CORS only restricts
  browser reads, not direct requests), so the real dashboard isn't meant to
  be publicly reachable until that's addressed. To check the dashboard
  works end-to-end without exposing it publicly, run it locally against the
  live backend (`frontend/dashboard.html`, or the local `docker compose`
  flow) rather than visiting the production domain.

## Going live with the real dashboard (not the placeholder)

Once auth is in place: swap which file is `frontend/index.html` (currently
the placeholder; the real app is `frontend/dashboard.html`) and push. That
single-file swap is the whole cutover — everything else (backend, CORS,
API_BASE) is already wired up and working.

At that point, fill in the first row of [`TRADEMARK.md`](TRADEMARK.md)'s
events table with the date — that's the "first use in commerce" evidence
the file exists to capture, and registering the domain alone doesn't count.
