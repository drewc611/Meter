# Merit AC executive brief

Maintained by `merit-ceo-brief`. Weekly synthesis for the founder — two goal lines,
never blended. Append each week's brief as a new dated section.

## Log

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
