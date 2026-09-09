---
title: 'RAG failure modes: a debugging field guide'
description: >-
  A mechanics-first field guide to why retrieval-augmented generation systems
  give wrong or fabricated answers even when the right document is already in
  the index, and how to tell which pipeline stage broke.
kicker: Guide · debugging
lead: >-
  The most disorienting bug in a retrieval-augmented generation system is the
  one where you confirm — by hand, with a text search — that the answer is
  sitting right there in the indexed document, and the system still gets it
  wrong. Nothing crashed. No error was thrown. The pipeline ran end to end and
  produced a confident, fluent, wrong answer. This guide is about the handful of
  distinct places that failure actually happens, why each one produces symptoms
  that look similar from the outside, and how to tell them apart before you
  start changing things.
wide: true
group: systems-engineering
tileMeta: >-
  A debugging field guide — retrieval failure, lost-in-the-middle, reranking,
  chunking
---
Before any of that, it's worth being precise about what "RAG" actually does mechanically, because every failure mode below is a failure of one specific mechanical step. A retriever turns a query into an embedding vector, compares it against a store of precomputed document vectors using a similarity function — almost always cosine similarity, sometimes dot product on normalized vectors, which is equivalent — and returns the top-k closest chunks. Those chunks get concatenated into a prompt alongside the user's question and handed to a language model, which generates an answer conditioned on everything in that context window. Every step in that sentence is a place a wrong answer can originate: the embedding, the similarity search, the chunk boundaries, the concatenation order, and the model's attention over the assembled context. A wrong answer tells you almost nothing about which step failed until you go look.

## 1\. Retrieval failure: the right chunk never comes back

This is the most common failure and the easiest to mistake for a generation problem, because the symptom — a wrong or "I don't know" answer — looks identical to what happens downstream. The distinguishing test is simple: pull the top-k chunks the retriever actually returned for the query and read them yourself. If the chunk containing the real answer isn't in that list at all, generation never had a chance. The model can't attend to, rerank, or reason over a document it was never shown.

The underlying cause is almost always a mismatch between how the embedding model represents the query and how it represents the source text, and that mismatch has a few recurring shapes. The first is a general-purpose embedding model applied to a specialized domain. Off-the-shelf embedding models are trained on broad, mostly-general text, and their vector space encodes the associations that show up in that training distribution. Point one at a codebase, a pharmacology corpus, or an internal contracts library, and terms that are near-synonyms in general English — or that mean something domain-specific — collapse together or scatter in ways that don't track the domain's actual semantics. "Charge" in a general embedding space sits near "cost" and "fee"; in a physics corpus it needs to sit near "electron" and "field," and a model that was never shown that corpus has no reason to know that.

The second shape is the one the phrase "lost in translation" is getting at: the query and the document phrase the same fact in genuinely different registers. A user asks "why does my invoice keep failing," and the document that answers it is titled "Handling declined payment retries" and never uses the word "invoice" at all. Cosine similarity is measuring how close two vectors point in a high-dimensional space, and that closeness is a learned approximation of semantic relatedness — it is not a guarantee that a question and its answer will land near each other just because a human reading both would immediately see the connection. Question-shaped text and answer-shaped text are stylistically different even when embedding models are trained to bridge that gap (asymmetric or instruction-tuned embedding models exist specifically because of this asymmetry), and a model that wasn't built or fine-tuned with that gap in mind will retrieve on lexical and topical overlap more than on the actual question-answer relationship.

The third shape is structural rather than semantic: the answer exists in the corpus, but no single chunk contains it, because chunk boundaries split it across two adjacent chunks. A procedure with five numbered steps gets cut at a fixed character or token boundary that falls between step 3 and step 4; the query matches step 3's chunk well enough to retrieve it, and the retrieved chunk gives an answer that is confidently incomplete rather than wrong — it just stops. This one is worth calling out separately from a pure embedding mismatch because the fix is different: better embeddings won't help if the boundary itself is the problem, and it's the reason chunking strategy (section 4) is really part of the same failure surface as retrieval, not a separate concern.

> **How to check:** log the raw top-k chunks and their similarity scores for the failing query, independent of the generated answer.
>
> If the answer-bearing chunk is absent from that list, this is a retrieval failure — stop debugging the generation step, you're looking in the wrong place. If it's present but low-ranked, that's a reranking problem (section 3), a different fix entirely.

