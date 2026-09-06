---
date: '2026-08-22'
category: regulation
title: 'Anthropic is watermarking Claude''s text output, starting in the EU'
dek: >-
  New Claude models launched in the EU from August 2, 2026 embed an invisible,
  detectable pattern in generated text -- Anthropic's answer to the EU AI Act's
  AI-content-labeling requirement.
sources:
  - label: >-
      Anthropic shares more details about how Claude's new watermarks will work
      — TechCrunch
    url: >-
      https://techcrunch.com/2026/08/15/anthropic-shares-more-details-about-how-claudes-new-watermarks-will-work/
---
The EU AI Act's transparency obligations for general-purpose models with systemic risk started being enforced on August 2, 2026, with real teeth: the European Commission can request information, evaluate a model directly, order mitigations, restrict availability, or fine a company up to 3% of its worldwide annual turnover. One of the obligations is marking AI-generated content as such. Anthropic's answer, for new Claude models shipped in the EU from that date, is a watermark baked into the text itself.

## How it actually works

Anthropic is using SynthID Text, a method Google DeepMind published in 2024. It doesn't add visible markup -- it steers Claude's low-stakes word choices (picking "overcast" over "grey," for instance) into a pattern that's undetectable to a reader but recoverable by anyone holding the matching key. A detection API is coming. Anthropic's own framing of the limits is unusually direct: light editing survives, but "a complete rewrite where every word is replaced" removes it -- at which point, they note, it's fair to ask whether the output is still meaningfully AI-generated at all. Code is barely touched, since functional correctness leaves little room for the arbitrary word choice the watermark depends on; if it shows up anywhere, it's in a comment.

## The part worth noting for a governance-minded reader

This is a compliance answer to a real legal requirement, not a content-detection product aimed at catching misuse -- it's easy to strip with enough rewriting, and Anthropic says so plainly rather than overselling its robustness. That's the same posture this site keeps trying to apply to its own claims: a control that's honest about its own limits is more useful than one oversold as airtight. Whether "can this text be traced back to a model" ends up mattering for your own organization depends entirely on what you're using generated text for -- worth a real answer, not an assumed one, before treating this as either a solved problem or a non-issue.
