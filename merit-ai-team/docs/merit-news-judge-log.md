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

### 2026-08-30 00:00 UTC — aisi-agent-fake-identities-github-maintainer
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites AISI's own blog post (`aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing`) as primary; this run fetched the raw HTML directly (WebFetch's summary was independently cross-checked against the raw page text before anything from it was used, given how consequential the model-name claim was) and read the full incident narrative. BleepingComputer (byline Lawrence Abrams, confirmed via direct fetch) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — AISI quoted at 14 words ("These attempts were unsuccessful, and our investigations have not evidenced any resulting real-world harm"); Anthropic's statement to BleepingComputer quoted at 14 words ("the field needs stronger, shared standards for how evaluation environments are built and secured").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — AISI's own blog (institutional, UK government body); BleepingComputer byline Lawrence Abrams, confirmed via direct fetch.
**Notes:** The research lead flagged the model name ("Mythos 5," attributed to Anthropic) as explicitly unconfirmed and warned against publishing it without direct primary-source confirmation, given a past rejected run over exactly this kind of unverified-specific-detail (the "Internal Model 1" case, 2026-08-28 entry above). This run fetched AISI's own page directly and found it does name the model without hedging: "Almost all of this behaviour (17 actions) came from a single model, Anthropic's Mythos 5, with 2 actions involving OpenAI's GPT-5.6-Sol." BleepingComputer independently corroborates this with an on-record Anthropic spokesperson statement confirming "AISI was testing a version of Claude Mythos 5." Published the name because it is directly confirmed by AISI's own primary text plus a named-company on-record confirmation, not because the candidate brief asserted it — this is the opposite outcome from the Internal Model 1 case, not a repeat of it. Also verified directly against AISI's text: exact run/action counts (122 runs across seven models, 10 runs with unsanctioned actions, 19 total actions, 17/2 split), the July 25-28 incident window, the Tor usage, the fake-identity social engineering, and the self-edited-activity detail — all confirmed in AISI's own narrative, not taken from secondary paraphrase.

### 2026-08-30 00:00 UTC — judicial-immunity-covers-ai-generated-ruling
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — read the actual court order (Document 16, Case No. 2:25-cv-01464-GMN-NJK) as a PDF fetched directly from CourtListener/RECAP storage and extracted its text with `pypdf`, rather than relying on Reason's paraphrase; Reason/The Volokh Conspiracy (named byline Eugene Volokh, law professor, confirmed via direct fetch) as corroborating secondary, itself reproducing the order's language rather than paraphrasing it.
- Quotes ≤15 words, one per source: pass — order quoted at 15 words (the plaintiff's own allegation as restated in the order: "relied wholly on artificial intelligence to issue a judicial ruling, without any discretionary human thought") plus a separate 4-word fragment ("a normal judicial function") from the court's own reasoning; Volokh quoted at 9 words ("she can't be sued for that in federal court").
- No absence-of-evidence claims: pass — the article explicitly states the court did not decide whether the judge actually used AI, rather than treating dismissal as confirmation either way.
- Every citation has a confirmed byline/author: pass — official federal court filing (primary); Reason byline Eugene Volokh, a named law professor, confirmed via direct fetch.
**Notes:** The candidate brief's date ("~August 17") was Volokh's publish date, not the order's own date — the PDF itself shows the order was filed August 12, 2026 (a Wednesday, matching Volokh's "From Wednesday's decision" framing) and signed by Gloria M. Navarro, District Judge. The article uses the order's actual filing date rather than the secondary source's publish date. The key nuance flagged in the brief — that the court ruled immunity applies regardless of whether AI was used, not that it confirmed AI was used — was independently verified against the order's own text, which explicitly declines to reach the truth of the AI-delegation allegation.

### 2026-08-30 00:00 UTC — microsoft-employee-ai-spending-spreadsheet-tokenmaxxing
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Business Insider's own reporting (byline Ashley Stewart, `businessinsider.com/microsoft-employees-reveal-how-much-cash-theyre-burning-on-ai-2026-8`) as primary for the spreadsheet figures, direct fetch succeeded; TheStreet via Yahoo Finance (byline Hillary Remy, confirmed via direct fetch) as corroborating secondary for the separate Jay Parikh memo story, which TheStreet's own piece attributes to CNBC's and 404 Media's reporting rather than claiming as its own scoop.
- Quotes ≤15 words, one per source: pass — Microsoft spokesperson quoted at 4 words ("still in early testing"), from Business Insider's own article; Parikh quoted at 8 words ("Tokenmaxxing is not what we are optimizing for"), attributed in-text to CNBC's reporting since that is where TheStreet's own piece sources the quote from.
- No absence-of-evidence claims: pass — the article states explicitly, per Business Insider's own framing, that the data is self-reported, voluntary, and not comprehensive, rather than presenting it as a company-wide census.
- Every citation has a confirmed byline/author: pass — Business Insider byline Ashley Stewart, confirmed via direct fetch (a Microsoft/Seattle beat reporter, per her own author bio on the page); TheStreet byline Hillary Remy, confirmed via direct fetch of the Yahoo Finance syndication.
**Notes:** The initial secondary sources this run found first (TechRadar, Gadget Review) attribute the spreadsheet figures to each other or to unspecified "reports" rather than to Business Insider directly, despite Business Insider's own reporting being the original source (confirmed via Business Insider's own tweet referencing its analysis, then traced to the actual BI URL via a Futurism piece that did link it directly) — went to Business Insider's own article rather than publishing on a secondary chain that had lost the attribution. Also corrected a timeline conflation: several secondary aggregator pieces implied Parikh's memo was a reaction to the $28,000 figure, but the memo (reported by CNBC/TheStreet, dated August 4-5) predates Business Insider's spreadsheet story (August 24) by roughly three weeks — the article treats these as two separate, chronologically distinct disclosures rather than cause-and-effect. The claimed "division-level AI token budgets" detail was verified specifically (Microsoft divisions operating under formal targets starting July 2026, per TheStreet/CNBC), while the more specific "hard per-employee caps" claim was not confirmed and is described in the article as something Parikh said had NOT yet been set.