A useful habit once you suspect this failure mode: rewrite the failing query using the document's own vocabulary instead of the user's, and rerun retrieval. If the answer-bearing chunk suddenly appears near the top, you've confirmed a vocabulary mismatch rather than a genuine embedding-space problem, and the fix is closer to query rewriting or synonym expansion than to swapping models. If it still doesn't appear, the embedding model itself may not be encoding the domain's semantics well, which points toward a domain-adapted or fine-tuned embedding model, or a hybrid approach that adds lexical (BM25-style keyword) retrieval alongside the dense vector search so an exact term match can surface a chunk that semantic similarity alone missed.

## 2\. Lost in the middle: retrieved correctly, attended to poorly

This failure mode is the one that most confuses people the first time they hit it, because every piece of evidence you'd normally check looks fine. You log the retrieved chunks: the right one is there. You check its similarity score: it's high, sometimes the highest. You read the final prompt sent to the model: the correct chunk is unambiguously present in the text. And the model still gives a wrong answer, or ignores the chunk in favor of a worse one. What's failing here isn't retrieval — it's the model's attention over a long, multi-chunk context.

The mechanical reason is well-documented behavior in transformer-based language models: performance on "find the fact and use it" tasks is measurably more reliable when the relevant information sits at the very start or the very end of the context window than when it's buried in the middle, even though the model's attention mechanism is, in principle, capable of attending to any position equally. In practice it doesn't, largely because of how these models are trained and because of positional-encoding effects that make the earliest and most recent tokens systematically easier for the model to weight heavily. Picture a U-shaped reliability curve across the context window — high at both ends, sagging in the middle — and you have the intuition for why concatenating ten retrieved chunks in similarity-score order can bury the single best one at position five or six, right in the trough.

This is easy to conflate with a chunking or reranking problem because the practical fix overlaps with both, but the diagnostic signature is distinct: the correct chunk is present, correctly ranked by the retriever relative to the ground truth, and still gets outweighed by chunks around it purely because of where it landed in the assembled prompt. You can confirm this directly with a targeted test — take a query that's already failing, manually move the correct chunk to the first or last position in the context (leaving every other chunk where it was), and rerun generation with nothing else changed. If the answer flips from wrong to right purely from a reordering with no new information added, you've isolated a position-in-context problem, not a retrieval or reranking one.

```
Baseline prompt (chunk order = raw similarity rank):
[chunk 3, chunk 1, chunk 7, chunk 2 (the answer), chunk 5]  -> wrong answer

Same five chunks, answer chunk moved to the edge:
[chunk 2 (the answer), chunk 3, chunk 1, chunk 7, chunk 5]  -> correct answer

Same set of chunks, same model, same query. The only variable that changed
is position. That's the signature of a lost-in-the-middle failure, not a
retrieval failure.
```

The practical mitigations follow directly from the mechanism rather than from any specific vendor's recommendation. First, don't order retrieved chunks by raw similarity score and hand them to the model in that order by default — deliberately place the highest-confidence chunk (from your reranker, see section 3) at the start or end of the context rather than wherever it happened to fall in the similarity ranking. Second, reduce k — the number of chunks retrieved — closer to what the question actually needs; every additional low-value chunk you include isn't neutral, it's more material competing for attention and it pushes everything else further toward the middle of a longer window. Third, treat "the context window is long enough to fit everything" as a capacity fact, not a reliability guarantee — a model can accept a hundred thousand tokens of context and still attend to the middle of it worse than the ends. Fitting the answer in the window is necessary but not sufficient.

## 3\. Reranking: why top-k by cosine similarity isn't the final answer

First-pass retrieval — embed the query, compare against every document vector, take the top-k by cosine similarity — is fast because it's built for scale: an approximate nearest- neighbor index can search millions of vectors in milliseconds precisely because it's doing one cheap, uniform comparison (a dot product on fixed-length vectors) repeated many times, with no per-pair reasoning about the actual content. That speed comes from a real simplification: the query and each candidate document are embedded independently, with no interaction between them at scoring time. The similarity score is a comparison of two vectors that were each computed without knowledge of the other.

A reranker relaxes that simplification on purpose. Instead of comparing two independently computed vectors, a cross-encoder reranker takes the query and a candidate chunk together, as a single input, and lets the model attend across both jointly to produce a relevance score for that specific pair. That joint attention is what a bi-encoder embedding comparison structurally cannot do — it can pick up on relationships between the query and the passage that only become visible when the model reads them side by side, like a passage that answers the literal question asked but is phrased in a way that pulls it toward an unrelated topic in embedding space, or two passages that are superficially similar in embedding space but only one of which actually resolves the query's intent. The cost is real: a cross-encoder pass over even fifty candidates is far more expensive, per candidate, than the single query-vector comparison that first-pass retrieval does over an entire index. That asymmetry — cheap and approximate at index scale, expensive and precise at short-list scale — is exactly why reranking is a second pass over a small candidate set rather than a replacement for the first pass over the whole corpus.

