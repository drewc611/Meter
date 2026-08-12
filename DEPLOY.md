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

1. Select the `drewc611/Meter` repo, branch `main`.
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
`https://usemeritai.com,https://www.usemeritai.com`, and `frontend/app.js`
points `API_BASE` at `https://api.usemeritai.com` for any non-local origin
(see the comment right above `API_BASE` in that file). If either domain
ever changes, both of those need updating together — a mismatch there is
the most likely thing to silently produce "DEMO DATA" on a production visit
where you expected LIVE.

## 4. Verify

- `https://api.usemeritai.com/healthz` — should return `{"status":"ok"}`.
- `https://usemeritai.com` — shows the real dashboard (`frontend/index.html`)
  as of the **go-live checklist** below. The old "coming soon" placeholder
  is still around at `frontend/coming-soon.html` (its waitlist form and ROI
  calculator), just no longer served at the site root.

## Go-live checklist (cutting over from the placeholder to the real dashboard)

Steps 1–3 and 6 are done — `MERIT_API_KEY` (the ingestion service token) is
live and enforced, and `frontend/index.html` is the real dashboard. What's
left:

1. ~~Generate a strong ingestion token (`MERIT_API_KEY`).~~ Done.
2. ~~Set it as a Fly secret.~~ Done.
3. ~~Verify it's actually enforced on `/ingest/*`~~ (401 without a token,
   200 with it, `/healthz` still open). Done.
4. **Check backup coverage on the SQLite volume** — a single volume with no
   snapshot is a single point of failure for every customer's data:
   ```bash
   fly volumes list -a meter
   # note the volume ID, then:
   fly volumes show <volume-id> -a meter
   # check the snapshot retention window; increase it if you want more
   # headroom than the default:
   fly volumes update <volume-id> --snapshot-retention <days> -a meter
   ```
5. **Add the `www` custom domain** (known gap — root domain works, `www`
   currently 502s): Cloudflare dashboard → the `meter` Worker → **Settings →
   Domains & Routes** → add `www.usemeritai.com`.
6. ~~Swap the files and push.~~ Done — `frontend/index.html` is now the
   dashboard; the old placeholder lives at `frontend/coming-soon.html`.
7. **Turn on real dashboard login** — see the next section.
8. Fill in the first row of [`TRADEMARK.md`](TRADEMARK.md)'s events table
   with today's date — that's the "first use in commerce" evidence the file
   exists to capture, and registering the domain alone doesn't count. Done.

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
5. Sign up for your own account at `https://usemeritai.com` (or via the curl
   above) and confirm the dashboard loads with the `LIVE · Merit API` badge.

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
