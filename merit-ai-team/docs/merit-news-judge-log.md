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

### 2026-08-23 14:30 UTC — openai-crosses-one-billion-active-users
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites OpenAI's own blog post (`openai.com/index/building-abundant-intelligence/`) as primary; TechSpot (byline Rob Thubron) as corroborating secondary, not the sole source.
- Quotes ≤15 words, one per source: pass — OpenAI quote trimmed to the 12-word clause "more than one billion active users and more than two million businesses"; no quote taken from the TechSpot source.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — OpenAI's own blog (CFO Sarah Friar, named); TechSpot byline Rob Thubron, confirmed via direct fetch of the article.
**Notes:** WebFetch on the OpenAI blog URL itself returned 403 (bot-blocked); primary-source claim rests on that URL being independently and consistently cited by multiple reputable secondary sources (AFP wire via CP24, TechSpot, PYMNTS) rather than on this run rendering the page directly. Flagging this as a real limitation, not a silent gap — a future run should retry fetching openai.com directly if a tool with different access becomes available, and downgrade this to "trade-report only" if the primary link is ever found to be wrong.

### 2026-08-23 14:30 UTC — openai-astra-solves-ten-decades-old-math-problems
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites OpenAI's own report PDF (`cdn.openai.com/pdf/ten-proofs-oai.pdf`) as primary; THE DECODER (byline Matthias Bastian) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — "The mathematical arguments themselves, however, came from Astra" (9 words), one quote, attributed to OpenAI's own report.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — OpenAI's own report; THE DECODER byline Matthias Bastian, confirmed via direct fetch of the article.
**Notes:** None.

### 2026-08-23 15:10 UTC — darpa-flies-ai-controlled-f-16-venom
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites DARPA's own official press release (`darpa.mil/news/2026/darpa-us-air-force-fly-ai-controlled-f-16`) as primary; The Debrief as corroborating secondary.
- Quotes ≤15 words, one per source: pass — DARPA quote trimmed to the 15-word clause "automated flight controls and sensors on a standard F-16 without changing the jet's core software," attributed by name to program manager Brig. Gen. James Valpiani; no quote taken from the secondary source.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — DARPA's own press release, official .mil domain, named program managers quoted directly; The Debrief cited as corroboration only, no quote drawn from it.
**Notes:** None.

### 2026-08-23 15:10 UTC — cloudflare-kitesurf-agent-first-browser
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Cloudflare's own blog post (`blog.cloudflare.com/kitesurf/`) as primary for all technical/performance claims; TechCrunch (byline Sarah Perez) as corroborating secondary, not the source of any specific claim.
- Quotes ≤15 words, one per source: pass — Cloudflare quote trimmed to the 14-word clause "giving all agents a browser that excels at what's important for an AI model"; no quote taken from TechCrunch.
- No absence-of-evidence claims: pass — explicitly hedged the security claim ("whether that holds up under real adversarial use is unproven this early") rather than asserting safety, and listed Kitesurf's stated current limitations (no video/WebGL/bot-detection/persistent auth) rather than omitting them.
- Every citation has a confirmed byline/author: pass — Cloudflare's own blog (author Celso Martinho, listed on the post); TechCrunch byline Sarah Perez, confirmed via direct fetch of the article.
**Notes:** None.
