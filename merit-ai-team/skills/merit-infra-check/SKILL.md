---
name: merit-infra-check
description: >
  Runs the weekly infrastructure and security check on usemeritai.com and
  api.usemeritai.com — uptime, response headers, TLS, API surface diff, bundle
  changes, dependency and CVE watch, and hosting cost posture. Use when Andrew
  says "infra check", "is the site up", "security check", "check Merit's
  infrastructure", "what changed on the API", or when the weekly infrastructure
  scheduled task fires.
metadata:
  version: "0.1.0"
---

# Merit infra check

Read `merit-context` and `merit-goal` first. Run steps 1–5 yourself directly —
the `merit-executor`/`merit-probe`/`merit-analyst` tier-routing referenced in
earlier drafts of this file isn't part of this plugin (see the note in
`merit-context`); triage and severity ranking are your own judgment call, not
delegated. Write the result to `merit-ai-team/docs/merit-infra-log.md`.

**Hard rule:** read-only probes on public endpoints only. Never `POST`. Never
touch `/admin/*`, `/ingest/*`, or `/waitlist`. No load testing, no fuzzing, no
auth attempts. This is a health check, not a pentest.

## 1. Liveness and latency

```bash
curl -sS -o /dev/null -w "front %{http_code} %{time_total}s\n" https://usemeritai.com
curl -sS -o /dev/null -w "api   %{http_code} %{time_total}s\n" https://api.usemeritai.com/healthz
curl -sS https://api.usemeritai.com/healthz
```

Record status codes and total time. Flag anything over 1.5s or non-200.

## 2. Response headers and TLS

```bash
curl -sSI https://usemeritai.com
curl -sSI https://api.usemeritai.com/healthz
echo | openssl s_client -connect usemeritai.com:443 -servername usemeritai.com 2>/dev/null | openssl x509 -noout -dates -issuer
```

Check for, and flag when missing: `Strict-Transport-Security`,
`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`. As of 2026-08-15 none were present on
the frontend — if that is still true, say so in one line and move on rather
than re-explaining the fix each week.

Flag a TLS certificate expiring inside 21 days as urgent.

## 3. API surface diff

Fetch `https://api.usemeritai.com/openapi.json`, parse it, and compare the
endpoint list and schema field names against
`merit-ai-team/references/api-surface.md` and last week's log entry.

Report added, removed, and renamed endpoints. A new endpoint nobody mentioned
is the most interesting thing this check produces.

Also confirm whether `/openapi.json` and `/docs` are still publicly readable
without auth. They were on 2026-08-15. That publishes the full admin and ingest
surface, and it is the top standing recommendation.

## 4. Frontend build drift

```bash
curl -sSL https://usemeritai.com | grep -oE '/assets/main-[A-Za-z0-9_-]+\.(js|css)'
```

Compare the hashed filenames against last week's. A changed hash means a deploy
shipped — note it and check bundle size:

```bash
curl -sSI https://usemeritai.com/assets/<hash>.js | grep -i content-length
```

Flag a bundle growing more than 20% week over week. Baseline 2026-08-15:
`main-CtPKB2qh.js` at 235,537 bytes, `main-O_p_rLL1.css` at 14,796 bytes.

## 5. DNS, mail, and domain posture

Check nameservers, A/CNAME records, MX, and SPF/DMARC TXT records. `dig` may
not be installed — `python3 -c "import socket; print(socket.gethostbyname('usemeritai.com'))"`
or an HTTPS DNS resolver both work.

Missing SPF and DMARC matter more than usual here: Merit has a
`notify-waitlist` action that sends mail, and unauthenticated sending domains
land in spam.

## 6. Content-site routes (added 2026-08-21)

Once live, add these to the weekly crawlability and header check, same
treatment as the rest of the marketing surface:

```bash
for p in /architecture /setup/react /setup/python /setup/node /setup/tensorflow-pyro /guides /prompts /challenge; do
  curl -sS -o /dev/null -w "$p %{http_code}\n" "https://usemeritai.com$p"
done
```

These are exactly the kind of static content that should ship prerendered from
day one. If they 404 or return the empty SPA shell instead of real markup,
that's the same SPA-fallback bug already logged against the product, now
spreading to pages that had no reason to inherit it.

## 7. Advisory watch

Search for newly disclosed vulnerabilities affecting the known stack: FastAPI,
Starlette, Uvicorn, Pydantic, React, Vite, and the Fly.io platform. Only report
advisories published since the last run, and only ones plausibly reachable
given how Merit uses the dependency. Do not paste CVE lists.

## 8. Cost and capacity posture

One paragraph, no invented numbers. Note the single-region `ord` deployment,
whether the API cold-starts (compare first-request latency after a quiet
period against a warm request), and whether anything observed suggests scaling
or cost pressure. If Andrew has connected billing sources, use them; otherwise
say the data is not available rather than estimating.

## Output

Post a short chat summary — status line, then anything that changed, then the
one thing worth doing this week. Then append a dated section to
`merit-ai-team/docs/merit-infra-log.md` (plain file, not a project tool — see
`merit-context`):

```markdown
## 2026-08-15

**Status:** frontend 200 (0.31s) · api 200 (0.42s) · TLS valid to <date>

**Changed since last run**
- <or "nothing">

**Open**
| Issue | Severity | Age |
| --- | --- | --- |

**This week's one thing:** <single recommendation>

**Goal:** <outcome> · <days left> · <on track | slipping | off>
```

Keep the log to the last 12 weeks. Summarize older entries into a single
"Prior history" paragraph at the bottom rather than letting the file grow
without bound.