The failure mode reranking exists to fix is specific and diagnosable: retrieval returns the correct chunk, but not near the top of the top-k list, and it either gets truncated before the model ever sees it (if k is small) or survives into the context but lands in the lost-in-the-middle trough described in section 2 (if k is larger). You can confirm this is what's happening by checking the correct chunk's rank position in the raw first-pass results — if it shows up at, say, position eight out of a top-ten retrieval, and the pipeline only sends the top three to the model, that's a top-k cutoff on an under-ranked chunk, and the fix is a reranking pass that re-scores those ten candidates and promotes the genuinely relevant one before truncation happens, not a change to the embedding model or an increase in k that just adds more noise.

> **Where reranking doesn't help:** if the correct chunk isn't in the first-pass candidate set at all, a reranker has nothing to rerank. Reranking is a fix for "found but under-ranked," not for "never found" — don't reach for a reranker to solve what's actually a retrieval failure per section 1.

A practical two-stage pattern follows from this directly: retrieve a wider first-pass set than you intend to actually use — enough to give a reranker room to find the right answer even if first-pass similarity under-ranked it — then rerank that wider set down to the small number of chunks you actually put in the prompt, ordered so the top-ranked result lands at a favorable context position rather than in the middle. Retrieving wide and reranking narrow costs more per query than a single similarity search, but it's a targeted cost applied only to the handful of candidates that made the first cut, not to the whole index — which is why it's viable even though a cross-encoder pass over the entire corpus would not be.

## 4\. Chunking strategy: the tradeoff you can't fully escape

Chunk size sits underneath every failure mode already described, because it determines what a "chunk" even is before retrieval, reranking, or generation get involved. There is no chunk size that avoids the tradeoff entirely — the two failure directions are genuinely in tension, not solvable by finding the one correct number.

Chunks that are too small lose context and split coherent ideas across boundaries, which is the structural retrieval failure described in section 1: a procedure, a caveat, or a qualifying clause that belongs with the sentence before or after it gets cut off from that sentence, and the resulting chunk reads as complete when it isn't. A chunk containing only "set the timeout to 30 seconds" without the surrounding sentence that says "...unless running in the EU region, where it must be 10 seconds" is retrieved successfully, scores well against a query about timeouts, and hands the model a fact that's wrong in exactly the cases where the qualification mattered. The chunk isn't false — it's decontextualized, and decontextualization is functionally indistinguishable from being wrong once it's sitting alone in a prompt.

Chunks that are too large have the opposite problem: they dilute the relevance signal that similarity search depends on. An embedding vector for a long chunk is, roughly, a composite representation of everything in that chunk — if a five-paragraph section contains one sentence that directly answers a niche query and four paragraphs of loosely related surrounding material, the chunk's embedding reflects the whole mixture, not just the relevant sentence, and its similarity score to the query gets pulled down by the paragraphs that don't match. A smaller, more focused chunk containing just the relevant sentence would often score higher for the exact query it answers, precisely because there's nothing else in the vector to dilute it. Oversized chunks also waste context-window budget once retrieved — every irrelevant paragraph inside a large "relevant" chunk is competing for the model's attention against genuinely relevant content elsewhere in the prompt, which compounds directly with the lost-in-the-middle effect from section 2.

Fixed-size chunking — split every N tokens or characters, with or without overlap — is cheap to implement and works reasonably well on prose that doesn't have strong internal structure, but it's chunking by an arbitrary count rather than by where the document's own ideas actually begin and end, and it will cut through headings, list items, code blocks, and table rows without any awareness that it's doing so. Overlap between consecutive chunks (repeating the last sentence or two of one chunk at the start of the next) is a partial mitigation for the split-idea problem, not a fix for it — it reduces how often a boundary falls exactly on the critical sentence, but it doesn't reason about where the actual idea boundaries are, and it increases index size and retrieval noise since near-duplicate content now occupies two chunks instead of one.

Structure-aware chunking — splitting on headings, section boundaries, paragraph breaks, or (for code and structured documents) on syntactic units — costs more to implement because it requires actually parsing the document's structure instead of just counting characters, but it aligns chunk boundaries with the boundaries the document's author already chose when they decided where one heading ends and another begins. A document that already organizes itself into "Prerequisites," "Setup," and "Troubleshooting" sections is handing you chunk boundaries for free — splitting by fixed character count instead throws that structure away and reintroduces the exact boundary problem the document's own formatting had already solved. The decision of when to invest in structure-aware chunking versus fixed-size chunking should track how much real structure the source documents actually have: a corpus of well-formatted technical documentation, API references, or contracts has structure worth preserving; a corpus of unstructured chat logs or free-text notes may not, and fixed-size chunking with reasonable overlap is a defensible default there.

