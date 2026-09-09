---
title: 'Agent memory architecture: short-term, long-term, and retrieval patterns'
description: >-
  Memory is not the context window — what actually needs to persist across
  sessions, what shape it should take, and why deciding what gets written is
  the harder problem than deciding where it's stored.
kicker: Guide · systems engineering
lead: >-
  A context window holds everything an agent knows about the current
  conversation, and none of it survives the conversation ending. Memory is
  the separate system that does survive: a deliberate decision about what an
  agent should still know the next time it starts, stored somewhere it can
  retrieve from, and written to on a policy someone actually designed rather
  than by accident.
wide: true
group: systems-engineering
tileMeta: 'What actually needs to persist across sessions, and why write policy is the hard part'
---
## 1\. Memory is not the context window

[Context engineering](/guides/context-engineering) is about managing what fills the window during one session: tool results, retrieved documents, accumulated conversation history, all of it gone the moment the session ends, regardless of how carefully it was curated while the session was live. Memory is the separate concern of what should still be true, and still known, the next time an agent starts a fresh session with an empty window. Conflating the two produces two different, opposite mistakes: treating everything in a long session's context as if it should persist, which turns memory into an unfiltered transcript dump nobody curated, or treating nothing as worth persisting, which means an agent relearns the same facts about a user or a task from scratch, every single session, with no benefit from having encountered them before.

## 2\. Short-term memory: working state within a session

Within a single session, an agent's working memory is largely just its context window, plus, in more sophisticated designs, an explicit scratchpad the agent writes intermediate state to deliberately rather than leaving everything implicit in the conversation history. A scratchpad serves a narrower purpose than the full context: a running plan, a list of subtasks completed so far, a set of facts gathered mid-task that the agent wants to reference reliably later in the same session without depending on the model correctly recalling them from earlier in a long, possibly cluttered context. This is still session-scoped, not memory in the persistent sense; it's a structuring choice within one session's working state, not a decision about what survives past it.

## 3\. Long-term memory: deciding what actually needs to persist

The genuinely hard design question isn't how to store persistent memory, it's what belongs in it at all. A user's stated preference that's likely to hold across many future sessions, a coding agent's discovery that a particular test in a particular repository is known to be flaky and unrelated to whatever it's currently debugging, a customer's account-specific context a support agent shouldn't have to re-derive on every new ticket, are all genuine candidates: information whose value comes specifically from being available before the current session's own context could have surfaced it again. A one-off detail relevant only to the task that happened to be running when it came up isn't a memory candidate at all; it's ordinary session content that correctly disappears when the session ends, and treating it as a memory candidate just because it happened to be true once inflates the memory store with content that will never be useful again.

## 4\. Storage shapes: structured facts, embeddings, or raw transcripts

A structured store, explicit key-value facts or records with defined fields, a user's timezone, a project's preferred code style, is the easiest shape to retrieve from reliably and the easiest to keep consistent, because a later write updating the same field simply overwrites the old value rather than leaving two versions of the same fact sitting in an unstructured store with no clear resolution between them. It's also the most limited shape: it only holds what someone explicitly designed a field for, and a fact that doesn't fit any existing field either gets forced into the wrong one or dropped.

An embedding-based store, memory content indexed for semantic retrieval the same way a RAG system indexes documents, handles open-ended, unstructured memories, a past conversation's gist, a preference expressed in passing that doesn't map to any predefined field, at the cost of inheriting the same retrieval failure modes [RAG failure modes](/guides/rag-failure-modes) documents for document retrieval generally: a memory that's genuinely relevant to the current session can still fail to surface if its phrasing doesn't match the current query well in embedding space. A raw transcript store, keeping full past session logs retrievable, is the least curated and the least reliable to actually use well, since finding the one relevant detail in a long past transcript is itself a retrieval problem, and most systems that store raw transcripts as memory are really relying on a summarization or extraction step to turn them into one of the other two shapes before they're actually useful.

## 5\. Write policy: the harder problem than storage

Deciding what gets written to long-term memory, and when, is where most of a memory system's actual quality lives, more than the choice of storage shape. Writing everything a session touches produces a store that grows without bound and is dominated by noise, one-off details from Section 3 that happened to be discussed but were never meant to persist, diluting retrieval the same way an over-broad RAG corpus dilutes retrieval quality generally. Writing nothing automatically, requiring an explicit user action to save something to memory, is safer against noise and misses the more common case: a preference or a fact a user stated in passing, expecting it to be remembered, without ever issuing an explicit "remember this" instruction.

A middle design that tends to work better in practice runs a deliberate extraction step at the end of a session, or at natural task boundaries within one, asking specifically what from this session is a genuine candidate for Section 3's bar, rather than either persisting the raw session or requiring an explicit save action for everything worth keeping. That extraction step is itself a real design surface: too aggressive and it writes noise anyway; too conservative and it misses things a user reasonably expected to be remembered without having to ask explicitly.

## 6\. Staleness and contradiction

A memory, once written, doesn't automatically stay true, and a memory system with no mechanism for a new fact to override or retire an old one accumulates contradictions the same way an event-sourced system accumulates history without a projection step to resolve it into current state: a stored preference from six months ago that's since changed, a fact about a project's structure that a subsequent refactor made false, sits in the store exactly as confidently as anything written yesterday, with nothing distinguishing "still true" from "was true once."

The mitigation isn't avoiding writes to the same category of memory repeatedly, it's an explicit resolution step: a new fact that plausibly contradicts or updates an existing memory should be checked against what's already stored, with the newer one either replacing the older one outright (for a genuinely single-valued fact like a preference) or both being retained with enough context, most obviously a timestamp, for a later retrieval to reasonably prefer the more recent one when they disagree. A memory store with no timestamps and no update mechanism at all is a store that degrades in reliability over time in a way that's invisible until an agent confidently acts on something that stopped being true a while ago.

## 7\. Worked example: a coding agent's stale preference

A coding agent stores a memory that a particular user prefers verbose logging in a service it works on regularly, learned from an early session where the user explicitly asked for more logging while debugging an issue. Months later, after the logging was deliberately reduced in a later session (the user found it too noisy and asked the agent to trim it down, in a different session that never revisited the original stored preference), the agent, working on an unrelated task in the same service, adds a new log statement following the still-stored "prefers verbose logging" memory, reintroducing exactly the noise the user had asked to have removed.

The fix isn't avoiding memory for preferences like this; it's that the later session's explicit request to reduce logging should itself have triggered a write, updating or retiring the original memory rather than leaving it standing unchallenged. A memory system that only ever writes new facts and never revisits or retires old ones will keep resurfacing decisions a user has since reversed, and the actual defect here is a missing update path, not the original memory having been wrong to store in the first place.

This pairs with [context engineering](/guides/context-engineering) for the session-scoped budget memory retrieval eventually has to compete inside once it's pulled back into a live context window, and with [multi-agent orchestration patterns with Claude](/claude-architecture/multi-agent-orchestration-patterns) for how a persistent memory store can serve as shared state across agents that otherwise have no visibility into each other's sessions.
