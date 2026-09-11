---
title: Streaming architecture for Claude applications
description: >-
  Streaming changes what a client actually receives, deltas instead of a
  finished message, and that changes how structured output, tool calls, and
  cancellation all have to be handled — a UX decision with real architecture
  attached, not just a flag to flip on.
kicker: Guide · application architecture
lead: >-
  Turning streaming on is a one-line change in most SDKs and a real
  architecture decision underneath it. A non-streamed response is a single,
  complete, parseable object the moment it arrives. A streamed response is a
  sequence of partial deltas arriving over time, and every downstream piece
  of code that assumed it was handling a finished object now has to handle
  one that, for most of its lifetime, isn't finished yet.
wide: true
tileMeta: 'Deltas instead of finished messages, partial JSON, and handling a tool call mid-stream'
---
## 1\. Why streaming is an architecture decision

The case for streaming is real and specific: perceived latency drops sharply when a user sees the response appearing token by token instead of staring at a blank state until the entire response is ready, and for a long response the difference between "nothing, then everything" and "something, immediately, growing" is a genuine UX improvement independent of the actual total generation time being any different. What that improvement costs is architectural, not just a rendering change: every piece of code downstream of the model call that was written assuming a complete, parseable response now has to be written, or rewritten, to handle a sequence of partial fragments arriving over time instead.

## 2\. What actually comes across the wire

A streamed response arrives as a sequence of events, typically over server-sent events, each carrying a delta, an incremental piece of the response, rather than the response so far in full. A text response streams as a sequence of text deltas, each a small chunk of the growing message, and a client that wants to display the full text so far has to concatenate deltas itself; the stream doesn't hand back the accumulated text on each event, only the new piece.

The design implication worth stating plainly is that anything a client wants to know about the response as a whole, its total length, whether it contains a specific piece of content, whether generation stopped for a particular reason, isn't fully knowable until the stream actually completes, and code that needs a complete answer to one of those questions has to either wait for the stream to finish or track the relevant state incrementally as deltas arrive, not assume the first event already carries the answer.

## 3\. Partial JSON: the specific hazard of streaming structured output

When a model call streams a structured output, a tool call's arguments, most concretely, the JSON being constructed arrives the same way the text does, in fragments, and for nearly the entire duration of that stream the accumulated text so far is not valid, parseable JSON, it's a truncated fragment of what will eventually become valid JSON once the closing braces and brackets finally arrive. Code that naively tries to `JSON.parse` the accumulated string on every delta, hoping to show a live, partially-filled-in view of the structured data as it streams in, will fail on nearly every intermediate attempt and succeed only on the final one, which defeats the entire point of trying to render it incrementally.

A partial-JSON parser, one specifically built to tolerate an incomplete document and return whatever structure it can confidently extract from a truncated fragment (a field that closed cleanly even though the object as a whole hasn't), is the actual tool for this job, not a workaround. Using one is what makes it possible to show a form's fields filling in one at a time as a structured extraction streams, or a proposed action's arguments appearing progressively, rather than either showing nothing until the whole object completes or crashing repeatedly on invalid intermediate JSON.

## 4\. Tool calls under streaming

A tool call fundamentally can't be executed until its arguments are complete: calling a function with a half-formed argument object is not a smaller, partial version of calling it correctly, it's simply wrong, and no execution should happen against a tool call's arguments until the stream has signaled that specific call is finished. This means a streaming architecture has to track, per tool call, whether it's still accumulating or has completed, and gate actual execution strictly on completion, even while the UI layer is free to show that same tool call's arguments filling in progressively using the partial-JSON handling from Section 3 for display purposes only.

Keeping those two concerns, what's safe to show progressively and what's safe to actually execute, cleanly separated in the code is the practical discipline: a bug that ties tool execution to the same partial state that's driving a progressive UI update is a bug that eventually executes a tool call with incomplete, and therefore wrong, arguments.

## 5\. Cancellation and backpressure

A user navigating away, closing a tab, or explicitly cancelling a long-running streamed response mid-generation is a normal, expected event, not an edge case, and a streaming architecture that doesn't have an explicit cancellation path leaves the underlying model call running to completion, and being billed for, work whose result nothing is left to consume. Propagating cancellation from the client, through the application's own backend, to the actual model call, so that a closed connection genuinely stops generation rather than just stopping the client from listening to it, is a real piece of plumbing that's easy to skip in an initial implementation and expensive to have skipped once traffic and unused-cancelled-generation costs both grow.

Backpressure is the less obvious half of the same problem: a slow consumer, a client on a poor connection, or a backend process that can't keep up with the rate deltas are arriving, needs the stream to either buffer safely or apply backpressure back toward the source, rather than deltas silently piling up in an unbounded buffer, or worse, being dropped, either of which corrupts what the consumer eventually sees relative to what was actually generated.

## 6\. Streaming through your own backend versus proxying directly

Streaming a response directly from the model API to the browser, with no intermediary, is the simplest architecture and the hardest to add anything to: no server-side validation of the content before the client sees it, no place to enforce a guardrail (see [guardrails architecture](/claude-architecture/guardrails-architecture-validating-claude-outputs)) on output the client is already rendering as it arrives, and no natural point to log or persist the complete response once the stream ends, since the backend was never actually in the data path.

Streaming through your own backend, which relays deltas to the client as they're received from the model while also accumulating them server-side, adds real value at the cost of real complexity: a guardrail can inspect content as it streams and, in principle, interrupt a stream that's producing something it shouldn't, the accumulated final response is captured for logging or storage without a separate round trip, and the backend has one clean place to handle cancellation and backpressure consistently rather than every client having to reimplement that handling against the model API directly. The tradeoff is added latency, however small, from the extra hop, and a genuinely more complex piece of infrastructure to build and keep correct, which is worth paying for a production system with real guardrail and logging requirements and much less obviously worth it for a low-stakes prototype.

## 7\. Worked example: rendering a streamed tool-call argument safely

An application lets Claude propose a calendar event by calling a `create_event` tool, and the product wants the event's fields, title, time, attendees, to visibly fill in as the model generates the tool call, rather than the UI staying blank until the full call completes. The naive implementation tries to `JSON.parse` the accumulated argument string on every delta and catches the exceptions, which mostly works but occasionally renders a flash of stale or partially wrong-looking data when a delta lands in the middle of a field's value, between when the field name closed and its value started, a state a naive parse-and-catch approach can't distinguish from a genuinely different kind of partial state.

The fix uses a dedicated partial-JSON parser that returns a best-effort structure reflecting only the fields that have unambiguously closed so far, leaving a field that's mid-value simply absent from the returned partial object rather than rendered in a half-correct state, so the UI shows title and time appearing cleanly as each one completes rather than flickering through intermediate garbage. Separately, and independently of what the UI is showing, the actual `create_event` tool call is gated on the stream explicitly signaling that this tool call is complete, so no event ever gets created from an argument object the UI itself would have flagged as still filling in.

This pairs with [claude tool use and function calling](/claude-architecture/claude-tool-use-and-function-calling) for the tool-call mechanics being streamed here, and with [structured data extraction](/claude-architecture/structured-data-extraction-pipelines) for the validation a streamed structured output still needs once it's actually complete.
