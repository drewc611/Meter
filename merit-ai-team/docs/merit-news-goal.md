# Merit AC news goal

**Status: PROPOSED.** Third goal, separate from the design-partner goal
(`merit-goal.md`) and the content/challenge goal (`merit-content-goal.md`).
Andrew hasn't given an outcome, deadline, or measure for this one yet — do
not invent them. Propose this shell and ask him to fill the blanks, the
same way the other two goals sat PROPOSED before he confirmed them.

**Outcome:** <needs Andrew — e.g. "N articles/week published and indexed"
or "N/news driving M sessions to /guides or /prompts">
**Deadline:** <needs Andrew>
**Measure:** <needs Andrew — published count? traffic? something else?>
**Constraint:** No invented statistics or sources, same discipline as the
other two goals' copy. Every published claim needs a real, checkable
source. Publishing is autonomous (see below) — the constraint that
replaces human review is the Judge-tier pass plus the visible
corrections trail on every article (`corrections` field in `news.js`,
rendered on the article itself).

Never average this into the other two goals' status. Rank `merit-growth`'s
news-related work against this one specifically.

## How this goal is different from the other two

The design-partner and content/challenge goals both route through a normal
PR review before anything ships. This one doesn't: a scheduled run
researches real AI news, drafts an article, runs it through an adversarial
Judge-tier pass, and — if the pass clears it — commits, builds, and merges
directly to `main` with no human in the loop. This is Andrew's explicit,
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
- Andrew directly confirmed autonomous publishing (Judge-tier pass, no
  human review gate) for the news arm, in response to a direct question —
  twice, the second time explicitly independent of a prior document that
  had cited four specific incidents (a fabricated Hacker News quote, a
  fabricated byline, incorrect Rippling statistics, and two "no backlash"
  absence-of-evidence claims) as justification. Those incidents were
  checked against `merit-growth-log.md` and do not exist there — the file
  has no dated entries at all. The autonomous-publish decision stands on
  Andrew's own confirmation, not on that document's claims.
- Outcome/deadline/measure still open — flag every run until Andrew closes
  them.
