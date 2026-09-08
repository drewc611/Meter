# Merit AC executive brief

Maintained by `merit-ceo-brief`. Weekly synthesis for the founder — two goal lines,
never blended. Append each week's brief as a new dated section.

## Log

### 2026-09-08 — second brief, first full team run (infra + eng + growth in one pass)

**Design-partner goal.** Off. 0 real tenants, 114 days left, unchanged since
confirmation on 2026-09-04. Sixteen PRs landed in the four days since the
last brief — content, Operator OS, a full redesign and revert, real
security fixes — and not one touched ingestion, a real tenant, or anything
on the path to a design partner. Second straight check with zero targeted
work on the actual headline goal.

**Content/challenge goal.** Off. Real measure (signups × paid-conversion)
still 0. 43 days left. Content volume isn't the issue — 22 more guide
articles and 25 more news articles shipped since 09-04 — the entire measure
is gated on one Stripe Payment Link the founder hasn't created, flagged
for the fourth time now.

**News goal.** On track. 49 articles live (up from 23), and the
rubber-stamp worry from the last brief is resolved by the actual log: 6 of
54 Judge-tier verdicts were rejections, not zero. Corrections trail exists
and renders correctly but has never actually been used — can't yet tell if
it works under real conditions, just that it's wired up. 56 days left.

**The three things.**

1. **The design-partner goal is going stale from neglect, not difficulty.**
   Nothing this week was aimed at it specifically — it's not that partners
   were pursued and lost, it's that no session pointed at this goal at all
   while sixteen PRs shipped elsewhere. At this rate December arrives at
   0/10 not because the goal was hard, but because nobody worked it.
2. **Ingestion events have no idempotency key** — `UsageEvent`,
   `OutcomeEvent`, and `QualitySignal` have no unique constraint tying a
   row to a specific source event. A retried `/ingest/usage` call (a normal
   failure mode for any billing proxy or webhook) creates a duplicate row
   and silently double-counts spend. Harmless today because there's no real
   tenant data yet — but it needs a decision and a migration before the
   design-partner goal above ever produces its first real customer, not
   after their numbers already look wrong once.
3. **The sitemap was actively wrong for two and a half weeks**, listing 9
   of the site's 130+ real routes while `/news`, `/models`, `/glossary`,
   `/operator-os`, and ~120 individual content pages shipped without ever
   reaching a crawler through it. Fixed this session — it's now generated
   from the same page list the build already prerenders from, so it can't
   drift out of sync again — but it's worth naming that growth's own
   standing #1 priority ("the site is invisible to crawlers") was quietly
   failing for weeks by the team's own count, not a hypothetical risk.

**Decisions owed.**

- **Create the Stripe Payment Link.** Still two minutes, still open, still
  the only thing blocking the content goal's real measure. Recommend: this
  week, before shipping any more content that can't move the number either.
- **Pick the ingestion idempotency key's shape.** A required client-supplied
  `event_id` per ingest call, or a derived natural key
  (`identity_id`+`source_system`+`occurred_at`+`tool`). Recommend the
  client-supplied `event_id` — it's the only version that survives a retry
  with slightly different field values (a rounded cost, a re-serialized
  timestamp) still being recognized as the same event.
- **Confirm `MERIT_JWT_SECRET` is actually strong on Fly.** PR #100 made the
  app refuse to boot on a weak secret in production — the site is up right
  now, which is consistent with the secret already being fine, but that's
  inferred from uptime, not confirmed. Recommend: one `fly secrets list -a
  meter` check, cheap insurance against the next deploy being the one that
  finds out the hard way.
- **Greenlight (or reject) the challenge day-tracker checklist.** One of
  three site-interactivity proposals drafted this run (full list in
  `merit-growth-log.md`) — a per-day checkbox on the challenge pages,
  localStorage only, no server change. Recommend: build this one, skip the
  other two for now — it's the only proposal that plausibly moves the
  content goal's actual measure (a visitor who can see progress has a
  reason to finish, and finishing is the precondition for ever reaching the
  paid-track CTA).
- **Assign the design-partner goal explicit weekly work.** Recommend one
  concrete lever picked and worked every week — a named prospect list with
  outreach sent, or a real ingestion path built and demoed to one specific
  company — rather than treating it as whatever's left over from content
  and infra work.

