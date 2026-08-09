# Deploying Merit to usemeritai.com

Two pieces, deployed separately, both from this repo:

- **Frontend** (static files) → Cloudflare Pages, serving `usemeritai.com`.
- **Backend** (FastAPI + SQLite) → Fly.io, serving `api.usemeritai.com`.

Both connect directly to this GitHub repo — no separate repo needed. The
steps below are account-bound (your Fly account, your Cloudflare account),
so they're written as commands/clicks for you to run, not something that
can be automated from here.

## 1. Backend on Fly.io

Install `flyctl` if you don't have it: https://fly.io/docs/flyctl/install/

```bash
fly auth login

cd backend
fly launch --no-deploy
# Interactive: it'll suggest an app name (fly.toml already has "merit-api" —
# if that's taken, accept whatever it picks and update the `app =` line in
# fly.toml to match) and a region. Say no to a Postgres/Redis add-on — this
# app uses SQLite on a volume, not a managed DB.

fly volumes create merit_data --size 1 --region <region-you-picked>

fly deploy
```

Then attach the custom domain:

```bash
fly certs add api.usemeritai.com
fly certs show api.usemeritai.com
```

The second command prints the DNS record(s) to add. Add them in the
Cloudflare dashboard under `usemeritai.com` → DNS. Fly's docs recommend
DNS-only (grey cloud, not proxied) for the validation records — if the
orange-cloud proxy causes cert validation to hang, switch that record to
DNS-only and retry `fly certs show api.usemeritai.com` until it reports
the cert as issued.

Verify: `curl https://api.usemeritai.com/healthz` should return `{"status":"ok"}`.

**Seed it** (optional, but the dashboard is a lot more convincing with real
numbers in it): `fly ssh console -C "python seed.py"` once the volume is
attached — same seed script used locally, fabricates 6 months of sample data.

## 2. Frontend on Cloudflare Pages

In the Cloudflare dashboard:

1. **Workers & Pages → Create → Pages → Connect to Git.**
2. Select the `drewc611/Meter` repo, branch `main`.
3. Build settings: **Root directory** = `frontend`. Leave build command and
   output directory blank — there's no build step, `frontend/` is served
   as-is.
4. Deploy. Cloudflare gives you a `*.pages.dev` URL first — confirm it loads
   (it'll show the DEMO badge until the backend is also live and CORS is
   set, see below).
5. **Custom domains** tab on the Pages project → add `usemeritai.com` and
   `www.usemeritai.com`. Since the domain's already in this Cloudflare
   account, DNS gets configured automatically.

## 3. Wire them together

`backend/fly.toml` already sets `MERIT_CORS_ORIGINS` to
`https://usemeritai.com,https://www.usemeritai.com`, and `frontend/app.js`
already points `API_BASE` at `https://api.usemeritai.com` for any non-local
origin (see the comment right above `API_BASE` in that file). If either
domain ever changes, both of those need updating together — a mismatch
there is the most likely thing to silently produce "DEMO DATA" on a
production visit where you expected LIVE.

## 4. Verify

- `https://api.usemeritai.com/healthz` — should return `{"status":"ok"}`.
- `https://usemeritai.com` — currently shows the "coming soon" placeholder
  (`frontend/index.html`), not the dashboard. That's deliberate for now
  (the backend has no auth yet — see the security note in `README.md`'s
  history). To check the actual dashboard is working end-to-end without
  exposing it publicly, run it locally against the live backend: open
  `frontend/dashboard.html` on your own machine and edit its `API_BASE`
  logic temporarily, or just run the local dev flow (`docker compose up`)
  pointed at the live API's CORS-approved origin.

## Going live with the real dashboard (not the placeholder)

When the site's actually ready to show the dashboard instead of "coming
soon": swap which file is `frontend/index.html` (currently the placeholder;
the real app is `frontend/dashboard.html`) and push. That single-file swap
is the whole cutover — everything else (backend, CORS, API_BASE) is already
wired up and working.

At that point, fill in the first row of [`TRADEMARK.md`](TRADEMARK.md)'s
events table with the date — that's the "first use in commerce" evidence
the file exists to capture, and registering the domain alone doesn't count.
