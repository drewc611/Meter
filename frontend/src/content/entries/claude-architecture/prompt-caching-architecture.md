---
title: Prompt caching architecture for Claude applications
description: >-
  Why prompt caching is a prompt-structure decision, not a flag you flip — and
  how to design the static-versus-dynamic split so an application built on
  Claude actually gets the latency and cost benefit in practice.
kicker: Guide · application architecture
lead: >-
  Prompt caching is often described like a setting — turn it on, save money. In
  practice it's closer to a constraint on how you structure a prompt, and
  treating it as a flag rather than an architectural decision is the most common
  reason a team enables caching and sees little to no benefit. This guide is
  about the design discipline: what belongs where in a prompt so that the cache
  actually gets reused, why some seemingly small choices silently defeat it, and
  which kinds of applications built on Claude have the most to gain from getting
  this right.
wide: true
tileMeta: 'Structuring prompts so the static part actually caches, and where it pays off'
---
## 1\. The problem caching solves

A typical multi-turn conversation or agent loop resends a large amount of unchanged content on every single call. The system prompt — instructions, persona, operating rules — is usually identical from one call to the next within the same session. The tool definitions — every function the model is allowed to call, with its full schema — have to be present on every turn regardless of whether that turn actually uses them, and they don't change mid-session either. A large reference document, a long set of few-shot examples, a big block of retrieved context: all of it can be exactly the same bytes, call after call, for the length of a session or even across many different sessions that share the same setup.

Without caching, an API has no way to know that this content is unchanged — it reprocesses the entire input from scratch on every request, paying the full cost and latency for content that contributed nothing new to that call. Prompt caching lets the model provider recognize a previously seen prefix and skip reprocessing it, so the unchanged portion of a call is substantially cheaper and faster to send than it would be uncached, while the genuinely new part of the request — the latest user message, the newest tool result — still gets processed normally. The saving scales with how much of the prompt is actually stable and how often that stable portion gets reused, which is exactly why caching rewards a specific kind of prompt structure rather than working equally well on any prompt you throw at it.

It's worth being precise about the mechanism, because the details shape the design rules in the rest of this guide: caching works by matching an exact, stable prefix of the request — not by finding similar content anywhere in the prompt, and not by understanding the prompt's meaning. A cached entry persists for a limited window and is refreshed each time it's actually reused within that window, so content that keeps getting called on again and again inside the window stays cheap to resend, while content that's cached once and then not touched again for a long stretch simply expires and has to be reprocessed fully the next time it's needed.

## 2\. The architectural implication: what goes where

Because caching works on a stable prefix match, prompt structure stops being purely a readability concern and becomes a performance one: content that's genuinely static across many calls — system instructions, tool definitions, a large reference document — has to be placed early in the request and kept byte-for-byte identical across calls, so the provider can recognize it as the same prefix it's already seen. Content that changes every turn — the user's latest message, the most recent tool result — has to come after that stable portion, because caching only helps the part of the request that precedes it; putting volatile content early doesn't just fail to help, it breaks the cache for everything that comes after it too.

This is the part that catches teams off guard: caching isn't something you bolt onto an existing prompt by adding a flag, because most prompts weren't written with this ordering constraint in mind. A prompt that interleaves stable and changing content throughout — a system prompt that embeds today's date near the top, or a tool list that gets filtered per user — has no long stable prefix to cache in the first place, no matter how the request is marked. Getting the benefit means going back to how the prompt is assembled and actually separating "content that never changes for this deployment" from "content that changes on some cadence" from "content that changes every single call," and rendering them in that order, consistently.

> **A rough ordering that tends to cache well, from most stable to least:**
>
> Tool definitions (fixed for the deployment) → system instructions (fixed, or changed rarely and deliberately) → long-lived reference material or few-shot examples (fixed per use case) → conversation history accumulated so far (grows, but each prior turn stays unchanged once written) → the newest user message or tool result (different on every call, and belongs at the very end).

None of this requires the application to track a cache explicitly or manage cache keys by hand — the provider does the prefix matching. What the application has to get right is simpler and more foundational: render the stable parts of the prompt the same way, in the same order, every time, and put the parts that legitimately change at the end. Get that ordering wrong and no amount of cache configuration recovers the benefit, because there's no stable prefix left to match against.

