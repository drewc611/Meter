---
title: 'Fine-tuning, prompting, and RAG: choosing the right lever'
description: >-
  Prompting, retrieval, and fine-tuning solve three genuinely different
  problems — behavior versus knowledge versus consistency at scale — and
  most real systems need more than one of them working together, not a
  single winner.
kicker: Guide · systems engineering
lead: >-
  These three get compared as if they're competing answers to the same
  question, which model architecture should power my AI feature, and that
  framing is the mistake. They're answers to three different questions:
  what should the model do, what should it know, and how consistently should
  it do it at scale. A real system usually needs an honest answer to all
  three, not a single winning technique.
wide: true
group: systems-engineering
tileMeta: 'Behavior, knowledge, and consistency at scale — three different questions, not one'
---
## 1\. Three different problems wearing one debate

"Should we fine-tune or use RAG" is a question that only makes sense once you've already conflated two unrelated things: giving a model access to specific knowledge it wasn't trained on, and shaping how a model behaves, what format it responds in, what tone it uses, how it handles an edge case. RAG is an answer to the first question. Fine-tuning can be an answer to the second, and a much weaker, less reliable answer to the first than most people expect going in. Prompting sits underneath both, since a system prompt is doing real, load-bearing work in nearly every system regardless of whether RAG or fine-tuning is also involved. Being precise about which of the three questions is actually the open one for a given feature is most of the work in choosing correctly.

## 2\. Prompting: behavior and format, cheap to iterate

A system prompt, well-written instructions, examples of the desired output format, and clear guidance on edge cases, is the cheapest lever to pull and the first one worth exhausting before reaching for either of the other two. It's cheap specifically because iteration is instant: a prompt change takes effect on the very next call, with no training run, no data collection, no deployment of a new model artifact. For a large share of behavior and format problems, tone, structure, how to handle an ambiguous request, prompting alone gets a system most of the way there, and teams that skip straight to fine-tuning for a problem prompting could have solved are usually paying a much higher iteration cost for a result a well-designed prompt would have reached faster and more cheaply.

The real limit is context-window bound: a prompt can only carry so many instructions and examples before it's competing for space against everything else in the window, the exact budget problem [context engineering](/guides/context-engineering) describes, and a prompt that's grown into an enormous, ad hoc collection of edge-case patches is a sign the behavior being encoded has outgrown what a static set of instructions can reliably hold, which is one of the few real signals fine-tuning might be worth its cost.

## 3\. RAG: knowledge that's large, dynamic, or needs to be attributable

Retrieval exists for information a model needs access to that's too large to fit in a prompt, changes too often to bake into a fixed set of instructions, or needs to be traceable back to a specific, verifiable source rather than trusted as an implicit part of the model's own knowledge. A support system that needs to answer from an evolving, frequently updated knowledge base, a research tool that needs to cite the specific document a claim came from, a system operating over private, proprietary data the model was never trained on at all, are all cases where the actual problem is "what does the model know," and no amount of prompt engineering or fine-tuning substitutes for the model simply not having had access to information that didn't exist, or wasn't available, at training time.

[Claude and retrieval: long context vs. RAG](/claude-architecture/claude-retrieval-long-context-vs-rag) covers the further distinction between putting a bounded corpus directly in context and reaching for a genuine retrieval pipeline; the point relevant here is that both are answers to the knowledge question, and neither is what fine-tuning is actually good at answering.

## 4\. Fine-tuning: consistent behavior at scale, and its real cost

Fine-tuning earns its cost in a narrower set of cases than its reputation suggests: a narrow, well-defined task performed at very high volume, where the marginal cost of a shorter, tighter prompt (because the desired behavior is now baked into the model's weights rather than re-specified in every call's instructions) meaningfully offsets the real, upfront cost of curating training data and running the fine-tuning process itself. It's also the right lever for consistency demands a prompt alone struggles to guarantee across a very large volume of varied inputs, a specific output format or style that needs to hold with very little deviation across millions of calls, where prompting alone leaves enough variance across edge cases that the aggregate consistency isn't good enough for the use case.

The cost side is real and worth stating plainly against the appeal of "just train it to do the right thing": curating a training dataset well is genuinely hard, a poorly curated one bakes in whatever biases and errors the data happened to contain, iteration is slow relative to a prompt change, since a new fine-tuning run is required to test a behavior adjustment rather than an instant prompt edit, and a fine-tuned model is now a specific artifact someone has to version, evaluate, and maintain going forward, with its own regression risk every time it's retrained on updated data.

## 5\. What fine-tuning doesn't fix

The mistake worth naming directly, because it's common and expensive to discover late: fine-tuning is not a reliable way to teach a model new facts the way retrieval is. A model fine-tuned on a dataset that happens to contain a set of facts learns something closer to the style and pattern of that data than a reliable, retrievable memory of every specific fact in it, and a model asked to recall a specific detail that appeared once in its fine-tuning data is meaningfully less reliable at that than a retrieval system that fetches the exact source document containing that detail on demand, every time, verifiable against the actual source. Teams that reach for fine-tuning specifically to give a model knowledge of a proprietary dataset are usually solving the wrong problem with the wrong tool, and reaching for retrieval, or a hybrid of retrieval plus a lighter fine-tune for format and tone, gets a more reliable result for the actual knowledge-access half of the problem.

## 6\. They compose

None of the three excludes the others, and most production systems that look, from the outside, like they picked one, are actually running some combination: a well-designed system prompt for tone and format, retrieval for the specific, current, or proprietary knowledge a given response needs to be grounded in, and, in the narrower cases where it earns its cost, a fine-tune layered on top for a specific, high-volume, narrow task where consistency at scale matters more than general flexibility. Treating the choice as exclusive, "we're a RAG system" or "we fine-tuned our model," tends to produce a system that's over-invested in whichever lever got the initial attention and under-invested in whichever one actually addresses a gap the chosen lever was never suited to close.

## 7\. Worked example: a support bot needing all three

A support bot needs to answer in the company's specific tone and format (a behavior problem), needs to answer from a knowledge base that's updated daily with new articles and product changes (a knowledge problem), and needs to reliably classify every incoming ticket into one of a fixed set of categories at very high volume with tight consistency requirements for downstream routing (a consistency-at-scale problem). Solving all three with one lever produces a worse system than addressing each with the one actually suited to it: prompting alone can shape tone reasonably well but can't keep pace with a knowledge base updating daily without either an enormous, constantly rewritten prompt or the retrieval this scenario actually needs; RAG solves the knowledge problem directly and doesn't meaningfully help the classification-consistency requirement, which is really a narrow, high-volume, well-defined task exactly suited to a lightweight fine-tune; and fine-tuning the whole bot's general conversational behavior, rather than just the narrow classification step, would be slow to iterate on and wouldn't solve the knowledge-freshness problem retrieval already solves better and more cheaply.

The system that actually works layers all three at the point each is doing its own distinct job: a well-crafted system prompt for tone and general behavior, retrieval against the daily-updated knowledge base for anything requiring current or proprietary information, and a small, purpose-built classifier, potentially the one genuinely fine-tuned piece, handling ticket categorization at the volume and consistency the routing system actually needs.

This pairs with [RAG failure modes](/guides/rag-failure-modes) for debugging the retrieval piece once it's the right lever, and with [eval-driven development](/guides/eval-driven-development) for how to actually measure whether a given change, to a prompt, a retrieval pipeline, or a fine-tune, moved the system's real performance rather than just feeling like an improvement.
