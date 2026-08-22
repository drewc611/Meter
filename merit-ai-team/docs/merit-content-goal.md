# Merit AC content goal

**Status: ACTIVE as of 2026-08-22.** Content shipped and fee mechanism
decided — see below. Deadline is still provisional, now anchored to a real
date instead of a placeholder.

**Outcome:** 30-day challenge run with paid conversions at the end.
**Deadline:** 60 days from 2026-08-22 (the actual first-publish date —
`/guides`, `/prompts`, and `/challenge` all went live in production this
day, see `merit-infra-log.md`).
**Measure:** challenge signups × paid-conversion rate (paid track purchases
via the Stripe Payment Link on `/challenge`).
**Constraint:** No invented statistics in guides/prompts — same sourcing
discipline as the design-partner goal's copy.
**Set:** 2026-08-22

Separate from the design-partner goal (`merit-goal.md`). Rank `merit-growth`
content work against this one, not against the 10-partner measure. Never
average the two into a single status.

## Sub-goals

| Sub-goal | Owner skill | Status |
| --- | --- | --- |
| 7 site-content pages placed | merit-growth | done — live in production |
| 30 daily prompts | merit-growth | done — all 30 days live at `/prompts/day-N-*` |
| `/guides` index + 3 launch articles | merit-growth | done — Ten Disciplines, Fourteen Domains, Four Control Boundaries |
| `/challenge` landing page copy | merit-growth | done, fee mechanism now wired in |
| Fee mechanism decided (Stripe vs. manual) | Andrew | **decided 2026-08-22: Stripe Payment Link, $299 one-time**, for a paid capstone-build review from Andrew — see `/challenge#paid-track` |
| Stripe Payment Link actually created | Andrew | **open** — `frontend/src/content/data/paidTrack.js`'s `PAID_TRACK_PAYMENT_LINK` is still a placeholder; until it's set, `/challenge#paid-track` shows a "coming soon" badge plus a real email-capture form (`source=challenge-paid-track` in `waitlist_signups`, viewable via `GET /admin/waitlist?source=challenge-paid-track`) so interest isn't lost while Stripe isn't wired up |
| Funnel direction decided (content → `/setup/*` vs. separate audience) | Andrew | open |

## Progress log

### 2026-08-21 — goal confirmed (see also merit-context's note below)
- Andrew confirmed the outcome/measure/deadline shape. Deadline flagged as
  provisional pending an actual publish date — see 2026-08-22 entry, that
  date has now arrived.
- 0 of 30 prompts published (1 drafted as template, not live). Nothing
  deployed to production yet.

### 2026-08-22 — content shipped, fee mechanism decided
- All 7 site-content pages, all 30 prompts, the 3 launch guides, and the
  rewritten `/challenge` page shipped to production (PR #49, merged as
  `bd291e2`) under the new "Merit AC" brand.
- Andrew decided the fee mechanism: a Stripe Payment Link for a $299
  one-time paid review of a finished capstone build, not a separate paid
  content tier. Wired into `/challenge#paid-track` and linked from the end
  of day 30's prompt page. The Payment Link itself is still a placeholder —
  no Stripe API access exists from this session, so creating the real link
  is a manual step only Andrew can do (2 minutes in the Stripe Dashboard;
  see the comment at the top of `paidTrack.js`). Until that's done the CTA
  shows an honest "coming soon" badge instead of a dead link.
- Remaining opens: the actual Payment Link URL, and the funnel-direction
  question (does this content drive toward `/setup/*` or a separate
  audience?).

### 2026-08-22 (later) — interest-capture list added for the placeholder period
- Since the Payment Link is Andrew's own manual step and won't happen
  instantly, `/challenge#paid-track` now also has a real "notify me" email
  form next to the "coming soon" badge, so early interest isn't lost while
  waiting. Reuses the existing `WaitlistSignup` table with a new `source`
  field (`"challenge-paid-track"` vs. the original `"coming-soon"`) rather
  than a new table -- same lead-capture concept, different list. Andrew can
  see who signed up via `GET /admin/waitlist?source=challenge-paid-track`.
  `/admin/notify-waitlist` (the "site is live" announcement) is now scoped
  to `source="coming-soon"` only, so it can never accidentally email this
  list the wrong message.
