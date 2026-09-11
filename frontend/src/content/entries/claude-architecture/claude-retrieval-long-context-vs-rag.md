---
title: 'Claude and retrieval: long context vs. RAG, and citations'
description: >-
  A large context window and a retrieval pipeline answer the same question,
  what does the model know about my data, in different ways — when to put a
  corpus directly in context, when retrieval earns its complexity, and what
  citations add that neither alone provides.
kicker: Guide · application architecture
lead: >-
  Every application that grounds Claude in an organization's own data is
  answering the same underlying question — what does the model actually see
  of my corpus — through one of two structurally different mechanisms. A
  large context window lets you put a bounded corpus directly in front of the
  model. Retrieval fetches only the relevant slice at query time. Neither is
  a strictly better default, and the deciding factor is almost always the
  shape of the corpus, not a preference between the two approaches.
wide: true
tileMeta: 'When to put a corpus directly in context, when retrieval earns its complexity, and what citations add'
---
## 1\. Two different answers to "how does the model see my data"

Putting a corpus directly in context means the entire relevant document set, or as much of it as fits, is included in the prompt on every call, and the model reasons over all of it at once with no separate lookup step. Retrieval means an external step, an embedding-based search or another retrieval mechanism, picks the specific slice of a much larger corpus that's actually relevant to the current query, and only that slice enters the model's context. Both approaches solve the same problem, giving the model access to information beyond what it learned in training, and the honest framing is that they're two different points on a spectrum of how much of a corpus enters context per call, not two unrelated techniques competing for the same job.

## 2\. What a large context window actually buys

For a corpus that's genuinely bounded and known ahead of time, a company's policy documents, a specific codebase, a fixed set of reference materials, putting it directly in context sidesteps an entire category of failure [RAG failure modes](/guides/rag-failure-modes) covers in depth: there's no retrieval step to fail, because there's no retrieval step at all. The model has everything, so a query that spans several documents, or requires synthesizing information that's scattered rather than concentrated in one obviously-relevant chunk, doesn't depend on a retriever having correctly guessed which handful of chunks out of the whole corpus was relevant to a synthesis question retrieval is often poorly suited to answer in the first place.

The real cost is what has to be paid on every single call: the entire included corpus counts against the context window's budget and, absent caching, against the cost and latency of processing that much input on every request, whether or not the specific query actually needed most of it. A corpus that comfortably fits within a usable fraction of the context window, leaving real room for the conversation and the model's own reasoning, is the case this approach is strongest for.

## 3\. Where long context stops being the right answer

The approach breaks down along two independent axes, and it's worth naming both, because they fail differently. Size: a corpus larger than the window simply doesn't fit, and no amount of good prompt design changes that; something has to be excluded from any given call, which is exactly the selection problem retrieval exists to solve, deliberately, at query time. Volatility: a corpus that changes frequently, more than the caching window's lifetime it would otherwise sit inside, has to be re-included fresh on every call once the cached version goes stale, at full cost, undermining the economics that make a large static corpus in context affordable in the first place.

The cost specifically, not just the size limit, is what changes the calculus for a corpus sitting near the edge of what fits: resending a large corpus on every call, with no caching benefit because the corpus changes too often to stay cached, is a real, compounding cost that a much smaller, per-query retrieval step would avoid by only ever sending the slice that's actually relevant to that one query.

## 4\. Where retrieval earns its complexity

Retrieval's actual justification is a corpus that's large enough, or dynamic enough, that including all of it in every call is neither affordable nor necessary, because most of any given query's answer lives in a small fraction of the total corpus. A support knowledge base with thousands of articles, most of which are irrelevant to any single incoming question, is the textbook case: retrieval's per-query cost stays roughly constant regardless of how large the underlying corpus grows, where a long-context approach's per-query cost grows with the corpus itself.

[Prompt caching architecture](/claude-architecture/prompt-caching-architecture) changes this calculus in one specific, important way worth naming directly: caching turns a large, static portion of a corpus from a cost paid on every call into a cost paid once and reused, which meaningfully extends how large a corpus can stay economically viable to include directly in context, provided that portion is genuinely stable rather than changing on every request. This doesn't remove the hard size ceiling of the window itself, but it substantially raises the volatility and cost bar retrieval has to clear to be worth its own complexity, for the specific slice of a corpus that's stable enough to actually benefit from caching.

## 5\. Citations: grounding a claim to a specific span

Neither long context nor retrieval, on their own, guarantees that a model's answer is actually traceable to a specific piece of the source material rather than a fluent restatement that happens to be consistent with it. Citations are a distinct capability: the model's response is explicitly linked to the specific passage in the provided source that supports each claim, rather than the calling application having to trust that a response grounded in context was actually derived from the material it was given and not from the model's own parametric memory of a superficially similar fact, the exact failure mode [RAG failure modes](/guides/rag-failure-modes) describes in its section on a model ignoring retrieved context.

This matters independently of whether the source material arrived through long context or through retrieval, because the underlying risk, a fluent answer that isn't actually anchored to a specific verifiable source, exists either way. A citation-backed response gives a downstream consumer, a human reviewer, or an automated check something concrete to verify a claim against, a specific span of a specific document, rather than a plausible-sounding answer with no traceable link back to what actually supports it.

## 6\. A hybrid design: cached long context plus retrieval for the dynamic tail

A common real-world corpus isn't uniformly static or uniformly dynamic, it's a stable, bounded core, a product's core documentation, a company's policies, that changes rarely, plus a much larger, faster-growing tail, individual support tickets, recent product updates, that changes constantly and would never stay cached long enough to be worth including directly. The design that actually fits this shape puts the stable core directly in context, cached so its cost is paid once rather than on every call, and reaches for retrieval only for the dynamic tail, fetching the small number of recent or specific items a given query actually needs from a corpus too large and too fast-changing to include wholesale.

This isn't a compromise between the two approaches so much as applying each where it's actually the stronger fit: long context for the part of the corpus retrieval would poorly serve anyway, since a synthesis question spanning the stable core benefits from having all of it present at once, and retrieval for the part long context can't economically include at all.

## 7\. Worked example: a support corpus that outgrew long context

A support application originally put its entire help-center corpus, a few hundred articles, directly in a cached system prompt, which worked well: queries that spanned multiple articles got answered correctly because the model had everything, and the caching made the per-query cost of resending that corpus small. Over a year, the corpus grew past a size where it still comfortably fit alongside the rest of the system's context budget, and updates to popular articles started happening often enough that the cached version was frequently stale by the time a user asked about a topic that had just changed.

The fix split the corpus rather than replacing the approach wholesale: a curated, genuinely stable subset, the handful of foundational articles that rarely change and that most synthesis-style questions actually depend on, stayed directly in context, cached as before; the full corpus, including everything that changes often, moved behind a retrieval step that fetches the specific articles relevant to a given query, with citations returned alongside the answer so a support agent reviewing the response could verify it against the actual current article rather than trusting that the model's training or a stale cached copy still reflected what the article currently said.

This pairs with [prompt caching architecture](/claude-architecture/prompt-caching-architecture) for the mechanics of what makes a large static core affordable to keep in context, and with [RAG failure modes](/guides/rag-failure-modes) for debugging the retrieval half once a corpus has genuinely outgrown what belongs directly in context.
