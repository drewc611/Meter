# Merit AC news Judge-pass log

Every automated news run's Judge-tier pass result gets logged here,
whether it passed or not — this is the reviewable record that stands in
for a human review gate. A pattern of near-misses needs to be visible
before it becomes a published error, not discovered after.

Append-only. Newest entry at the bottom of the Log section.

## What gets logged

For every run that drafts at least one candidate article:

```markdown
### YYYY-MM-DD HH:MM UTC — <slug or working title>
**Verdict:** published | rejected | skipped (nothing newsworthy)
**Checks:**
- Primary source over trade-report paraphrase: pass | fail
- Quotes ≤15 words, one per source: pass | fail | n/a
- No absence-of-evidence claims ("no backlash", "no criticism found", etc.): pass | fail
- Every citation has a confirmed byline/author: pass | fail
**Notes:** <what specifically failed, if rejected — concrete, not vague>
```

A rejected run is not a failure of the pipeline — it's the pipeline
working. A run of all-"published" entries with zero rejections over a long
stretch is itself worth checking: either the source material has been
unusually clean, or the Judge pass has gotten lax.

## Log
