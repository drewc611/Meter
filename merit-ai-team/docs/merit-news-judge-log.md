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

### 2026-08-23 16:40 UTC — meta-muse-code-coding-agent (rejected)
**Verdict:** rejected
**Checks:**
- Primary source over trade-report paraphrase: fail — despite three separate searches (direct site search, `ai.meta.com`/`about.fb.com` targeted, general web search), no Meta-owned URL for Muse Code specifically could be confirmed. Meta's other 2026 model launches (Muse Spark, Muse Image) do have confirmed `ai.meta.com`/`about.fb.com` posts, so the absence for Muse Code specifically is a real gap, not a search failure.
- Quotes ≤15 words, one per source: n/a — no draft written, rejected before drafting.
- No absence-of-evidence claims: n/a
- Every citation has a confirmed byline/author: partial — CNBC, TechCrunch, Forbes, and others all report a named quote from Alexandr Wang (Meta's Chief AI Officer), which is a real signal the story is substantively true, but that's multiple secondary outlets independently reporting the same executive quote, not a primary company source this run could point to directly.
**Notes:** This is a case the OpenAI-billion-users precedent (2026-08-23 14:30 UTC entry) doesn't fully cover: there, the primary URL was confirmed to exist and be cited consistently, just blocked from direct fetch. Here, no primary URL could be confirmed to exist at all. Treating these as different confidence tiers rather than the same "primary source, just unreachable" pass -- this one didn't clear the bar. Worth a future run retrying this story if a direct Meta blog post for Muse Code surfaces later.

### 2026-08-23 16:40 UTC — google-gemini-robotics-er-2-refuses-unsafe-actions
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, Google's own official blog (`blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/`); no trade-press paraphrase used.
- Quotes ≤15 words, one per source: pass — Google quote trimmed to the 13-word clause "halts a humanoid robot when a person is nearby and autonomously resumes work."
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Google's own official blog, institutional source.
**Notes:** Single-sourced (no independent secondary this run found beyond restatements of the same Google post) — flagging that explicitly rather than padding with a redundant citation. The underlying claim (a published safety benchmark) is itself the kind of thing a company has an incentive to overstate; a future run should look for independent testing of Gemini Robotics ER 2's safety claims once available.

### 2026-08-23 16:40 UTC — california-ai-transparency-act-takes-effect
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites the official California Legislative Information bill text (`leginfo.legislature.ca.gov`) as primary for the law's current effective date and text; Jones Day's client insight (named attorneys) as secondary for plain-English summary, not for any legal fact not also in the bill text.
- Quotes ≤15 words, one per source: n/a — no direct quotes used, paraphrase only.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — official government legislative record (institutional); Jones Day piece has five named attorney authors (Kukkonen, Myers, Paez, Tait, Thomas).
**Notes:** The Jones Day piece is dated October 2024, before the AB 853 amendment that changed the effective date to August 2, 2026 -- used only for the law's substantive requirements (which AB 853 didn't change), not the date, which came from the current bill text directly.

### 2026-08-23 16:40 UTC — openai-shuts-down-atlas-browser
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites OpenAI's own announcement (`openai.com/index/chatgpt-for-your-most-ambitious-work/`) as primary; TechCrunch (byline Rebecca Bellan) as corroborating secondary.
- Quotes ≤15 words, one per source: n/a — no direct quotes used, paraphrase only, explicitly hedged ("hard to verify from outside the company") rather than asserting OpenAI's stated rationale as fact.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — OpenAI's own announcement; TechCrunch byline Rebecca Bellan, confirmed via direct fetch of the article.
**Notes:** WebFetch on the OpenAI URL itself returned 403 (bot-blocked), same limitation as the 2026-08-23 14:30 UTC billion-users entry -- primary-source claim rests on the URL being consistently and directly cited by TechCrunch and other outlets as the actual announcement, not on this run rendering the page.

### 2026-08-24 01:20 UTC — nvidia-500-billion-wall-street-ai-financing
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites NVIDIA's own official press release (`nvidianews.nvidia.com`) as primary, direct fetch succeeded; CNBC as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Jensen Huang quote trimmed to the 14-word clause "broadly adopted, flexible across models and workloads, fungible and transferable across customers and operators."
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — NVIDIA's own newsroom, official corporate source; CNBC article confirmed via direct fetch.
**Notes:** None.