```
# Fixed-size (structure-blind) — fast, but boundaries are arbitrary
chunks = split_every_n_tokens(document, n=512, overlap=64)

# Structure-aware — slower to build, boundaries follow the document's own shape
sections = split_on_headings(document)
chunks = [split_on_paragraph_boundaries(s, max_tokens=512) for s in sections]
# each chunk still carries its parent heading as metadata, so a chunk
# retrieved on its own doesn't lose the section context that gave it meaning
```

One detail worth building in regardless of chunking strategy: attach the parent heading or section title to each chunk as metadata, and include it when the chunk is inserted into the prompt. A chunk that says "set this value to 10 seconds" is ambiguous on its own; the same chunk prefixed with "Timeout configuration — EU region" carries the context that would otherwise require a larger chunk size to preserve. This is a cheap way to get some of the benefit of larger chunks — surrounding context — without actually diluting the embedding with more retrieval-noise content, since the heading is much shorter than the paragraphs that would otherwise be needed to convey the same context.

## 5\. The model ignoring retrieved context entirely

The four failure modes above all assume the model is at least trying to use what it was given. The fifth failure mode is different in kind: the retrieval pipeline works correctly — the right chunk is retrieved, ranked well, and sitting in a favorable position in the prompt — and the model answers from its own pretrained knowledge anyway, as if the retrieved context weren't there. This is the hardest of the six failure modes to notice, because when the model's parametric memory happens to agree with the retrieved document, the answer is correct and nobody looks any closer. The failure only becomes visible when parametric memory and retrieved context disagree — and by construction, that's exactly the situation RAG was built to handle correctly (a private, updated, or non-public fact the base model was never trained on), which makes this failure mode more consequential than its low visibility would suggest.

The underlying cause is that nothing about the RAG architecture actually forces the model to ground its answer in the provided context — a language model generates its most probable next tokens given everything in its prompt plus everything it learned during pretraining, and retrieved context is additional conditioning information, not a hard constraint the decoding process is required to obey. If the model's pretrained association for a query is strong — a widely-discussed fact, a common default value, a well-known API behavior — that association can outweigh a retrieved passage that says something different for this specific case, especially if the retrieved passage is phrased less directly than the question, or if the pretrained association is simply more strongly represented across the model's training data than a single contradicting document can offset within one prompt.

This shows up in three recognizable patterns. The most benign is correct by luck: the parametric answer and the retrieved-document answer happen to agree, so the failure is invisible even though the model never actually used the context. The second is stale: a model trained before an internal policy, price, or configuration changed answers with the old value even when the retrieved chunk contains the current one, because the old value was reinforced across far more of its training data than a single updated document can compete with. The third is outright wrong on a fact that only exists inside the private or specialized corpus the RAG system was built to serve — a model with no training exposure to an internal system will sometimes still generate a plausible-sounding, entirely fabricated answer about it, drawing on surface patterns from similar-looking systems it does have training data about, rather than either using the retrieved chunk or admitting it doesn't know.

> **How to test for it directly:** construct a query where you know the retrieved-context answer and the model's likely parametric answer diverge, then check which one comes back.
>
> Take a fact the base model plausibly learned during pretraining — a well-known default, a commonly cited figure, a standard configuration value — and put a retrievable document in the index that states a different value for your specific context (your organization's actual internal default, in a chunk you've confirmed the retriever surfaces near the top for this exact query). Ask the question. If the model returns the general, pretrained value instead of the one in the document you know it retrieved, you've confirmed the model is not reliably grounding its answer in retrieved context — independent of whether retrieval, chunking, or reranking are working correctly, since you've already controlled for those by confirming the right chunk was retrieved and well-ranked before running the test.

The mitigations here operate on the generation step rather than the retrieval pipeline, since by construction retrieval already did its job in this failure mode. Prompt instructions that explicitly require the model to answer only from the provided context, and to say so explicitly when the context doesn't contain an answer, measurably reduce (though don't eliminate) this behavior — the instruction gives the decoding process an explicit directive to weigh against the pull of parametric memory, rather than leaving the model to implicitly decide which source to trust. Asking the model to quote or cite the specific passage it's basing an answer on has a similar effect for a related reason: producing a citation requires actually locating and referencing the source text, which is a different (and more checkable) generation behavior than producing a fluent answer from general knowledge with no traceable source. Neither instruction is a hard guarantee — a model can still hallucinate a citation to a passage that doesn't say what's being claimed — which is why this failure mode is best treated as something to test for on an ongoing basis with diverging-answer probes like the one above, not something a single prompt change resolves permanently.

