---
title: 'Multimodal architecture: vision and documents with Claude'
description: >-
  Images and PDFs are first-class input, not a side channel bolted onto text
  — what vision is actually reliable at, what a PDF's layout adds over a
  plain-text extraction, and the real token cost of sending an image at all.
kicker: Guide · application architecture
lead: >-
  Treating an image or a PDF as something to convert into text before it ever
  reaches the model throws away information a vision-capable model can use
  directly — table structure, a chart's shape, where something sits on a
  page. Treating every image as a costless drop-in for a well-designed
  text pipeline ignores a real, per-request token cost that scales with what
  you send. The design question is which of the two failure directions a
  given input actually risks.
wide: true
tileMeta: 'What vision is actually reliable at, PDF layout as real signal, and the token cost of an image'
---
## 1\. Images and PDFs as first-class input

A vision-capable model doesn't need a document converted to plain text before it can reason about it; it can be given the image or PDF directly and reason over what's actually on the page, layout included. That matters because a plain-text extraction step run ahead of the model necessarily discards something: a table's row-and-column structure collapses into a sequence of tokens with the spatial relationship between a label and its value no longer explicit; a chart becomes, at best, a caption someone wrote, if there was one at all. Sending the actual image or PDF page keeps that structure available to the model's own reasoning rather than depending on a separate extraction step to have preserved (or correctly reconstructed) it beforehand.

## 2\. What vision is actually good at, and what it isn't

Reading structured or semi-structured visual content, a chart's approximate shape and labeled values, a screenshot of a UI element, a form's layout and filled-in fields, a photograph of a whiteboard, is a genuine strength, and it's the case that justifies sending an image directly rather than routing around it with a separate extraction tool. What vision is not reliably good at is anything that requires exact, pixel-level measurement rather than visual interpretation: reading a precise numeric value off a densely packed, low-resolution chart where the actual data point sits between gridlines, or transcribing very small or degraded text with zero tolerance for error, are tasks where the model's visual interpretation is doing real work and isn't a substitute for the underlying numeric data if that data is available in a more exact form elsewhere.

The practical implication is to prefer sending the underlying data directly, a table's actual values, a chart's source numbers, when that data exists and precision matters, and to reserve vision for the case it's actually suited to: interpreting visual content where no exact underlying data exists at all, or where the visual layout itself, not just the values it displays, is part of what needs to be understood.

## 3\. PDFs specifically: layout is signal, not noise

A PDF converted through a naive text-extraction library routinely scrambles a multi-column layout, interleaving text from two columns in reading order that makes sense to the extractor's left-to-right scan and no sense to a human or a model reading the result, and a table's cell boundaries, meaningful because a value's cell tells you which row and column it belongs to, disappear entirely into a flat stream of tokens with the structure that gave them meaning gone. Sending the PDF directly lets the model use the actual rendered layout, tables read as tables, columns read in the right order, headers and footers recognized as what they are rather than injected mid-paragraph, which a naive text extraction step has already lost by the time its output reaches the model.

This is the concrete argument for treating a PDF as a distinct capability from "extract the text, then treat it like any other text input": the cases that matter most, dense tables, multi-column layouts, forms, are exactly the cases a naive extraction handles worst, and exactly the cases where preserving the original layout for the model to read directly has the most to offer over a lossy text-first pipeline.

## 4\. The real token cost of an image

An image is not free to include just because it's convenient to attach; it consumes a real number of tokens that scales with the image's resolution and dimensions, the same way a large block of text does, and a request that attaches several full-resolution images, or unnecessarily high-resolution ones for content that didn't need that much detail, pays a real, and sometimes substantial, cost in context budget and processing time for resolution the task never actually needed. This is the same discipline [context engineering](/guides/context-engineering) argues for tool results generally, applied to images specifically: an image included because it might be relevant competes for space and attention against everything else in the request, and that cost is worth weighing deliberately rather than treated as free because attaching a file feels lightweight from the caller's side.

The practical mitigation is resizing or cropping images to the resolution the task actually needs before sending them, a full-page screenshot when only one region is relevant, a high-resolution scan when a lower-resolution version would read just as reliably, rather than defaulting to whatever resolution the source happened to be captured at.

## 5\. Where OCR-first still wins

Vision handling a document directly is not a strictly better replacement for a dedicated OCR pipeline in every case, and the cases where a pre-OCR step still earns its keep are specific: extremely high-volume pipelines where the marginal cost of vision processing on every single document, multiplied across a very large volume, meaningfully exceeds the cost of a cheaper, purpose-built OCR pass followed by a much smaller text-only model call; and cases with a hard, auditable requirement for exact character-level transcription, where a dedicated OCR engine's confidence scores per character give a verifiable signal a vision model's interpretation doesn't provide in the same explicit form.

The decision isn't "vision replaces OCR" so much as which failure mode a given pipeline can least afford: a pipeline that can tolerate occasional interpretive imprecision in exchange for understanding layout and structure directly is well served by vision; a pipeline built around a strict character-level accuracy requirement, or one operating at a volume where per-document cost dominates the economics, still has a real case for a traditional OCR-first design, with the model reasoning over the resulting text rather than the raw image.

## 6\. Combining vision with tool use

A vision-capable turn composes directly with tool use: a model reading a scanned form can extract a customer ID from the image and then call a tool to look up that customer's account, or read a chart in a screenshot and call a tool to fetch the underlying dataset the chart was likely generated from, in the same agentic loop [building agents with Claude](/claude-architecture/building-agents-with-claude-the-agentic-loop) describes for text-only tool use. Nothing about the loop mechanics changes because the input that triggered a given tool call happened to be visual rather than textual; the image is simply one more piece of content in the context the model reasons over when deciding what to do next.

## 7\. Worked example: a scanned-invoice pipeline

An accounts-payable pipeline processes scanned vendor invoices at moderate volume, a few hundred a day, arriving in inconsistent formats across dozens of different vendors, each with its own layout, no shared template. A naive OCR-first design, running a general OCR pass and then feeding the resulting flat text to an extraction step, performs unevenly across vendors specifically because invoice layouts vary so much: a vendor whose totals sit in a table with the label in one column and the value in an adjacent one is exactly the case a flat, layout-blind text extraction handles worst, since the row-column relationship that tells a reader which value belongs to which label is gone by the time the model sees it.

The fix sends the invoice image directly to a vision-capable extraction call instead, with a schema (see [structured data extraction](/claude-architecture/structured-data-extraction-pipelines)) defining exactly the fields to pull, letting the model use the actual visual layout, a total sitting in the row labeled "Total," a line-item table with clearly bounded columns, to disambiguate exactly the cases a layout-blind pipeline was getting wrong. Images are resized to a resolution that keeps text legible without sending unnecessarily large source scans, keeping the per-invoice token cost bounded even as volume scales, and a small number of vendors whose invoices are dense, small-print, high-volume forms with strict character-level accuracy requirements stay on a separate, dedicated OCR path where that specific guarantee matters more than layout understanding does.

This pairs with [structured data extraction](/claude-architecture/structured-data-extraction-pipelines) for the schema and validation layer a vision-based extraction still needs downstream, and with [context engineering](/guides/context-engineering) for the general discipline of treating every piece of input, image included, as something that has to earn its place in the context budget.