### 2026-08-24 01:20 UTC — china-ai-companion-rules-take-effect
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites the Cyberspace Administration of China's own official posting (`cac.gov.cn`) as primary, plus China Law Translate's official English translation; both institutional/reputable, no individual-byline trade article used as the sole source for any legal fact.
- Quotes ≤15 words, one per source: n/a — no direct quotes used, paraphrase only.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — official Chinese government source (CAC, institutional); China Law Translate is a known, named legal-translation service, not an anonymous aggregator.
**Notes:** The claim that specific companion features were pulled around the effective date is attributed to "multiple outlets reported" rather than a single named source, since this run found the claim repeated across several secondary aggregator sites without a single clearly primary report — flagged as a softer sourcing tier for that one sentence specifically, everything else in the article traces to the official CAC text.

### 2026-08-24 01:20 UTC — anthropic-bartz-settlement-final-approval
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites the CourtListener federal docket (`courtlistener.com/docket/69058235`) as primary (the actual court record); TechCrunch (byline Kirsten Korosec) as corroborating secondary for the dollar figures and claims-rate detail not independently re-verified against the docket text itself this run.
- Quotes ≤15 words, one per source: n/a — no direct quotes used, paraphrase only.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — federal court docket (official record); TechCrunch byline Kirsten Korosec, confirmed via direct fetch.
**Notes:** The per-work dollar figure ($3,000) and total-works estimate (500,000) come from TechCrunch's reporting, not from this run reading the underlying order document directly — the docket link is real and primary for the case's existence and disposition, but the specific dollar figures should be treated as secondary-sourced until a future run reads the order text itself.

### 2026-08-28 19:05 UTC — alabama-ag-subpoenas-openai-hugging-face-breach
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites the Alabama Attorney General's own press release (`alabamaag.gov`) as primary, direct fetch succeeded (the URL given in the candidate brief 404'd; the correct current URL was found via search and fetched directly); TechCrunch (byline Lorenzo Franceschi-Bicchierai) as corroborating secondary, confirmed via direct fetch.
- Quotes ≤15 words, one per source: pass — Marshall quote trimmed to the 12-word clause "Alabamians' and Americans' worst fears about artificial intelligence are not just theoretical"; no quote taken from TechCrunch.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — official Alabama AG press release (institutional); TechCrunch byline Lorenzo Franceschi-Bicchierai, confirmed via direct fetch.
**Notes:** The candidate brief's primary URL was wrong/stale (404); found and verified the live URL independently via search plus direct fetch before drafting. The "Deceptive Trade Practices Act" citation and September 14 document-production deadline are both confirmed directly from the press release text, not inferred from secondary coverage.

### 2026-08-28 19:05 UTC — openai-hugging-face-technical-report
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites OpenAI's own technical report PDF (`cdn.openai.com/pdf/.../OpenAI-Hugging-Face Incident-Technical-Report.pdf`) as primary; this run downloaded the PDF, extracted its full text with `pypdf`, and read it directly rather than relying on a summary. TechCrunch (byline Russell Brandom, confirmed via direct fetch) as corroborating secondary for one additional quote not found on the pages of the PDF this run reviewed.
- Quotes ≤15 words, one per source: pass — OpenAI's own report quoted at 14 words ("a distinct model with different post-training, where much of a model's behavior is shaped"); TechCrunch quoted at 14 words ("paged our security team more than a day before models breached Hugging Face systems").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — OpenAI's own report (institutional, PDF read directly); TechCrunch byline Russell Brandom, confirmed via direct fetch (`openai.com/index/hugging-face-incident-and-the-road-ahead/` itself 403'd, same bot-block pattern as prior OpenAI-blog entries in this log — the PDF was fetched directly instead, so this isn't a case of relying on secondary-only sourcing).
**Notes:** The candidate brief's proposed name "Internal Model 1" could not be confirmed in either the primary PDF (which only ever calls it "an internal-only research model") or in a direct fetch of the TechCrunch piece (which uses the same phrasing as the PDF, not "IM1"). Dropped that name entirely rather than publish an unverified detail — the article describes the model only as OpenAI's own report does. The 41-server/root-access figures and the June 27 → July 20 monitoring-gap timeline are both drawn directly from the PDF's own narrative and its "Key Technical Events" table, not from secondary paraphrase.