## 3\. The real tradeoff: what counts as "static enough"

The hard part in practice usually isn't recognizing that a system prompt is mostly static — it's noticing the one place it isn't. A system prompt that's otherwise completely fixed, but has the user's name interpolated into an opening line ("You are a helpful assistant. You are currently helping Priya with..."), looks static at a glance and isn't: the interpolated name makes every user's prompt bytes different from every other user's, which means nothing about that prompt caches across users at all, even though the vast majority of its content — the actual instructions — is identical for everyone. The same failure shows up with a timestamp dropped into a header, a session ID threaded into the instructions, or a feature flag that toggles a sentence in and out depending on which cohort the user is in.

The fix isn't to stop personalizing prompts — personalization is often genuinely useful — it's to physically separate the part that's personalized from the part that isn't, rather than weaving them together. Move the truly static instructions into one block, uninterrupted by anything variable, and put the personalized detail after it: as a short addendum at the end of the system content, or better, as part of the first user turn rather than inside the system prompt at all. The cache then covers the entire static block for every user, and only the small personalized fragment at the end has to be processed fresh each time — which is a much better trade than losing the cache benefit on the whole thing because ten words at the top varied.

This is really a claim about prompt design discipline, not a caching-specific technique: a prompt that keeps "what's true for everyone, always" cleanly separated from "what's true for this specific call" is easier to reason about, easier to test, and happens to cache well as a side effect of being well-organized. A prompt that interleaves the two because it was easiest to write that way — building the instructions as one long string with variables spliced in wherever they were convenient — is harder to reason about and, separately, defeats caching, for the same underlying reason: neither a human reader nor the caching mechanism can tell where "static" ends and "variable" begins when they're tangled together line by line.

## 4\. The practical benefit for agentic loops specifically

Caching helps any application that reuses a stable prefix more than once, but the shape of an agentic loop is close to the ideal case for it. A single-call use — a one-off summarization request, a one-time classification — sends its prompt once and gets one response back; there's nothing to reuse it against. An agent loop is the opposite: the same system prompt and the same full tool inventory get sent on every single iteration of the loop, potentially dozens of times within one task, as the agent reads a file, calls a tool, reads the result, decides on the next action, and calls the model again. That system prompt and tool list are exactly the "static content reused many times within one task" pattern caching is built for, and the number of reuses — not just whether something is cacheable in principle — is what determines how much caching actually saves.

The saving compounds as the loop runs longer, for a specific structural reason: each new iteration's request includes not just the fixed system prompt and tools, but the entire conversation history accumulated so far — every previous tool call and its result. If that history is rendered consistently and appended to rather than rewritten, each prior turn stays part of a stable, growing prefix that the next call can reuse in full, and only the newest turn at the end is genuinely new content. A twenty-iteration agent loop built this way pays the full processing cost for the accumulated history only once per new increment, not twenty separate times for the whole thing — which is a meaningfully different cost profile than resending and fully reprocessing the entire growing history on every single call.

This is also where the discipline from the previous section matters most, because agent loops are exactly where dynamic content tends to sneak into supposedly-static prompt sections — a loop that injects a running token count, a live timestamp, or a dynamically adjusted instruction into the system prompt on every iteration (to keep the model aware of some changing state) will find that the very thing meant to help the model actually breaks the loop's caching on every single turn. If state needs to travel with every call, it belongs in the message history, at the end of the request — appended as a new turn — not folded into the system prompt that's supposed to stay fixed for the whole task.

## 5\. The limits of caching: it's not a universal free optimization

It's tempting to treat prompt caching as a strict improvement to apply everywhere, but it isn't one — it has real limits, and understanding them is what keeps a team from marking every possible piece of content as cacheable and being confused when the bill doesn't move.

First, a cached entry has a finite freshness window, and the content has to actually be reused within that window to pay off — caching something that's called once, then not called again until long after the window has lapsed, gets no benefit at all; it's reprocessed fresh the next time regardless, and the one-time act of caching it may itself cost a little more than not bothering to cache it in the first place. Caching is a bet that the same content will be reused again soon, and a workload made up of isolated, far-apart, one-off calls to the model — the exact opposite of the repeated-call pattern agent loops produce — never collects on that bet.