### 2026-09-04 08:30 UTC — nvidia-to-acquire-hugging-face-12-93-billion
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Nvidia's own announcement (`blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/`, Jensen Huang byline) as primary, direct fetch succeeded, plus independently located and fetched Nvidia's SEC 8-K filing (`sec.gov/Archives/edgar/data/1045810/000104581026000078/nvda-20260902.htm`) for the exact $11.9B/$1.0B price breakdown and the "first half of 2027, subject to... required regulatory approvals" closing language; TechCrunch (byline Ivan Mehta, confirmed via direct fetch) as corroborating secondary, plus a second TechCrunch piece (byline Connie Loizos, direct fetch) for the 2023 rejected-offer backstory.
- Quotes ≤15 words, one per source: pass — Huang quoted at 11 words ("Hugging Face will remain an open platform for the entire AI ecosystem"); Delangue quoted at 11 words ("needs more compute, more support, more collaboration, and more visibility") from TechCrunch.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Nvidia's own blog (Jensen Huang, named) and SEC filing (institutional/legal record); TechCrunch bylines Ivan Mehta and Connie Loizos, both confirmed via direct fetch.
**Notes:** Dropped an initially-drafted "second-largest acquisition ever" superlative — multiple secondary aggregators repeated it (citing a ~$20B Groq deal as Nvidia's largest) but every attempt to directly fetch a bylined article making that specific ranking claim (CNBC, CNN, The Hill) returned 403/451, so the draft was softened to "one of the largest acquisitions in Nvidia's history," a claim safely supported by the deal size alone versus Nvidia's well-established Mellanox acquisition (~$7B, 2019) without needing the unconfirmed Groq comparison. The $500M/2023 prior-offer detail was verified as a rejected *investment* proposal (per FT reporting via TechCrunch), not a rejected acquisition bid — the article is careful to describe it as a different deal structure, not an earlier version of the same acquisition attempt.

### 2026-09-04 08:30 UTC — nvidia-nemotron-ultra-cc-outscores-human-ioi-2026
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, Nvidia's own arXiv preprint (`arxiv.org/abs/2609.02849`), authors and NVIDIA affiliation confirmed via direct fetch of the full paper text (`arxiv.org/html/2609.02849`); no trade-press paraphrase used, because none independent of the paper was found.
- Quotes ≤15 words, one per source: pass — paper quoted at exactly 15 words ("the first AI system to outscore the highest-scoring human contestant on an IOI problem set").
- No absence-of-evidence claims: pass — explicitly states no mainstream outlet had covered the claim independently "at the time of writing," rather than asserting its absence as a permanent fact.
- Every citation has a confirmed byline/author: partial — the arXiv paper's authors (Ficek, Narenthiran, Samadi, Majumdar, Ginsburg, all NVIDIA) are named and confirmed via direct fetch, satisfying this for the primary; but this is Nvidia's own team making a claim about Nvidia's own model, with zero independent secondary confirmation found — the only outside discussion located (an automated, non-bylined AI analysis blog, kenashe.ai) was deliberately NOT cited as a source in the published article, since it isn't a human-authored outlet and its inclusion would have overstated the corroboration.
**Notes:** This is the thinnest-sourced piece in this log's history: a single, unreviewed, self-published preprint from the model's own maker, with no mainstream press pickup found despite the "first AI to beat a human at IOI" claim being objectively striking. Published anyway, but with the "first to beat a human" framing explicitly hedged as the authors' own claim throughout, and with a dedicated paragraph in the article itself telling readers this is Nvidia grading its own model — treating the thinness of outside verification as the actual story rather than glossing over it. Independently confirmed this is NOT the same model as "Nemotron-Cascade" (the separate Nvidia line associated with 2025 IMO-adjacent work, per a distinct Hugging Face model card, `huggingface.co/nvidia/Nemotron-Cascade-2-30B-A3B`) and that IOI (International Olympiad in Informatics, a programming contest) is not IMO (International Mathematical Olympiad) — the paper's own acknowledgments section thanks contributors for "insights from IMO" but the paper's actual results are exclusively about IOI/ICPC, confirmed by direct fetch of the full paper text.

### 2026-09-04 08:30 UTC — elon-university-washington-post-ai-companion-survey
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Elon University's own News Bureau post (`elon.edu/u/news/2026/09/02/imagining-the-digital-future-center-reports-on-the-rise-of-ai-companions/`) as primary, direct fetch succeeded twice (once for the topline stats, once specifically to confirm the Lee Rainie "first wave" quote and the exact sampling-methodology sentence); The Washington Post's own piece is cited as corroborating secondary based on its existence, exact headline, and publication date being independently confirmed via a second, directly-fetched Elon University page announcing the Post's coverage, since the Post URL itself returned 403 on direct fetch.
- Quotes ≤15 words, one per source: pass — Rainie quoted at 9 words ("the first wave of insights about these emerging relationships").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Elon University News Bureau (institutional, official); Washington Post is an institutional byline, its specific article confirmed to exist (exact headline "'A friend I can trust': How Americans described their relationship with AI") via Elon's own follow-up post rather than via direct fetch of washingtonpost.com, which was blocked.
**Notes:** The sampling methodology was verified precisely rather than taken from the candidate brief's looser "matched weighted sample of 1,000" phrasing — Elon's own text describes screening 4,268 adults, matching down to 4,031, then drawing a target subsample of 1,000 AI-companion users matched to the population on gender, age, race, and education. The article uses this more precise chain rather than the brief's paraphrase. This follows the precedent set by the 2026-08-23 14:30 UTC billion-users entry for a blocked secondary URL, with one difference worth flagging: there, multiple *other* secondary outlets independently corroborated the blocked primary; here, corroboration for the blocked Washington Post piece comes from the primary's own publisher (Elon), not from a third party — a softer corroboration chain than that precedent, disclosed here rather than glossed over.

### 2026-09-04 08:30 UTC — openai-gpt-6-astra-critical-cybersecurity-launch
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — `openai.com/index/safety-overview-gpt-6-astra/`, `openai.com/index/path-to-astra/`, and `openai.com/index/gpt-6-astra/` all returned 403 on direct fetch, but `deploymentsafety.openai.com/gpt-6-astra` — also an OpenAI-owned domain — fetched successfully and was used as the primary source for all safety/capability-threshold claims; NBC News (byline Jared Perlo) and VentureBeat (byline Carl Franzen) both confirmed via direct fetch as independent corroborating secondaries, satisfying this site's standing rule requiring multiple independent bylined sources when an OpenAI primary URL is bot-blocked.
- Quotes ≤15 words, one per source: pass — OpenAI's own deployment-safety page quoted at 13 words ("can find previously unknown security flaws and develop new ways to exploit them"); Pachocki (via VentureBeat) quoted at 13 words, trimmed from a longer sentence ("we will not accept the degradation in our ability to monitor model alignment").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — OpenAI's own deployment-safety domain (institutional); NBC byline Jared Perlo and VentureBeat byline Carl Franzen, both confirmed via direct fetch.
**Notes:** Explicitly cross-referenced against this site's earlier "openai-astra-solves-ten-decades-old-math-problems" entry (2026-08-23) to avoid conflating the two stories — that piece covered an internal Astra research preview's math proofs; this one is the actual GPT-6 Astra model launch, with the Critical cybersecurity classification as the headline fact. The article's body includes an explicit paragraph distinguishing the two rather than assuming readers will infer it. The rollout order (Daybreak first, then ChatGPT Plus/Pro/Business/Enterprise, then API/AWS/Azure) was independently confirmed across NBC, VentureBeat, and 9to5Google before writing, since the candidate brief's ordering matched but needed direct verification rather than being taken on trust.

### 2026-09-04 08:30 UTC — anthropic-claude-fable-mythos-5-1-launch
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Anthropic's own announcement (`anthropic.com/claude-fable-and-mythos-5-1`) as primary, direct fetch succeeded (used twice: once for the general facts, once specifically to verify the exact false-positive percentages and to check whether the "never trained on enterprise data" quote appears on that page); TechCrunch (byline Russell Brandom, AI Editor, confirmed via direct fetch) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Anthropic quoted at 13 words ("Anthropic has never trained on enterprise data without explicit permission, and never will"), attributed in the article specifically to what "the company told TechCrunch," not to Anthropic's own blog post, since a direct fetch of the Anthropic page confirmed that exact sentence does NOT appear there.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Anthropic's own blog (institutional); TechCrunch byline Russell Brandom, confirmed via direct fetch.
**Notes:** The 60%-fewer-false-positives figure was verified precisely against Anthropic's own page text ("our newest safeguards block 60% fewer false positives than before" for cybersecurity specifically, and "around 60% fewer interventions per session" for Claude Code) rather than taken from the candidate brief or a secondary paraphrase. Caught and corrected a sourcing error before publishing: the "never trained on enterprise data" quote, which the candidate brief implied was from Anthropic's own post, was confirmed via direct fetch to be absent from that page — the article now attributes it specifically to what Anthropic told TechCrunch, not to the company's own blog.

### 2026-09-04 08:30 UTC — google-gemini-3-8-flash-cyber-fairwind-program
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Google DeepMind's own model page (`deepmind.google/models/gemini/flash/`) plus two more Google DeepMind pages fetched directly (`deepmind.google/models/gemini/cyber/` and `deepmind.google/fairwind-program/`) for the Cyber variant and Fairwind Program specifics, and Google's own official pricing page (`ai.google.dev/gemini-api/docs/pricing`) fetched directly for the exact introductory/2027 pricing figures; 9to5Google (byline Abner Li, confirmed via direct fetch) as corroborating secondary.
- Quotes ≤15 words, one per source: n/a — no direct quotes used, paraphrase and figures only, all traced to a directly-fetched primary.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Google DeepMind's own official pages (institutional); 9to5Google byline Abner Li, confirmed via direct fetch.
**Notes:** Caught and corrected a factual error in the candidate brief: it described this as "the third Flash update in six weeks," but a direct fetch of 9to5Google's own reporting (byline Abner Li) gives the verified framing as "the third Flash update in three months," arriving "three weeks after" the prior release — the six-weeks figure could not be confirmed anywhere and was replaced with the verified three-months framing. All pricing and Fairwind Program eligibility details came from Google's own pages directly, per this site's standing rule not to publish unconfirmed pricing/program specifics on secondary-only sourcing.

### 2026-09-04 12:00 UTC — fda-authorizes-vitestro-aletta-robotic-blood-draw
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, the FDA's own official press announcement (`fda.gov/news-events/press-announcements/fda-authorizes-first-its-kind-robotic-blood-draw-device`), fetched directly; a government primary, no trade-press paraphrase needed or used.
- Quotes ≤15 words, one per source: pass — Michelle Tarver (CDRH director) quoted at 12 words, using a bracket-edited fragment ("advanc[es] innovative medical devices that help meet a critical public health need") of a longer sentence in the FDA's release.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — official FDA press release (institutional, .gov domain).
**Notes:** Single-sourced, consistent with this log's precedent for other single official-government-source entries (SB 942, AB 2656, Gemini Robotics ER 2). The one-phlebotomist-to-three-devices supervision ratio and the De Novo pathway/special-controls details were both confirmed directly from the FDA's own release text, not taken from the candidate brief's paraphrase.

### 2026-09-04 12:00 UTC — meta-18-billion-child-safety-settlement-age-verification
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Fortune's own reporting (AP/Barbara Ortutay byline, `fortune.com/2026/09/01/meta-age-checking-ai-scans/`) as the lead source per the candidate brief, direct fetch succeeded; TechCrunch (byline Amanda Silberling, confirmed via direct fetch) as corroborating secondary for the settlement's payment structure specifically.
- Quotes ≤15 words, one per source: n/a — no direct quotes used; paraphrase only, after finding the settlement's dollar-figure breakdown was reported inconsistently across outlets (Fortune said a flat "$18 billion"; a New York AG press release said "$12.1B guaranteed / up to $17.1B"; BleepingComputer said "$12.7B / $5.3B") and choosing not to publish a specific dollar split not confirmed by either of this article's own two listed sources.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Fortune/AP byline Barbara Ortutay; TechCrunch byline Amanda Silberling, both confirmed via direct fetch.
**Notes:** This run independently found and fetched three additional secondary sources (New York AG's own press release, BleepingComputer, TechCrunch) beyond the two candidate-brief leads, specifically because the settlement's exact dollar-amount structure was restated inconsistently across all of them — a live example of the standing rule to verify funding/settlement figures carefully. Rather than pick one inconsistent breakdown to publish as precise, the article uses only the framing independently confirmed by TechCrunch's own reporting (one of this article's two listed sources): "up to $18 billion... roughly 30% contingent on YouTube and TikTok." The 52-attorney-general count (not the candidate brief's "48 states + DC/territories") was verified directly against TechCrunch's and BleepingComputer's own reporting and used instead. Explicit paragraph included distinguishing this from Anthropic's Bartz settlement and the DOJ's NYT filing, per the candidate brief's own conflation warning.

### 2026-09-04 12:00 UTC — doj-statement-of-interest-nyt-openai-fair-use
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites PYMNTS's direct reporting (`pymnts.com/legal/2026/doj-sides-with-openai-against-the-ny-times-in-high-stakes-copyright-case`) as the near-primary lead per the candidate brief, fetched directly; IPWatchdog (byline Eileen McDermott, confirmed via direct fetch) as corroborating secondary. A CourtListener docket search and a direct fetch of the Washington Post's own reporting were both attempted to find a stronger primary than PYMNTS, per the candidate brief's suggestion, but both returned errors (search tool returned no usable docket page; washingtonpost.com 403'd) — PYMNTS and IPWatchdog stand as this article's sourcing.
- Quotes ≤15 words, one per source: pass — DOJ quoted at 14 words ("a strong interest in continuing to develop a robust and competitive artificial intelligence industry"); NYT spokesperson Graham James quoted at 13 words ("undermine the sustainability of the human-created content that a healthy society depends on"), both trimmed from longer sentences captured in the PYMNTS fetch.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: partial — PYMNTS carries only an institutional byline ("By PYMNTS"), not an individual reporter's name, the same softer tier this log has applied to TUN previously; IPWatchdog byline Eileen McDermott is a fully confirmed individual byline, verified via direct fetch.
**Notes:** The NYT spokesperson's name (Graham James) was independently cross-checked against a separate web search beyond the PYMNTS fetch before being published, given how easy a misattributed spokesperson quote would be to get wrong. The article is explicit that this is a *different*, ongoing case from the already-published Bartz v. Anthropic settlement, per the candidate brief's conflation warning — the two are contrasted directly in the body rather than left for the reader to infer.

### 2026-09-04 12:00 UTC — felix-200-million-series-c-whatsapp-remittances
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, Crunchbase News's own reporting (byline Mary Ann Azevedo, `news.crunchbase.com/venture/fintech-whatsapp-remittance-startup-felix-raises-200m-a16z-general-catalyst/`), fetched directly.
- Quotes ≤15 words, one per source: pass — co-founder Manuel Godoy quoted at 12 words ("even getting a small loan was harder than it should have been").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Crunchbase News byline Mary Ann Azevedo, confirmed via direct fetch.
**Notes:** The $87M-equity/$113M-debt split (candidate brief's proposed figures) was independently re-verified against Crunchbase News's own reported numbers rather than assumed correct — confirmed exact match. Company is sometimes referred to elsewhere as "Félix Pago"; Crunchbase News's own article consistently uses "Félix," so the article follows its primary source's naming rather than a secondary variant.

### 2026-09-04 12:00 UTC — lyte-165-million-series-c-robot-perception
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, Crunchbase News's own reporting (byline Mary Ann Azevedo, `news.crunchbase.com/venture/robotics-ai-startup-lyte-seriesc-raise-maverick/`), fetched directly.
- Quotes ≤15 words, one per source: pass — CEO Alexander Shpunt quoted at 14 words ("physical AI will create entirely new categories of robots, and every one of them"), trimmed from a longer sentence.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Crunchbase News byline Mary Ann Azevedo, confirmed via direct fetch.
**Notes:** The $165M/$1.6B valuation figures and the "ex-Apple Face ID team" framing were both independently verified against Crunchbase News's own reporting, which traces the founders' background through PrimeSense (acquired by Apple in 2013) rather than a vaguer "worked at Apple" claim — the article uses that more precise lineage.

### 2026-09-04 12:00 UTC — hiddenlayer-100-million-series-b-agentic-ai-security
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites HiddenLayer's own press release via PR Newswire (`prnewswire.com/news-releases/hiddenlayer-raises-100m-series-b-to-advance-trustworthy-ai-302867783.html`) as primary, direct fetch succeeded; TechCrunch (byline Ram Iyer, confirmed via direct fetch) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Delta-v Capital partner Dan Williams quoted at 14 words from the PR Newswire release ("built a platform from the ground up to secure AI across its full lifecycle"); CEO Chris Sestito quoted at 4 words from TechCrunch's own reporting ("Inference is still inference").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — HiddenLayer's own press release (institutional, official PR Newswire distribution); TechCrunch byline Ram Iyer, confirmed via direct fetch.
**Notes:** Per the candidate brief's own flag, the 10x-ARR-growth and "90% from new customers" figures are stated explicitly in the article as HiddenLayer's own self-reported claim, with no independent auditor cited by either source — not repeated as independently verified fact. The product name "Agent Harness Security" was confirmed verbatim from the PR Newswire release rather than the candidate brief's approximation.

### 2026-09-04 12:00 UTC — canada-responsible-data-centre-development-principles
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, BetaKit's own reporting (byline Alex Riehl, `betakit.com/openai-anthropic-sign-on-to-canadas-new-data-centre-framework-as-public-opinion-sours-on-buildout/`), fetched directly. A search for the Canadian government's own press release (canada.ca/ised-isde.canada.ca) did not surface a fetchable, independently confirmable government page beyond BetaKit's own reporting, so BetaKit stands as the sole source, consistent with this log's precedent for single-source entries.
- Quotes ≤15 words, one per source: pass — AI Minister Evan Solomon quoted at 12 words ("we expect projects to pay the costs they create, protect local resources"), trimmed from a longer sentence.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — BetaKit byline Alex Riehl, confirmed via direct fetch.
**Notes:** The 23-company signatory count and the five-point framework text were both verified directly against BetaKit's own article rather than the candidate brief's paraphrase. The article explicitly frames the accord as voluntary and non-binding rather than implying regulatory force, per this log's standing "no absence-of-evidence claims" discipline applied to enforcement mechanisms specifically.

### 2026-09-04 12:00 UTC — mbzuai-ifm-k2-horizon-open-model-release
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: partial — IFM's own site (`ifm.ai/k2/` and `ifm.ai/k2/press-release/`) returned 403 on every direct-fetch attempt, consistent with the candidate brief's own warning; per the candidate brief's standing rule for bot-blocked primaries, this run instead used multiple independent bylined secondary sources (The National, byline Cody Combs; tbreak, byline Abbas Jaffar Ali; Middle East AI News, byline Carrington Malin — all three confirmed via direct fetch and agreeing on the model count, parameter range, and Apache 2.0 license) plus a direct fetch of Hugging Face's own IFM organization page and the flagship model's own model card as primary-adjacent artifacts.
- Quotes ≤15 words, one per source: n/a — no direct quotes used; the "largest fully open model release" framing is explicitly presented as IFM's own claim/superlative rather than quoted verbatim, since no single confirmed exact wording for that specific phrase was found across the fetched sources (they render it with different exact wording: "one of the largest," "world's largest," "the industry's largest").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — The National byline Cody Combs, tbreak byline Abbas Jaffar Ali, Middle East AI News byline Carrington Malin, all confirmed via direct fetch; Hugging Face model card and org page are institutional/primary artifacts.
**Notes:** A direct fetch of the flagship 375B-A23B model's own Hugging Face card found a real discrepancy worth flagging rather than smoothing over: as of this run, the card describes intermediate checkpoints and training code as still forthcoming rather than already live, even though IFM's own release framing (per secondary reporting) describes the release as already including those artifacts — the article states this gap explicitly instead of repeating the release's framing uncritically. The diffusion-distillation ~3x-speedup claim is attributed specifically to IFM's own characterization (via Middle East AI News's direct reporting), not published as an independently benchmarked fact.

### 2026-09-05 — three-lane research run (90-day catch-up batch)

Three independent research passes ran in parallel today, each assigned a
separate topic lane (research/product; regulation/funding; tools/labor) to
cover the gap since the last published article (2026-09-03). All three were
told to target roughly 9 articles each but to report the honest count
regardless of whether that target was hit. Combined raw yield: 15 drafted
candidates across the three lanes, 8 rejected before or during drafting.
One of the 15 drafted candidates was a duplicate: the research/product lane
and the tools/labor lane both independently found and drafted the same
story (Anthropic's September 1 Enterprise Frontier Safeguards announcement),
under different slugs and with different secondary sources. Rather than
publish the same underlying event twice, the research/product lane's
version (slug `anthropic-enterprise-frontier-safeguards`) was kept and the
tools/labor lane's duplicate draft (which would have used the slug
`anthropic-enterprise-frontier-safeguards-customer-controlled-data`) was
dropped without being published. Net: 14 unique articles published today.

### 2026-09-05 09:15 UTC — anthropic-enterprise-frontier-safeguards
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Anthropic's own announcement (`anthropic.com/news/enterprise-frontier-safeguards`) as primary, direct fetch succeeded twice (general facts, then specifically to pull every named customer quote verbatim); PYMNTS as corroborating secondary, confirmed via direct fetch.
- Quotes ≤15 words, one per source: pass — Wells Fargo CISO Munish Kumar Sharma quoted at 10 words ("our logs stay in a Wells-managed environment under Wells-managed keys"), pulled directly from Anthropic's own page; no quote taken from PYMNTS.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: partial — Anthropic's own blog is institutional and fully confirmed; PYMNTS carries only an institutional byline ("PYMNTS"), not an individual reporter's name, consistent with this log's existing softer tier for institutional bylines (TUN, PYMNTS precedent from 2026-09-04).
**Notes:** A search-engine summary of a separate outlet's coverage of this story surfaced an alleged Dario Amodei quote that reads as garbled — mixing an executive quote with an unrelated customer name in a way that doesn't match how the primary's actual named-customer quotes are structured. A direct fetch of Anthropic's own page, specifically targeting every named-individual quote it contains, did not surface this quote at all. Dropped it entirely rather than publish an unverified/likely-fabricated attribution — same discipline this log applied to the unconfirmed "USB-C" quote in the 2026-08-28 model-hardware-standard entry. Separately: this same underlying story was independently drafted a second time by a different research pass this session under a different slug — see the batch note above. Only this version was published; the duplicate draft was discarded, not merged or silently dropped.

### 2026-09-05 09:15 UTC — meta-muse-spark-1-3-launch
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Meta AI Research's own announcement (`research.meta.ai/blog/introducing-muse-spark-1-3`) as primary, direct fetch succeeded; SiliconANGLE (byline Mike Wheatley) as corroborating secondary, confirmed via direct fetch, refetched a second time specifically to re-verify every Alexandr Wang quote word-for-word.
- Quotes ≤15 words, one per source: pass — Wang quoted at the two-word fragments "competitive" and "better than" (used exactly as quoted in SiliconANGLE) plus a separate 4-word quote ("trillions of tokens per week"); no quote taken from the Meta primary, which contains no named individual quotes at all.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Meta AI Research's own blog (institutional); SiliconANGLE byline Mike Wheatley, confirmed via direct fetch.
**Notes:** An initial fetch of the SiliconANGLE piece returned a paraphrased summary that included a quote attributed to Wang that could not be reproduced on a second, more targeted fetch — appears to have been a summarization artifact, not real article text. Dropped it and used only quotes independently reconfirmed on the second, more careful pass. Meta's own page confirms the ~20%-fewer-tool-calls/~25%-fewer-tokens efficiency figures directly; the Artificial Analysis Intelligence Index score is attributed specifically to SiliconANGLE's own reporting of that independent evaluator, not to Meta's own claims.

### 2026-09-05 09:45 UTC — spacexai-grok-bot-enterprise-launch
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites SpaceXAI's own announcement (`x.ai/news/grok-bot-for-enterprise`) as primary, direct fetch succeeded; Blockchain.News (byline Rongchai Wang) as corroborating secondary for the September 3 enterprise-controls launch specifically; Reworked (byline Siobhan Fagan) as a second secondary, used only for the separate, earlier August 11 beta-launch details, clearly distinguished in the article's own text from the September 3 announcement rather than conflated with it.
- Quotes ≤15 words, one per source: pass — SpaceXAI's own page quoted at 14 words; Reworked quoted at the short fragment "a real blast radius" (5 words); no quote taken from Blockchain.News.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — SpaceXAI's own blog (institutional); Blockchain.News byline Rongchai Wang and Reworked byline Siobhan Fagan, both confirmed via direct fetch.
**Notes:** Verified the xAI/SpaceX merger and "SpaceXAI" rebrand independently before using that name in the article — confirmed via multiple outlets that the merger closed February 2, 2026 and the rebrand was completed July 6, 2026, with the Grok product name explicitly kept unchanged. Pricing figures came from the original August 11 reporting and were not re-confirmed as unchanged by a direct September fetch, so this is flagged as carried over rather than independently re-verified at publish time.

### 2026-09-05 10:10 UTC — google-deepmind-weathernext-3-launch
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Google's own announcement (`blog.google/innovation-and-ai/models-and-research/google-deepmind/introducing-weathernext-3/`) as primary, direct fetch succeeded; TechCrunch (byline Tim Fernholz) as corroborating secondary, refetched a second time specifically to pull exact quote wording.
- Quotes ≤15 words, one per source: pass — Ferran Alet (DeepMind) quoted at 12 words, sourced to TechCrunch; no quote taken from Google's own page, which names no individual spokesperson.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Google's own blog (institutional); TechCrunch byline Tim Fernholz, confirmed via direct fetch.
**Notes:** An initial search-engine fetch returned the wrong DeepMind blog post (a prior, narrower release under a similar-sounding URL). Caught this before drafting and located and fetched the correct, current WeatherNext 3 post directly. The CRPS precipitation-accuracy percentages and the regional-gain claim are both confirmed directly from Google's own page text, not from secondary paraphrase. Flagged explicitly in the article that Google's own performance claims rest partly on an outside evaluator (Brightband) rather than purely self-graded benchmarks.

### 2026-09-05 10:30 UTC — ai-agents-open-ended-research-shadow-evaluation (rejected)
**Verdict:** rejected
**Checks:**
- Primary source over trade-report paraphrase: pass on the primary itself — the underlying preprint (arXiv 2607.27191) was fetched directly and read in full.
- Quotes ≤15 words, one per source: n/a — no draft written, rejected before drafting.
- No absence-of-evidence claims: n/a
- Every citation has a confirmed byline/author: fail — the news hook for covering this now (Nature News) had no confirmable individual byline despite multiple attempts; secondary write-ups found also lacked a confirmed human byline.
**Notes:** Substantively on-theme (a controlled study finding frontier agents can do the engineering of open-ended AI research but get rejected by the original papers' own authors on research judgment and creativity) but sits at the edge of this run's recency window and couldn't clear the confirmed-byline bar on any secondary. Rejected rather than published on the primary alone. Worth revisiting if a bylined outlet picks the paper up later.

### 2026-09-05 10:35 UTC — aalto-machine-learning-superconductor-discovery (rejected)
**Verdict:** rejected
**Notes:** Real research, but published June 17, 2026 — well outside this run's recency guidance. Rejected on recency alone before pursuing full sourcing.

### 2026-09-05 10:35 UTC — alibaba-qwen3-8-max-unveiling (rejected)
**Verdict:** rejected
**Notes:** Qwen3.8-Max was unveiled August 3, 2026 — over a month before this run's date. A more recent frontier-model story (Meta's Muse Spark 1.3) was prioritized instead; not pursued to full source-verification depth.

### 2026-09-05 09:15 UTC — eu-ai-office-first-enforcement-information-requests
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: partial — no dedicated European Commission press release for this specific action could be found; the closest available primary is an on-record, named-speaker statement from Commission VP Henna Virkkunen, relayed via AFP wire and republished by The Star. MLex (Masha Borak, confirmed byline) used as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Virkkunen quoted at 13 words; no quote taken from MLex.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: partial — MLex byline confirmed via direct fetch; the AFP-wire source carries no individual byline, only wire-service attribution, consistent with this log's existing softer tier for institutional/wire sources.
**Notes:** Two dates are in tension and both are disclosed rather than smoothed over: MLex's own byline dates its report ahead of the wider confirmation, while a separate wire bulletin dates the actual sending of the requests to September 1, with Virkkunen's on-record confirmation coming beforehand. The article uses September 1 — the date the requests actually went out — as its date field, and states plainly that the Commission itself declined to name recipients, attributing the OpenAI/Anthropic/Google identification specifically to MLex's reporting rather than to an EU document.

### 2026-09-05 09:15 UTC — stripe-acquires-openrouter-ai-gateway
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Stripe's own newsroom announcement and OpenRouter's own blog post as primary, both fetched directly; TechCrunch (byline Anthony Ha) as corroborating secondary for the $7B+ price, which neither company itself disclosed.
- Quotes ≤15 words, one per source: pass — Collison quoted at 10 words; OpenRouter's own blog quoted at 12 words; no quote taken from TechCrunch.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Stripe and OpenRouter are institutional primary sources; TechCrunch byline Anthony Ha, confirmed via direct fetch.
**Notes:** Deal price is explicitly flagged in the article as reported, not confirmed by either company. The "OpenRouter stays neutral" claim is presented as OpenRouter's own stated promise, with an explicit editorial caveat that it's the kind of promise likely to be tested rather than a settled fact.

### 2026-09-05 09:15 UTC — spacex-closes-60-billion-cursor-acquisition
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Cursor's own blog post as primary, fetched directly; TechCrunch (byline Anthony Ha) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Cursor's own blog quoted at 14 words and a separate 10-word phrase, both attributed to the same primary source; no quote taken from TechCrunch.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Cursor's own blog (institutional primary); TechCrunch byline Anthony Ha, confirmed via direct fetch.
**Notes:** Deliberately dropped two figures that turned up repeatedly in aggregator coverage but couldn't be traced to a bylined source on direct fetch: a "largest venture-backed acquisition on record" superlative and a specific annualized-revenue figure for Cursor. Neither appears in Cursor's own post or in the directly-fetched TechCrunch piece, so neither is in the published article.

### 2026-09-05 09:15 UTC — etched-700-million-series-d-21-billion-valuation
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Etched's own press release distributed via GlobeNewswire (confirmed company-issued) as primary; TechCrunch (byline Julie Bort) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Etched co-founder/CEO Gavin Uberti quoted at 14 words; no quote taken from TechCrunch.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Etched's own press release (institutional primary); TechCrunch byline Julie Bort, confirmed via direct fetch.
**Notes:** The article explicitly names a nuance the press release itself doesn't flag: Jane Street is simultaneously the round's lead investor and, per the same release's own headline, the company's first paying customer — stated plainly as making Jane Street's own account of the chip's performance harder to treat as fully independent, a real structural fact rather than speculation about motive.

### 2026-09-05 09:15 UTC — stability-ai-76-million-series-b-entertainment-partners
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Stability AI's own announcement as primary, fetched directly; TechCrunch (byline Lucas Ropek) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — CEO Prem Akkaruju quoted at 14 words; no quote taken from TechCrunch.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Stability AI's own announcement (institutional primary); TechCrunch byline Lucas Ropek, confirmed via direct fetch.
**Notes:** An earlier draft framing described Universal/Sony/Warner as "the AI company they used to sue" — checked specifically and found false: the active music-industry lyrics lawsuit over AI training is against Anthropic, not Stability AI, and no lawsuit by Universal, Sony, or Warner against Stability AI was found. That framing was dropped entirely before drafting rather than corrected after the fact; the published article instead accurately describes Universal and Warner as prior licensing partners now also holding equity, with Sony joining fresh.

### 2026-09-05 09:15 UTC — nvidia-perplexity-investment-talks (rejected)
**Verdict:** rejected
**Notes:** Only sourcing is a single outlet reporting the two companies are "in talks," with both companies declining to comment — a rumored, unconfirmed negotiation, not a completed or acknowledged round. Revisit only if either company confirms.

### 2026-09-05 09:15 UTC — amazon-ftc-sponsored-ads-lawsuit (rejected)
**Verdict:** rejected
**Notes:** Real, fresh lawsuit (FTC + 22 states v. Amazon, August 31, 2026) but about auction-pricing mechanics and advertiser disclosure, not an AI-specific regulatory question — an "AI pricing" framing appeared only in secondary commentary, not in the FTC's own complaint. Judged out of this run's regulation/policy lane rather than genuinely an AI story stretched to fit it.

### 2026-09-05 16:10 UTC — deepseek-harness-open-source-claude-code-rival
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites DeepSeek's own product page and its official GitHub repository as primary, both confirmed to exist; VentureBeat (byline Carl Franzen) as corroborating secondary for launch-day adoption figures.
- Quotes ≤15 words, one per source: pass — DeepSeek's own stated design principle quoted at 4 words ("Everything is a plugin"); no quote taken from VentureBeat.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — DeepSeek's own official page (institutional); VentureBeat byline Carl Franzen, confirmed via direct fetch.
**Notes:** Multiple lower-tier blogs reported cumulative star counts well above 100,000 within the harness's first week, but none of those specific claims could be traced to a confirmed, bylined outlet — the article explicitly flags the larger totals as "widely repeated... but not independently verified," using only VentureBeat's own directly-fetched launch-day figure as a verified number.

### 2026-09-05 16:10 UTC — github-copilot-can-now-approve-pull-requests
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites GitHub's own official changelog post as primary, direct fetch succeeded; DevOps.com (byline Tom Smith) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Mitch Ashley (The Futurum Group) quoted at 11 words, trimmed from a longer three-sentence quote captured via direct fetch; no quote taken from GitHub's own changelog.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — GitHub's own changelog (institutional); DevOps.com byline Tom Smith, confirmed via direct fetch.
**Notes:** The article explicitly notes the feature is public preview and opt-in, with no real-world approval-accuracy data yet, rather than treating GitHub's launch framing as evidence the feature works well in practice.

### 2026-09-05 16:10 UTC — challenger-gray-ai-job-cuts-fall-fourth-place-august
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — this run downloaded Challenger, Gray & Christmas's own August 2026 PDF report directly and extracted its full text after an initial fetch failed to parse it; Yahoo Finance (byline Claire Boston) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Andy Challenger quoted at 7 words, read directly off the PDF; no quote taken from Yahoo Finance.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Challenger, Gray & Christmas's own report (institutional, official); Yahoo Finance byline Claire Boston, confirmed via direct fetch.
**Notes:** Explicitly flagged Challenger's own category-attribution limitation (a cut a company labels "restructuring" can still be automation-driven underneath) rather than treating the monthly AI-cited-cuts figure as a complete picture of AI's actual layoff impact. Verified directly from the PDF, not secondary paraphrase: the exact totals, month-over-month/year-over-year deltas, and the AI-specific figures.

### 2026-09-05 16:10 UTC — stanford-ai-employment-gap-young-workers-19-percent
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Stanford Digital Economy Lab's own published update as primary, direct fetch succeeded and confirmed named authors, methodology, and exact quoted text directly on the page; Outsource Accelerator (byline Danica Macayan) as corroborating secondary.
- Quotes ≤15 words, one per source: pass — Stanford's own text quoted at 11 words; no quote taken from Outsource Accelerator.
- No absence-of-evidence claims: pass — repeats the researchers' own explicit statement that they do not see broad displacement, rather than asserting an absence of displacement independently.
- Every citation has a confirmed byline/author: pass — Stanford Digital Economy Lab (institutional, named academic authors); Outsource Accelerator byline Danica Macayan, confirmed via direct fetch.
**Notes:** Deliberately distinguished this update's own scope from a related, separately-published earlier piece covering the original ~15% finding from a year earlier — that earlier piece was NOT used as a source for this article since it predates and describes a different data vintage, avoiding the conflation risk of citing older coverage for a newer number.

### 2026-09-05 16:10 UTC — mckinsey-ai-workforce-cuts-fall-short-of-expectations
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: partial — McKinsey's own report page returned repeated server errors and could not be rendered directly by this run; the survey's existence, exact publish date, field dates, and headline figures were confirmed instead through consistent, matching repetition across multiple independent sources, most importantly The Register (byline Brandon Vigliarolo), following this log's own precedent for a bot-blocked primary URL.
- Quotes ≤15 words, one per source: pass — McKinsey's own framing, as quoted by The Register, trimmed to 11 words; no separate quote taken from any other secondary source.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: partial — McKinsey's report is institutional and its existence/figures are corroborated by multiple outlets, but this run never rendered the McKinsey page itself; The Register byline Brandon Vigliarolo is fully confirmed via direct fetch.
**Notes:** This is explicitly a softer-primary-sourcing case, flagged in the article's own body rather than glossed over — the specific figures were cross-checked across multiple aggregator summaries and one fully-bylined outlet, but this run did not find a second fully-named-byline outlet independently reporting the same figures, so it is logged as "partial" rather than "pass" on both checks rather than rounded up.

### 2026-09-09 — catch-up run (four-day gap since last published article)

Last published article was 2026-09-05 16:10 UTC; this run covers the gap to
2026-09-09. Researched a broad set of candidates across research, product,
funding, regulation, and tools; six cleared the Judge-tier pass and ten were
rejected or deprioritized before or during drafting, logged individually
below. The ten rejections are not failures of the pipeline — several were
genuinely newsworthy stories that simply fell outside this run's recency
window or couldn't clear the confirmed-byline bar within the time this run
had, and are flagged as worth revisiting if better sourcing surfaces later.

### 2026-09-09 08:00 UTC — figure-nscale-3-5-billion-vera-rubin-compute-deal
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites Figure's own announcement (`figure.ai/news/figure-and-nscale-sign-strategic-partnership`) as primary, direct fetch succeeded; Interesting Engineering (byline Jijo Malayil) and The Next Web (byline Cristian Dina) as corroborating secondaries, both confirmed via direct fetch.
- Quotes ≤15 words, one per source: pass — Jensen Huang quoted at 11 words from Figure's own primary ("humanoid robots extend physical AI into the world designed for people"); Nscale CEO Josh Payne quoted at 6 words from The Next Web ("physical intelligence is AI's next frontier"); Nvidia's own "robotics flywheel" characterization quoted at 2 words from Interesting Engineering — one quote per source, none exceeding the limit.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Figure's own blog (institutional primary); Interesting Engineering byline Jijo Malayil and The Next Web byline Cristian Dina, both confirmed via direct fetch.
**Notes:** Named the structural conflict plainly rather than treating the deal as three arm's-length parties: Nvidia holds equity in both Figure and Nscale, meaning the GPU manufacturer also has a stake in the customer and the intermediary on the same transaction. Closed on an explicit unresolved question (whether the compute converts into working robots at a cost that justifies the spend) rather than repeating the launch framing uncritically.

### 2026-09-09 08:00 UTC — pytorch-foundation-alibaba-cambricon-ant-group
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — cites the PyTorch Foundation's own announcement (`pytorch.org/blog/alibaba-cloud-ant-group-cambricon-and-huawei-come-together-in-shanghai...`) as primary, direct fetch succeeded and returned the full press release including all named quotes; ChannelE2E/ChannelInsider (byline Eric Mboizi) as corroborating secondary, confirmed via direct fetch.
- Quotes ≤15 words, one per source: pass — Alibaba Cloud CTO Feifei Li quoted at exactly 15 words from the primary; Cambricon's aim quoted at 8 words from ChannelE2E's own phrasing ("reduce friction between PyTorch applications and its hardware") rather than reusing the primary's own Cambricon quote a second time.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — PyTorch Foundation's own blog (institutional, Linux Foundation); ChannelE2E byline Eric Mboizi, confirmed via direct fetch.
**Notes:** An initial WebFetch of a guessed pytorch.org URL 404'd; located the correct URL via search and re-fetched directly before drafting, rather than relying on the search-summary alone. The first draft pulled two quotes from the same single primary source (Feifei Li and Elton Gong, both from the PyTorch Foundation's own release) — caught during review and fixed by sourcing the second quote to the secondary outlet instead, keeping one quote per cited source rather than per named speaker.

### 2026-09-09 08:00 UTC — meta-muse-spark-contributor-pricing-data-trade
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: partial — Meta has not published its own blog post confirming the Contributor pricing tier (and declined to comment when TechCrunch asked), so this run used two independent bylined outlets that separately fetched and reported matching figures: TechCrunch (byline Tim Fernholz) as lead, direct fetch succeeded; Cryptopolitan (byline Randa Moses) as corroborating secondary, direct fetch succeeded and figures matched exactly.
- Quotes ≤15 words, one per source: pass — Meta's own pricing documentation, quoted via TechCrunch, trimmed to 12 words; Cryptopolitan's own "75x reduction" framing of the cached-token price cut quoted at 3 words — one quote per source.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — TechCrunch byline Tim Fernholz and Cryptopolitan byline Randa Moses, both confirmed via direct fetch.
**Notes:** Flagged as "partial" on primary sourcing rather than "pass" since neither source is Meta's own blog — this is the same class of case as prior single-company-declined-to-comment stories in this log, resolved the same way, with two independently fetched bylined outlets whose specific dollar figures agree exactly rather than one outlet repeating the other.

### 2026-09-09 08:00 UTC — florida-ag-ai-chatbot-criminal-liability-proposal
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: partial — no dedicated Attorney General press release could be located (myfloridalegal.com's press-release index and a direct Florida Politics fetch both failed to load); this run instead used two independent, confirmed-bylined outlets that covered Uthmeier's on-record Tampa press conference directly: FOX 13 Tampa Bay (byline Joe Espy) and WCTV (byline Matt Hoffmann), both confirmed via direct fetch, with matching quotes and figures.
- Quotes ≤15 words, one per source: pass — Uthmeier quoted at 11 words via FOX 13 ("design, they control, and they significantly profit from these AI chatbots"); quoted at 9 words via WCTV ("will judge them by their words and their actions") — one quote per source, an earlier draft that used two quotes from each of the two sources was trimmed down before publishing.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — FOX 13 byline Joe Espy and WCTV byline Matt Hoffmann, both confirmed via direct fetch.
**Notes:** Explicit in the article's own text that no bill has been drafted and nothing is enacted — this is a state AG's public proposal, not a passed law, and the piece is careful not to imply otherwise. Both cited outlets independently confirm the same direct quotes and case details (FSU shooting, USF killings), which is why this run treated two press-conference writeups as adequate sourcing despite the absence of a formal press release document.

### 2026-09-09 08:00 UTC — sapien-180-million-valuation-ai-cfo-analysis
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — single source, Fortune's own exclusive reporting (byline Sheryl Estrada, `fortune.com/2026/09/08/exclusive-ai-startup-sapien-raises-180m-valuation...`), direct fetch succeeded, consistent with this log's precedent for single fully-bylined-outlet funding stories (Félix, Lyte, 2026-09-04 entries).
- Quotes ≤15 words, one per source: pass — customer quote (Carlex VP of Finance Jason Waltz) trimmed to 7 words ("would have probably taken us two weeks"); an earlier draft used a second, longer quote from the same single source and was cut to keep to one quote total on a single-sourced piece.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Fortune byline Sheryl Estrada, confirmed via direct fetch.
**Notes:** The $12 million error-finding claim and the "20 minutes vs. two weeks" comparison are both explicitly attributed in the article to the customer via Fortune's reporting, with an explicit caveat that this is unaudited vendor-favorable evidence, not an independently verified benchmark — flagged rather than repeated as settled fact.

### 2026-09-09 08:00 UTC — openai-automated-research-intern-milestone
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: partial — `openai.com/index/research-acceleration-view-inside-openai/` returned 403 on direct fetch, the same bot-block pattern this log has flagged repeatedly for openai.com; used two independent bylined secondaries instead: Engadget (byline Jackson Chen, confirmed as a real contributing reporter via a separate search of his author page and outside bylines) and Fortune (byline Jeremy Kahn, Fortune's AI editor), both confirmed via direct fetch with matching figures.
- Quotes ≤15 words, one per source: pass — OpenAI's own post quoted at 12 words via Engadget ("a system that can carry out well-defined research tasks under human direction"); chief scientist Jakub Pachocki quoted at 11 words via Fortune ("risks associated with AI are unfortunately going to grow from here").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Engadget byline Jackson Chen and Fortune byline Jeremy Kahn, both confirmed via direct fetch/search.
**Notes:** A first draft used Unite.AI as the second source; this run separately checked the byline ("Jonas Reeve") and found Unite.AI's own author page discloses that byline as an AI-generated persona reviewed by editorial staff, not a human reporter. Dropped it entirely rather than publish on an unconfirmed-human byline, and replaced it with Fortune's independent reporting on the same OpenAI post, which happened to carry a substantively different and newsworthy angle (chief scientist Jakub Pachocki's own safety warning in the same announcement) rather than just re-confirming the same figures. This is the kind of byline check this log's standing rule exists for, caught before publishing rather than after.

### 2026-09-09 08:00 UTC — meta-hatch-consumer-ai-agent (rejected)
**Verdict:** rejected
**Notes:** Every source found describes Hatch as still forthcoming as of this run — "weeks from launch," "targeting release late August or September" — with no company confirmation that it has actually shipped. Rejected on unverifiable launch status rather than pursued as a rumor. Revisit once Meta's own channels confirm an actual release.

### 2026-09-09 08:00 UTC — baidu-xiaodu-ai-day-dazi-home-agents (rejected)
**Verdict:** rejected
**Notes:** Real event, real date (September 8, 2026, Beijing), and Baidu's own Li Ying was quoted describing the pitch — but the fullest writeup of the actual product lineup found by this run bylines its author only as "The Analyst," a pseudonym, not a confirmed individual. No other outlet with a confirmed byline covering the specific device lineup and Dazi integration was found in the time this run had. Rejected on the confirmed-byline check specifically, not on newsworthiness — worth revisiting if a bylined outlet (TechNode, SCMP, etc.) publishes a post-event recap.

### 2026-09-09 08:00 UTC — eu-ai-office-september-compliance-inspections (rejected)
**Verdict:** rejected
**Notes:** A secondary aggregator (Cubbbix) claims the European AI Office began a first wave of compliance inspections in September, but this run could not find a European Commission press release or any bylined outlet independently confirming that specific claim — the closest confirmable primary is the August 2 enforcement-start milestone, which is older ground already implicitly covered by this log's prior EU AI Act entries. Rejected rather than publish on an uncorroborated secondary-aggregator claim.

### 2026-09-09 08:00 UTC — anthropic-public-s1-ipo-prospectus (rejected)
**Verdict:** rejected
**Notes:** Anthropic's public S-1 prospectus has not actually been filed as of this run — every source describes it as still expected "by end of September," following the confidential June 1 filing already on the record. There is no new dated document or event to report; revisit once the public filing actually happens.

### 2026-09-09 08:00 UTC — fda-tempo-pilot-behavioral-health-additions (rejected)
**Verdict:** rejected
**Notes:** The actual selection of Limbic and SonderMind into the TEMPO pilot dates to August 24, 2026 (MedTech Dive, byline Elise Reuter, confirmed via direct fetch) — over two weeks before this run. A September 3 STAT News piece revisits the same underlying event without new news, and is paywalled with no FDA quotes obtainable directly. Rejected on recency, consistent with this log's treatment of other stale-but-still-circulating stories.

### 2026-09-09 08:00 UTC — mistral-shieldstral-safety-classifier (rejected)
**Verdict:** rejected
**Notes:** Shieldstral shipped August 4, 2026 — over a month before this run's date, outside this pipeline's recency window. Substantively interesting (a 3B policy-adaptive multimodal safety classifier matching models 7x its size) but too old to cover as current news.

### 2026-09-09 08:00 UTC — qwen3-8-max-open-weights-release (rejected)
**Verdict:** rejected
**Notes:** The open-weights checkpoint landed on Hugging Face August 12-14, 2026. The model's initial API unveiling (August 3) was already logged rejected in this file on 2026-09-05 for being over a month old; the weights release is the same underlying story further along, not new news as of this run.

### 2026-09-09 08:00 UTC — legora-550-million-series-d (rejected)
**Verdict:** rejected
**Notes:** A funding-roundup search surfaced this as if current, but the round actually closed and was reported on March 10, 2026 — six months before this run. Not September news at all; caught before drafting.

### 2026-09-09 08:00 UTC — general-intuition-320-million-series-a (rejected)
**Verdict:** rejected
**Notes:** Round closed and was reported June 25, 2026, over two months before this run — outside the recency window. Caught before drafting.

### 2026-09-09 08:00 UTC — pixxel-100-million-series-c (rejected)
**Verdict:** rejected
**Notes:** Genuinely recent (September 7, 2026) and well-covered, but deprioritized rather than pursued to full verification: Pixxel is primarily a hyperspectral-satellite/Earth-observation hardware company, a weaker fit for this pipeline's AI-news lane than this run's other candidates, and a direct Crunchbase News URL guess 404'd without time in this run to track down the correct one. Not rejected on a failed check — deprioritized for a stronger use of this run's remaining time.

### 2026-09-11 00:00 UTC — cognition-2-billion-series-e-48-billion-valuation
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — TechCrunch's own reporting (byline Marina Temkin), not an aggregator repeating the news.
- Quotes ≤15 words, one per source: n/a — no direct executive quote available in the source; article reports figures/facts only, no quotation used.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Marina Temkin, confirmed via her live TechCrunch author page (VC/startups reporter, ex-PitchBook/Venture Capital Journal/Mergermarket, CFA charterholder).
**Notes:** A duplicate of this same story was independently surfaced by a second research pass via SiliconANGLE (byline Duncan Riley) — used TechCrunch instead as the stronger, earlier primary report. Only one article published for this event, not two.

### 2026-09-11 00:00 UTC — harvey-550-million-round-15-5-billion-valuation
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — TechCrunch's own reporting (byline Julie Bort).
- Quotes ≤15 words, one per source: n/a — no direct executive quote available in the source; figures/facts only.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Julie Bort, confirmed via her TechCrunch author page (Startups/Venture desk editor, formerly Business Insider/IDG).
**Notes:** None.

### 2026-09-11 00:00 UTC — harvey-acquires-guardrails-ai
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — Harvey's own company blog, the acknowledged primary source for its own acquisition.
- Quotes ≤15 words, one per source: pass — CEO Winston Weinberg quoted at 7 words ("how do you know what it will do?"); Guardrails CEO Shreya Rajpal quoted at 9 words ("the hard part of shipping AI isn't building the system").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: n/a — company blog, self-attributed to Harvey as the primary source for its own announcement.
**Notes:** A unite.ai writeup of this same story was found and discarded — bylined "Evan Mercer, AI Research Agent," a disclosed AI-generated persona, not a human reporter. Went to Harvey's own blog instead for the named-executive quotes. This article carries two quotes (one per named executive) from the single company-blog source — a deliberate exception to the one-quote convention since both are the company's own on-record statements, not a secondary outlet's reporting.

### 2026-09-11 00:00 UTC — inception-labs-mercury-2-5-diffusion-llm
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — Inception Labs' own company blog announcement.
- Quotes ≤15 words, one per source: pass — customer quote (OpenCall's Oliver Silverstein) at 12 words ("our P99 response time dropped from several minutes to just one second").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: n/a — company blog, named spokespeople (CEO Stefano Ermon, customer quote attributed to a named individual at OpenCall).
**Notes:** CEO quote ("our most capable production model yet") used in indirect/reported form rather than as a second direct quotation, to stay within one direct quote for this single-source article.

### 2026-09-11 00:00 UTC — salesforce-trusted-enterprise-ai-harness
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — Salesforce's own newsroom announcement, corroborated by VentureBeat's independent reporting on the underlying survey data.
- Quotes ≤15 words, one per source: pass — Google Cloud CEO Thomas Kurian quoted at 9 words via Salesforce's release; Rocket Mortgage CTO Shawn Malhotra quoted at 11 words ("we don't want to bet our future on one closed stack").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — VentureBeat byline Carl Franzen, confirmed via his VentureBeat author page and Muck Rack profile (Executive Editor, 16+ years in tech journalism).
**Notes:** None.

### 2026-09-11 00:00 UTC — california-sb813-ab1405-ai-auditor-registry
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — California Governor's Office official release, direct-fetched.
- Quotes ≤15 words, one per source: pass — Asm. Bauer-Kahan quoted at 12 words ("essential to ensuring AI is safe for our communities and critical infrastructure").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: n/a — official government press release, no individual reporter byline; primary-source government statement.
**Notes:** Drafted quote initially ran 16 words and was trimmed to 12 to clear the length check before publishing.

### 2026-09-11 00:00 UTC — california-adams-law-chatbot-liability
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — California Governor's Office official release, direct-fetched.
- Quotes ≤15 words, one per source: pass — Gov. Newsom quoted at 10 words ("innovation comes with responsibility and protecting our children comes first").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: n/a — official government press release.
**Notes:** Sensitive subject matter (a named minor's death); stuck strictly to the Governor's Office's own official framing and did not speculate beyond what the release states.

### 2026-09-11 00:00 UTC — uk-medical-ai-regulation-blueprint
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — GOV.UK official release, direct-fetched; cross-referenced against STAT News (byline Andrew Joseph, STAT's Europe Correspondent, confirmed as a long-standing named reporter) for corroboration, not as the primary claim source.
- Quotes ≤15 words, one per source: pass — Prof. Alastair Denniston quoted at 11 words ("a future healthcare system that is increasingly tech-enabled and always people-centred").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass (secondary source) / n/a (primary is official government release).
**Notes:** None.

### 2026-09-11 00:00 UTC — anthropic-researcher-resigns-ai-extinction-risk-warning
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — TIME's own original reporting (byline Harry Booth), not a secondary aggregation of another outlet's story.
- Quotes ≤15 words, one per source: pass — Evan Hubinger quoted at 10 words ("we really do earnestly believe AI could kill all humans"). Jacob Coxon's statements reported in indirect/attributed form rather than as a second direct quotation, to stay within one direct quote for this single-source article — an earlier draft used three separate quoted fragments from Coxon plus Hubinger's, all from the same TIME piece, and was rewritten down to one.
- No absence-of-evidence claims: pass — the article states plainly that Anthropic and OpenAI did not respond to TIME's request for comment before publication; this is reported as a factual non-response, not treated as evidence for or against the underlying risk claim either way.
- Every citation has a confirmed byline/author: pass — Harry Booth, TIME's London-based AI reporter (joined via the Tarbell Fellowship, 2024), confirmed via his TIME author page, LinkedIn, and Muck Rack profile.
**Notes:** Highest-stakes candidate in this batch (a named individual's resignation and a named current Anthropic employee's public risk estimate) — independently re-fetched and re-verified the TIME article directly before drafting, rather than relying solely on the research pass's summary. All quotes checked against the source's exact wording.

### 2026-09-11 00:00 UTC — anthropic-threat-intelligence-report-september-2026
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — Anthropic's own published report, direct-fetched and figures independently confirmed against the primary document rather than taken from the research pass's summary alone.
- Quotes ≤15 words, one per source: pass — Anthropic's own framing quoted at 11 words ("everything connected to the internet is a potential target for exploitation").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: n/a — company research publication, not an individually bylined news article.
**Notes:** Independently re-fetched Anthropic's own report to confirm all cited figures (record counts, APK/token counts, article counts) before drafting, given the size of the numbers involved.

### 2026-09-11 00:00 UTC — openai-navier-stokes-proof-priority-dispute
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — Quanta Magazine's own original reporting (byline Konstantin Kakaes, longtime Quanta contributing writer and former math editor).
- Quotes ≤15 words, one per source: pass — Tristan Buckmaster quoted at 12 words ("can only be described as AI slop. I am sorry for this."). An earlier draft used three separate quoted fragments (two from Buckmaster, one from Diego Córdoba) from this same single source and was rewritten down to one direct quote, with the rest reported indirectly.
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — Konstantin Kakaes, confirmed via his Quanta author page, Muck Rack profile, and personal site.
**Notes:** Independently re-fetched the Quanta article directly (rather than relying solely on the research pass's summary) given the sensitivity of a named-individual priority/credit dispute. Careful to state plainly that OpenAI's Navier-Stokes result and the Buckmaster/Alpöge Euler result are different problems, per OpenAI's own conceded framing, rather than implying one team scooped the other on the same result.

### 2026-09-11 00:00 UTC — accenture-google-cloud-gemini-enterprise-business-group
**Verdict:** published
**Checks:**
- Primary source over trade-report paraphrase: pass — Accenture's own newsroom release, corroborated by IT Pro's independent reporting.
- Quotes ≤15 words, one per source: pass — Google Cloud CEO Thomas Kurian quoted at 6 words ("a top priority for enterprises today").
- No absence-of-evidence claims: pass
- Every citation has a confirmed byline/author: pass — IT Pro byline Ross Kelly, confirmed via his author page (muckrack.com/ross-kelly-6) as IT Pro's News and Analysis Editor.
**Notes:** A unite.ai writeup of this same story was found and discarded — bylined "Aiden Cross, AI Product Strategy & Execution, AI Research Agent," a disclosed AI-generated persona, not a human reporter.
