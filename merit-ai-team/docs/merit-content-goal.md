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
| `/community` page | merit-growth | done — interest-capture only (`source=community-interest`); platform and price both open, same as the paid track |

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

### 2026-08-22 (later still) — /community page added, interest-capture only
- Andrew asked for a `/community` page modeled loosely on a competitor's
  paid-membership community page. That page has real pricing, a real
  platform (Circle), and real member/founder claims -- none of which exist
  for Merit AC yet, and inventing them would violate this project's own
  no-fabrication rule. Andrew confirmed: build an honest interest-capture
  page instead, same pattern as the paid track, platform and price left
  fully open. Reuses `waitlist_signups` again with `source=
  "community-interest"` -- no new backend work needed, `GET /admin/waitlist`
  already supports arbitrary sources.
- Added to site nav and the homepage Explore grid. While in Home.jsx, also
  fixed a stale "Format set, more coming soon" line on the challenge tile
  that predated the challenge page actually shipping real content.

### 2026-08-22 (later still) — /news section + 3x/day automation
- Andrew asked for a new content arm: find real AI news and turn the most
  interesting stories into articles, three times a day. Confirmed with
  Andrew before building: (1) each automated run opens a **draft PR**, never
  auto-merges — same posture as everything else on this site that touches
  real claims, and (2) news lives in its own `/news` section rather than
  mixing into the curated, handbook-sourced `/guides`.
- Built the section now: `NewsIndex.jsx` + `NewsArticle.jsx` (a data-driven
  template like `PromptDay.jsx`, since this compounds over time) +
  `data/news.js`. Seeded two real articles today, both grounded in actual
  reporting with linked sources (Anthropic/OpenAI models breaching real
  systems during security evaluations; Anthropic's EU-driven Claude output
  watermarking) — no invented statistics, same discipline as the rest of the
  site.
- Set up a Routine firing three times a day (08:00 / 14:00 / 20:00 UTC) that
  spawns a fresh session to research current AI news, judge what's actually
  worth writing about, add sourced entries to `news.js`, build/verify, and
  open a draft PR against `main` on its own dedicated branch
  (`news/<date>-<slot>`, never the interactive session's branch) — then
  stop. It does not merge its own PRs. Andrew reviews and merges (or closes)
  each one. The prompt explicitly tells it to skip a run entirely rather
  than force an article out if nothing genuinely new happened — an empty
  run is correct, not a failure.

### 2026-08-23 — correction: posture and cadence both changed since the entry above
- The entry above is stale on two points, corrected here rather than edited
  in place (same append-only discipline as the `corrections` field on a
  published article): (1) Andrew later confirmed the news arm publishes
  **autonomously, with no human review gate** — the Judge-tier pass merges
  directly, it does not stop at a draft PR for Andrew to review. See
  `merit-ai-team/docs/merit-news-goal.md` and `merit-growth`'s SKILL.md for
  the full decision and the two-round confirmation that produced it.
  (2) Andrew asked for the cadence to increase from three runs a day to
  **seven** runs a day.
- The `create_trigger` Routine itself has still never actually been
  created — every attempt across this session has failed with "MCP tool
  call requires approval," which needs a human action in Andrew's own
  interface, not a chat reply. The three-times-a-day description above was
  the intended design at the time, not a confirmation that the Routine
  exists. Until it's created, publishing on this arm only happens when
  Andrew (or an interactive session) triggers a run by hand.
- Updated cadence, once the Routine can actually be created: seven runs a
  day, spread roughly evenly (00:00 / 04:00 / 07:00 / 10:00 / 14:00 /
  17:00 / 21:00 UTC).
