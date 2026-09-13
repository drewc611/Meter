---
date: '2026-09-08'
category: tools
title: 'OpenAI ships ChatGPT Images 2.5, cutting generation latency up to 50%
  and adding a sketch-to-image tool'
dek: >-
  The update ships two new API models -- Flare and Sunburst -- and rolls out
  to every ChatGPT tier, including free accounts, rather than being reserved
  for paid plans.
sources:
  - label: 'OpenAI releases ChatGPT Images 2.5 with "sharper details" and "more precise editing" — 9to5Mac (Zac Hall)'
    url: 'https://9to5mac.com/2026/09/08/openai-releases-chatgpt-images-2-5-with-sharper-details-and-more-precise-editing/'
---
OpenAI released ChatGPT Images 2.5 on September 8, an update to its in-app image generator that the company says "reduced image generation latency by up to 50% compared with Images 2.0." Beyond speed, OpenAI is claiming sharper detail, more natural lighting and texture, better preservation of subjects pulled from reference photos, and more reliable instruction-following across multiple rounds of edits in the same conversation.

## What's new beyond the speed claim

The headline addition is Sketch, a tool that turns a drawing made directly inside ChatGPT into a reference image the model then builds from -- a workflow that didn't exist in the 2.0 generation. OpenAI paired it with new templates for common image formats, inline comments on generated images, and a prompt-sharing feature that lets one user's prompt be picked up and reused by others. On the developer side, the release ships two API models: GPT-Image-2.5 Flare, the default, optimized for the lower latency figure OpenAI is advertising, and GPT-Image-2.5 Sunburst, which trades generation time for more precise editing control.

## Rolling out to free accounts, not gated behind Pro

Images 2.5 is available now across ChatGPT, ChatGPT for work, and inside Codex, on web, desktop and mobile -- and, notably, across every ChatGPT plan rather than held back for paying subscribers first. That's a different rollout pattern than OpenAI's other major release this month: GPT-6 Astra, which launched September 3 and whose demand OpenAI says has since forced it to pause new sign-ups to the $200 Pro tier entirely. Shipping a flagship image upgrade to free users the same week compute is tight enough to close a paid tier suggests OpenAI is treating image generation and Astra's heavier compute-use features as separate capacity pools, not competing for the same constrained resource.
