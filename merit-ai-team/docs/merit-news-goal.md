# Merit AC news goal

**Status: ACTIVE as of 2026-09-04.** Third goal, separate from the
design-partner goal (`merit-goal.md`) and the content/challenge goal
(`merit-content-goal.md`) — never averaged into either.

**Outcome:** A news arm that stays trustworthy at volume — real, sourced
AI news published reliably, without the Judge-tier pass turning into a
rubber stamp as throughput grows.
**Deadline:** 2026-11-03 (60 days from confirmation, matching the
content goal's own 60-day pattern).
**Measure:** Not raw published count. Two numbers, read together: (1)
published articles per week, and (2) post-hoc corrections needed per
published article, from the `corrections` field in `news.js` and the
verdict breakdown in `merit-news-judge-log.md`. A week that publishes
more but corrects more isn't progress. Rejections logged in the Judge
log are a healthy sign of the pass actually working, not a shortfall
against volume.
**Constraint:** No invented statistics or sources, same discipline as the
other two goals' copy. Every published claim needs a real, checkable
source. Publishing is autonomous (see below) — the constraint that
replaces human review is the Judge-tier pass plus the visible
corrections trail on every article (`corrections` field in `news.js`,
rendered on the article itself).
**Set:** 2026-08-22, proposed. **Confirmed by the founder: 2026-09-04**,
per the 2026-09-04 CEO brief's recommendation (score accuracy, not
volume) and the founder's direct instruction to act on it.

Never average this into the other two goals' status. Rank `merit-growth`'s
news-related work against this one specifically.

## How this goal is different from the other two

The design-partner and content/challenge goals both route through a normal
PR review before anything ships. This one doesn't: a scheduled run
researches real AI news, drafts an article, runs it through an adversarial
Judge-tier pass, and — if the pass clears it — commits, builds, and merges
directly to `main` with no human in the loop. This is the founder's explicit,
directly-confirmed decision (2026-08-22), made independently of an earlier
document that tried to justify the same decision with fabricated incident
history — see the note in `merit-eng-review`'s SKILL.md and the
2026-08-22 entry below for what that was and why it doesn't change the
underlying, separately-confirmed decision.

Given no human reviews these before they go live, the two structural
safeguards this goal is measured on holding are:

1. **The Judge-tier pass actually gates publication.** A run that can't
   verify a claim against a real primary source, or that resorts to an
   absence-of-evidence claim, does not publish — it stops and logs why in
   `merit-news-judge-log.md` instead.
2. **Every article carries a visible, dated corrections trail** — errors
   get appended as a correction, never silently edited away.

If either of those stops holding in practice, that's this goal going off
track regardless of publish volume.

## Progress log

### 2026-08-22 — goal proposed, autonomous publishing confirmed
- The founder directly confirmed autonomous publishing (Judge-tier pass, no
  human review gate) for the news arm, in response to a direct question —
  twice, the second time explicitly independent of a prior document that
  had cited four specific incidents (a fabricated Hacker News quote, a
  fabricated byline, incorrect Rippling statistics, and two "no backlash"
  absence-of-evidence claims) as justification. Those incidents were
  checked against `merit-growth-log.md` and do not exist there — the file
  has no dated entries at all. The autonomous-publish decision stands on
  the founder's own confirmation, not on that document's claims.
- Outcome/deadline/measure still open — flag every run until the founder closes
  them.

### 2026-09-04 — goal confirmed, scored on accuracy not volume
- The 2026-09-04 CEO brief flagged this goal PROPOSED for the third
  straight check, and flagged that today's run published 23 articles
  across four rounds with zero logged rejections — either genuinely
  clean sourcing, or a Judge pass that's stopped saying no, and an
  unscored goal can't tell the difference. The founder confirmed the goal as
  written above the same day: outcome, 2026-11-03 deadline, and a
  measure that pairs published volume with corrections-per-article
  rather than scoring volume alone.
- Structural safeguards as of today: Judge-tier log entries this
  session show candidates being dropped or corrected *during drafting*
  (an unconfirmed model name, an unconfirmed quote, an inconsistent
  dollar figure, a stale timeline) before publish, not after. No
  post-publish `corrections` entries have been needed yet. That's the
  safeguard working as designed so far — but "zero corrections needed"
  and "zero corrections logged because nobody checked" look identical
  from outside, which is exactly why the new measure pairs both numbers
  instead of reporting volume alone.