Second, caching only ever helps the portion of the request that's actually stable and actually precedes the point of change. A prompt that's mostly unique content on every call — a different long document pasted in fresh each time, with only a short fixed instruction wrapped around it — has very little to gain from caching no matter how it's structured, because there's simply little reusable content in it to begin with. Caching amplifies an existing property of the workload (how much of the prompt repeats, and how often); it doesn't manufacture repetition that wasn't there.

> **The pattern that benefits: high repetition, short gaps.** Agent loops (many calls per task, seconds apart), a chat session with a long, fixed system prompt (many turns, short gaps), or a service that fields many concurrent requests all sharing one large fixed instruction set and tool list — the same stable prefix, reused constantly, by one session or across many simultaneous ones.
>
> **The pattern that doesn't: low repetition, long gaps.** A nightly batch job that processes each record with a unique document, once, and moves on. A rarely-used feature that calls the model a handful of times a day with hours between calls. In both cases there's either nothing stable to cache, or too much time between reuses for the cached entry to still be there when it would help.

The practical takeaway is to evaluate caching against the actual shape of a specific workload — how much of the prompt is stable, and how frequently that stable part gets reused — rather than applying it uniformly because it's available. It's one of the more reliably free wins in practice for the workloads that fit its shape, and genuinely does nothing for the ones that don't.

## 6\. Worked example: a prompt that defeats caching vs. one designed for it

The difference between these two versions of the same agent's prompt is entirely about where the dynamic content sits, not about what information is included — both versions carry the same instructions and the same live state.

```
Version A — defeats caching (dynamic content interleaved throughout):

  system = f"""
  You are a support agent. The current time is {datetime.now()}.
  Session ID: {uuid4()}.
  User's plan tier: {user.plan_tier}.

  Follow these rules when answering:
  1. Always check order status before refunding.
  2. Never share another customer's data.
  3. Escalate anything involving a legal threat.
  ... (2,000 more words of otherwise-fixed policy) ...

  Today's promotional note: {get_current_promo_banner()}.
  """

Every one of those interpolated values sits inside the instructions rather
than after them, so the entire 2,000-word policy block — the one part that
never actually changes — never gets to be a stable prefix. It's preceded and
interrupted by content that's different on every single call.

Version B — designed to cache well (static block first, dynamic content
isolated at the end):

  STATIC_POLICY = """
  You are a support agent.

  Follow these rules when answering:
  1. Always check order status before refunding.
  2. Never share another customer's data.
  3. Escalate anything involving a legal threat.
  ... (2,000 more words of otherwise-fixed policy) ...
  """  # identical across every call — this is the cacheable prefix

  system = STATIC_POLICY  # unchanged, byte-for-byte, call after call

  messages = [
      # per-call context goes in the first user turn instead of the
      # system prompt, after the stable block, not woven into it
      {"role": "user", "content":
          f"[context: plan={user.plan_tier}, promo={get_current_promo_banner()}] "
          f"{actual_user_message}"},
      ...
  ]
```

The rewrite doesn't remove any information — the plan tier and promo banner still reach the model on every call. What changes is where they sit: version B keeps the entire 2,000-word policy block identical and uninterrupted across every request, so it becomes a stable prefix the provider can recognize and skip reprocessing, while the small amount of genuinely per-call content moves to the very end, where its variability can't contaminate anything upstream of it. Version A pays full processing cost for the whole prompt on every single call, forever, because the timestamp and session ID at the top guarantee no two calls ever share a prefix worth caching in the first place — the fix costs nothing in capability, only a small amount of restructuring in how the prompt gets assembled.

The same discipline this guide describes for a stable system prompt also applies to the surrounding context an agent accumulates as it runs — what stays in that history and what gets summarized or dropped as a session grows long. For that side of the problem, see [Context engineering: what actually goes into the context window](/guides/context-engineering), which covers the token-budget and relevance questions that caching's stable-prefix discipline pairs with directly.