## 6\. A diagnostic checklist for "my RAG system gave a wrong answer"

The five failure modes above look identical from the vantage point most people debug from — a wrong or incomplete answer at the end of the pipeline. What separates a fast diagnosis from a slow one is instrumenting the pipeline well enough to look at each intermediate step independently, rather than only ever looking at final outputs and guessing. The checklist below walks the pipeline in the order the request actually flows through it, because each step's answer determines whether you need to look further downstream at all.

```
Step 1 — Is the answer-bearing chunk in the raw top-k retrieval results?
  NO  -> Retrieval failure (section 1). Check: embedding model fit for this
         domain's vocabulary? Query phrasing vs. document phrasing mismatch?
         Does the answer span a chunk boundary? Try a hybrid lexical+semantic
         retrieval pass or a query rewritten in the document's own vocabulary
         before concluding the embedding model itself needs to change.

  YES -> continue to Step 2.

Step 2 — Is that chunk ranked highly enough to survive the top-k cutoff
         actually sent to the model (not just present somewhere in a wider
         first-pass candidate set)?
  NO  -> Under-ranking, not absence (section 3). Add or improve a reranking
         pass over a wider first-pass candidate set before truncating to
         the final k sent to the model.

  YES -> continue to Step 3.

Step 3 — Is the chunk, verified present in the final prompt, sitting in the
         middle of a long multi-chunk context rather than near the start
         or end?
  YES -> Run the position-swap test from section 2: move the chunk to an
         edge position with nothing else changed and rerun generation.
         If the answer flips, this is a lost-in-the-middle issue — reorder
         chunks by rank rather than raw retrieval order, and reduce k.

  NO (already at an edge, or moving it doesn't fix it) -> continue to Step 4.

Step 4 — Does the chunk, read on its own, actually contain a complete
         answer, or does it need adjacent content the chunking split away?
  INCOMPLETE -> Chunking problem (section 4): boundaries are cutting through
         a coherent idea. Consider structure-aware chunking, larger chunks
         for this content type, or attaching parent-heading context as
         metadata carried into the prompt.

  COMPLETE -> continue to Step 5.

Step 5 — Run the diverging-answer probe from section 5: does the model's
         answer match the document's stated value, or a plausible general
         answer that contradicts it?
  CONTRADICTS THE DOCUMENT -> The model is answering from parametric memory
         instead of grounding in retrieved context. Strengthen system-prompt
         grounding instructions, require citation of the specific retrieved
         passage, and treat this as an ongoing thing to probe for rather
         than a one-time fix.

  MATCHES THE DOCUMENT, still wrong -> The document itself is wrong, stale,
         or ambiguous. That's a content and corpus-maintenance problem, not
         a pipeline problem — no retrieval, chunking, or reranking change
         will fix a wrong answer that's faithfully reproducing a wrong
         source document.
```

The discipline worth taking from this checklist isn't the specific order of the five steps so much as the underlying habit: instrument every intermediate stage of the pipeline — raw retrieval results with scores, the reranked order if you have one, the exact assembled prompt sent to the model, and the model's raw output — and log them separately per request, not just the final answer. A RAG system with only end-to-end logging (query in, answer out) forces every debugging session to start from a guess about which stage failed. A RAG system that logs each stage turns the same debugging session into a five-minute lookup, because the evidence for which stage failed was already captured at request time rather than needing to be reconstructed after the fact.

Several of these failure modes also compound rather than occurring in isolation, which is worth keeping in mind once a checklist walk-through implicates more than one stage at once. An oversized chunk (section 4) that dilutes its own embedding is more likely to under-rank in first-pass retrieval (section 1) and, if it does survive into the context, contributes more irrelevant tokens competing for attention in the lost-in-the-middle trough (section 2). Fixing chunking often improves retrieval and position-sensitivity symptoms as a side effect, which is a reasonable justification for starting a broad RAG quality effort at chunking even when the presenting symptom looks like something else — but it's still worth running the checklist per failing query before assuming that's the fix, rather than re-chunking the entire corpus on a hunch and hoping the symptom you started with goes away.

For the broader architectural questions a RAG pipeline sits inside of — how it fits alongside other retrieval and orchestration patterns in an agentic system — see [AI system design patterns](/guides/ai-system-design-patterns). For writing the prompts that go on top of a working retrieval pipeline, including grounding and citation instructions like the ones in section 5, [Composed and advanced prompts](/prompts/composed-and-advanced-prompts) covers the composition techniques in more depth.