**Dropped.** Nothing declined outright this session, but two things were
done at reduced depth and should be named rather than presented as
complete: the competitive scan was one search, not the fuller sweep a
dedicated growth week would do, and outreach/waitlist volume couldn't be
checked at all (`/admin/*` is off-limits to every merit-* skill by design —
only the founder can pull that number). Also not fixed, deliberately: the
`Float` money columns (`cost_usd`, `spend_usd`, `value_per_dollar`) flagged
in `merit-eng-log.md` — real, but Medium, and the idempotency gap above is
the more urgent version of the same "trust the numbers" concern.

### 2026-09-04 — first brief ever run

This file has never been written to. Everything below is the first real
synthesis, not a delta from a prior week.

**Design-partner goal.** Still not confirmed — sat PROPOSED-shaped since
2026-08-21, unconfirmed for two weeks now. 118 days to the 2026-12-31
deadline. Measure is `/api/adoption` count; the live site runs on demo data
only ("Northwind Labs"), so the honest number is zero. Confirmed live and
healthy just now (`/healthz` → `{"status":"ok"}`, homepage renders real
content, not a blank SPA shell).

**Content/challenge goal.** ACTIVE since 2026-08-22, 47 days left on its
60-day clock. Everything gated on the founder got shipped — 7 site pages, 30
prompts, 3 guides, `/models`, `/glossary`, `/challenge`. But the actual
measure — signups × paid-conversion rate — is structurally zero, because
`PAID_TRACK_PAYMENT_LINK` is still the placeholder the founder was supposed to
set two weeks ago. No amount of content shipped moves this number until
that two-minute step happens.

**News goal.** Still PROPOSED — no outcome, deadline, or measure, flagged
for the third time now (2026-08-22, and every run since). Structural
safeguards: 23 articles published today across four rounds, zero logged
rejections. That's either clean sourcing or a Judge pass that's stopped
saying no — with the goal itself unscored, that volume isn't evidence of
anything yet. No corrections-trail entries needed so far; issues this
session were caught and fixed before publish, not after, which is the
safeguard working as designed, not it going untested.

**The three things.**

1. **The content goal's real measure has been at zero for two weeks over a
   task that takes two minutes.** Every guide, prompt, and page shipped
   since 2026-08-22 is upstream of a Stripe Payment Link the founder hasn't
   created. This is the "recommended three weeks running, still not done"
   case the brief format exists to name.
2. **`/openapi.json` and `/docs` are still publicly readable on the
   production API** — confirmed again just now, full admin and ingest
   surface, three weeks after this was first flagged. It matters more
   today specifically: this session found and fixed a real bug where any
   self-signup user could read and mass-email the waitlist, because
   `require_admin` didn't check for real operator status. That's shipped
   and merged (PR #87). But the fix works by keeping the surface locked
   down — publishing the full endpoint list to anyone who looks makes
   every future auth bug on this API easier to find from the outside.
3. **Design-partner goal has sat unconfirmed for two weeks** and nothing
   this session did moved it — no real ingestion, no real tenant, still
   demo data. Not a criticism of today's work, which was content and
   security hardening; just naming that the actual headline goal hasn't
   had attention in two weeks either.

**Decisions owed.**

- **Create the Stripe Payment Link.** Two minutes in the Stripe dashboard
  (see the comment in `paidTrack.js`). Nobody else can do this. Recommend:
  do it this week — every day it's undone, the content goal's only real
  measure stays at zero regardless of what else ships.
- **Gate `/openapi.json`/`/docs` in production.** Options: disable via
  FastAPI's `docs_url=None` in prod, or leave it public now that every
  endpoint is properly auth-gated post-PR#87. Recommend: gate it anyway —
  auth being correct today doesn't mean the next endpoint added will be,
  and there's no reason to hand out the map for free.
- **Confirm or amend the design-partner goal.** It's the proposed default,
  unconfirmed for two weeks. Recommend: confirm as written (outcome,
  2026-12-31 deadline, `/api/adoption` measure) — nothing's surfaced to
  contradict it, and an unconfirmed goal can't be scored honestly.
- **Set the news goal's outcome/deadline/measure.** Recommend a measure
  that scores accuracy, not volume — e.g. "N published/week with zero
  post-hoc corrections," not a raw count — given the all-published,
  zero-rejected pattern above is exactly the kind of number that looks
  like progress without being one.

**Dropped.** Nothing was deliberately declined this session. Worth naming
instead: `merit-growth-log.md` and `merit-eng-log.md` are still empty
files despite real growth and engineering work landing in eleven-plus PRs
today. The logging discipline this team's own skills require hasn't been
followed even while the work itself got done — that's a process gap, not
a priority call, and it's why this brief had to reconstruct today's state
from PR history and a live site check instead of reading a log.
