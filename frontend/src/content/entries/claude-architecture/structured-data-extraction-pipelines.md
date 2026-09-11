---
title: 'Structured data extraction: schema design and validation architecture'
description: >-
  Getting Claude to return JSON is the easy part — the real design work is a
  schema tight enough to constrain the model, validation that catches what
  the schema alone can't, and a pipeline for what happens when both fail.
kicker: Guide · application architecture
lead: >-
  "Make it return JSON" describes an output format, not a reliable pipeline.
  A schema is a contract, and like any contract, how tightly it's written
  determines how much room there is for a technically-valid-but-wrong
  response to slip through. The design work that actually matters here is the
  schema itself, and what happens downstream when a response fails to honor
  it.
wide: true
tileMeta: 'Schema design as the interface, validation failure handling, and where extraction fits in a pipeline'
---
## 1\. What structured extraction actually is

Extraction is the task of turning unstructured or semi-structured input, a document, an email, a scanned form, into a fixed, machine-consumable shape: a set of named fields with defined types, ready to be written to a database or passed to the next step in a pipeline without a human reading the model's prose and typing the fields in by hand. [Claude tool use and function calling](/claude-architecture/claude-tool-use-and-function-calling) already covers the mechanics of getting a model to produce structured output, generally through a tool call whose input schema defines the shape, and it's worth being precise about the distinction this piece is actually about: getting one correctly formatted response is a solved mechanical problem, and getting a pipeline that behaves predictably across thousands of real, messy inputs, where the field the model was supposed to extract is missing, ambiguous, or represented three different ways across three different documents, is a design problem, not a formatting one.

## 2\. Schema design as the actual interface

A loose schema, a `notes` string field where a tighter schema could have named the actual fields, pushes the burden of interpreting the output back onto whatever consumes it, and that burden shows up eventually as a parsing bug in a downstream system rather than as a validation failure at the point it should have been caught. Every field that can be an enum instead of a free-text string should be one: a status field with three known real values, encoded as an enum, structurally cannot come back as a fourth, unanticipated string a downstream switch statement doesn't handle; the same field left as free text can, and often eventually will, once the input distribution includes a document phrased in a way nobody tested against.

Marking a field required versus optional is a real design decision, not a formality: a required field the model can't confidently fill from a given document forces a choice between guessing (bad) and failing the whole extraction (often the more honest and more recoverable outcome). An optional field that's genuinely often absent in real inputs, and modeled as such, lets the model correctly return nothing for it rather than being implicitly pressured to invent a value just to satisfy a schema that claimed something would always be there.

## 3\. Forcing the extraction contract

A schema attached to a tool definition, with the model made to call that specific tool (forcing tool choice rather than leaving the decision open to a general response), is a stronger contract than asking for JSON in a prompt and hoping the model's response parses cleanly. The forced-tool-call path constrains the space of what a valid response can even look like at generation time, which is a meaningfully different guarantee than a prompted-JSON approach that produces a free-text response the calling code then has to parse and hope was actually valid JSON, with no structural guarantee it will be.

This doesn't mean prompted JSON is never appropriate, a lightweight, low-stakes extraction where an occasional malformed response is cheap to detect and retry can reasonably skip the extra structure. It does mean that for anything feeding a pipeline where a malformed response is expensive to catch after the fact, a forced tool call with a well-designed schema is the stronger default, not an optimization to add later once the lighter-weight approach starts causing problems.

## 4\. Handling validation failures

A schema constrains what shape a response takes; it does not constrain whether the values inside that shape are correct. A response can be syntactically perfect, every required field present, every type correct, and still contain a wrong extracted value, a total that doesn't match the sum of the line items on the same document, a date that's syntactically valid but outside any plausible range for the document it came from. Schema validation catches shape; it takes a separate, deliberate check to catch this second class of failure, and skipping that second check because the schema already validated is a common, costly gap.

The retry strategy that works best in practice feeds the actual validation failure back to the model rather than simply re-asking the same question: on a validation failure, whether it's the schema itself or a semantic check like a total that doesn't reconcile, include the specific error in a follow-up turn, so the model is correcting a named, concrete problem rather than guessing at what went wrong from an unexplained retry. A budget on retries matters too: an extraction that fails validation repeatedly on the same input is more likely revealing a genuinely ambiguous or malformed source document than a model having a bad turn, and routing it to a dead-letter queue for human review after a small, fixed number of attempts is a better design than retrying indefinitely and hoping.

## 5\. Nested and repeated structures fail differently

A flat schema, a handful of top-level scalar fields, is close to the easiest case an extraction pipeline handles, and it's also the case least representative of real documents. An invoice's line items, a resume's list of jobs, a form's repeated sections, all require an array of nested objects, and that structure fails in ways a flat schema doesn't: a single malformed item deep inside an otherwise-correct array can invalidate the entire response if validation isn't written to distinguish "this one nested item is wrong" from "the whole extraction is wrong," and a document with a genuinely variable number of repeated sections stresses a model's consistency across items in a way a single scalar field never does, since each item in the array has to independently follow the same shape.

The practical mitigation is validating and, where sensible, salvaging at the item level rather than the whole-document level: an invoice with nine correctly extracted line items and one malformed one is usually more useful, with the malformed item flagged for review, than discarding all ten because the response as a whole failed strict validation. This only works if the pipeline is actually built to distinguish item-level failures from document-level ones, which has to be a deliberate design decision in the validation layer, not something a generic schema check gives for free.

## 6\. Where extraction sits in a larger pipeline

An extraction call is rarely the last step; it's a component that has to compose with a queue, a retry mechanism, and a human review path for exactly the cases sections 4 and 5 describe. A pipeline built to treat every extraction as either a clean success or a hard failure, with no middle path, ends up over-escalating routine, easily-fixed ambiguities to a human reviewer or under-escalating genuinely wrong extractions that a downstream system then acts on as if they were correct. A confidence signal worth building deliberately into the pipeline, rather than trusting the model's own stated confidence at face value, is cross-checking extracted values against constraints the source document itself implies (a line-item total against a stated grand total, a date against a plausible range for the document type), and routing only the extractions that fail those checks to review, rather than sampling review targets at random or reviewing everything.

## 7\. Worked example: an invoice schema that failed silently

An invoice-extraction pipeline used a schema with a `total` field typed as a string, initially chosen because invoice totals appear in inconsistent formats across vendors, some with currency symbols, some with different decimal conventions. The schema validated every response as syntactically correct, because any string satisfies a string field, and for months the pipeline reported a clean extraction rate with no validation failures at all. The actual problem surfaced downstream, in accounting, when a batch of totals turned out to have been extracted with the wrong decimal placement on invoices from one particular vendor whose format the model had been silently misreading, with nothing in the extraction pipeline itself ever flagging it, because a string field has no concept of what a plausible invoice total looks like.

The fix split the field: a numeric `total_amount` and a separate `currency` field, with the numeric field validated against a semantic check, does it fall within a plausible range for this vendor's typical invoice size, and does it reconcile against the sum of the extracted line items, rather than relying on the schema's type system to catch a class of error the type system was never positioned to catch. This is the general shape of the lesson: a schema that validates cleanly is evidence the response has the right shape, and specifically not evidence the values inside it are correct, and conflating the two is exactly what let this failure run silently for as long as it did.

This pairs with [guardrails architecture](/claude-architecture/guardrails-architecture-validating-claude-outputs) for the broader pattern of validating a model's output outside the model itself, and with [claude tool use and function calling](/claude-architecture/claude-tool-use-and-function-calling) for the underlying mechanism a forced-tool-call extraction schema is built on.