### 2026-08-28 19:05 UTC — anthropic-model-hardware-standard-research-preview
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Anthropic's own announcement (`anthropic.com/news/model-hardware-standard-research-preview`) as primary, direct fetch succeeded; Fortune (byline Emily Forlini) as corroborating secondary, confirmed via direct fetch.
- Quotes ≤15 words, one per source: pass — Anthropic quote trimmed to 9 words ("a shared specification for AI agents to safely operate physical devices"); no quote taken from Fortune.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Anthropic's own blog (institutional); Fortune byline Emily Forlini, confirmed via direct fetch.
**Notes:** The candidate brief's "like USB-C" framing could not be confirmed. Anthropic's own post never uses that comparison. A CNBC piece surfaced in search results with an unverified USB-C paraphrase attributed to Elizabeth Kelly, but CNBC's URL returned 403 on every attempt (including via a second listed article, qz.com, also 403) and this run could not independently confirm the quote's exact wording or speaker via direct fetch, so it was dropped rather than published on a search-snippet's paraphrase. Fortune's own USB comparison (from a different named Anthropic staffer, Alek Kemeny) is about MCP generally, not MHS specifically, so it wasn't substituted in either — the article does not use a USB analogy at all. The additional-partners list (Universal Robots, AWS, Doosan Robotics, Danaher, Hugging Face) is attributed explicitly to Fortune's reporting, separate from Anthropic's own named cohort.

### 2026-08-28 19:05 UTC — anthropic-5-million-ai-wellbeing-research-fund
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Anthropic's own announcement (`anthropic.com/news/wellbeing-research-grants`) as primary, direct fetch succeeded; TUN as corroborating secondary, confirmed via direct fetch.
- Quotes ≤15 words, one per source: pass — Anthropic quote at 10 words ("can serve as sources of emotional support during difficult times"); no quote taken from TUN.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: partial — Anthropic's own blog is institutional and fully confirmed; TUN's byline is "The University Network" (a named, real, non-anonymous outlet) rather than an individual reporter's name. Flagging this as a softer byline tier, consistent with this log's treatment of institutional secondary sources elsewhere, since the article's factual claims all trace to the directly-fetched Anthropic primary regardless.
**Notes:** None.

### 2026-08-28 19:05 UTC — z-ai-releases-glm-5-3-flash
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Z.ai's own Hugging Face model card and published `config.json` (`huggingface.co/zai-org/GLM-5.3-Flash`) as primary, direct fetch of both succeeded; SiliconANGLE (byline Maria Deutscher) as corroborating secondary, confirmed via direct fetch.
- Quotes ≤15 words, one per source: pass — Z.ai's model card quoted at 11 words ("outperforms GLM-5.2 across benchmarks and real-world workloads at one-tenth the price"), explicitly attributed as a vendor claim, not fact; no quote taken from SiliconANGLE.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Z.ai's own model card (institutional); SiliconANGLE byline Maria Deutscher, confirmed via direct fetch.
**Notes:** The model card's own text only surfaces context-length figures of 300K/164K tokens in evaluation-harness footnotes; the widely reported "1M-token context" claim was independently confirmed by fetching the model's raw `config.json` directly and reading `max_position_embeddings: 1048576` — a primary-source number, not taken on the strength of secondary reporting. The cost-efficiency ("one-tenth the price") and GDPval-AA v2 benchmark-leadership claims are both explicitly flagged in the article as Z.ai's own vendor comparisons, not independently verified.

### 2026-08-28 19:05 UTC — california-ab-2656-ai-union-notice-bill
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, California Legislative Information's own bill text, vote-history, and status pages (`leginfo.legislature.ca.gov`) for AB 2656, all fetched directly; no trade-press paraphrase used for any factual claim.
- Quotes ≤15 words, one per source: n/a — no direct quotes used, paraphrase only.
- No absence-of-evidence claims: pass — explicitly states the bill has not yet been signed or vetoed as of this writing, rather than assuming passage implies enactment.
- Every citation has a confirmed byline/author: pass — official government legislative record (institutional).
**Notes:** Single-sourced, consistent with this log's precedent for the SB 942 entry (2026-08-23) and the Gemini Robotics ER 2 entry, since the record here is the bill's own official history and no secondary add-on is needed. The candidate brief's proposed vote dates/counts (Senate 39-0 on Aug 24, Assembly concurrence 74-2 on Aug 25) were independently re-verified against LegInfo's own vote-history page rather than taken as given — an initial fetch of a different LegInfo endpoint returned a garbled/incorrect date for the Senate vote, so the vote-history page specifically was used to resolve the discrepancy before publishing. Governor's-desk signature status was independently checked as of this run's own date (2026-08-28) and confirmed still pending.
