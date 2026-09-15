---
date: '2026-09-10'
category: product
title: OpenAI puts its full-duplex voice model in the API at 5 cents a minute
dek: >-
  GPT-Live-1, the model behind ChatGPT's voice mode, is now available to any
  developer building a voice agent -- with telephony support and a claimed
  cut in turn-taking latency to under a second.
sources:
  - label: 'Build more natural voice experiences with GPT-Live-1 in the API — OpenAI Developer Community (official announcement)'
    url: 'https://community.openai.com/t/introducing-gpt-live-1-in-the-api/1396471'
  - label: 'GPT-Live-1 model reference — OpenAI API docs'
    url: 'https://developers.openai.com/api/docs/models/gpt-live-1'
---
OpenAI opened up GPT-Live-1 to developers on September 10, bringing the full-duplex voice model that powers ChatGPT's voice mode into the API for the first time. The pitch is architectural as much as commercial: instead of the usual three-stage pipeline -- speech-to-text, a language model, text-to-speech -- GPT-Live-1 listens and speaks through a single model, which is what lets it handle interruptions and backchannels without the awkward wait-for-silence turn-taking of older voice bots. Pricing is $0.05 per minute for the voice layer, billed per second, with backend model and tool usage billed separately.

## What changed from the last generation

OpenAI's own numbers put the gap versus its prior real-time model, GPT-Realtime-2.1, at 0.798 seconds of turn-taking latency versus 1.41 seconds, 87% tool-calling success against a lower baseline, and 83.6% completion on the Tau3 customer-support benchmark suite. The API ships with 12 voices and three connection paths -- WebRTC for browsers, WebSockets for server-side audio, and telephony/SIP for phone-based agents -- plus system-prompt control over tone, pace, and conversational style, which is the piece that actually determines whether a shipped voice agent sounds like a script or a person.

## Why this is a product move, not just a model drop

The distinction OpenAI is drawing is between the voice layer and the reasoning underneath it: GPT-Live handles the live conversation while handing off deeper reasoning or agentic steps to whichever backend model and tool harness the developer wires up. That's a deliberate decoupling -- it lets OpenAI sell the conversational interface layer independent of which model is doing the thinking, and it's the same interface now reachable through third-party voice infrastructure like LiveKit and Twilio rather than only inside ChatGPT.

For any org already running a voice AI vendor bill, the number to watch isn't the sticker price -- it's the backend token spend GPT-Live now hands off mid-call, which is exactly the kind of usage that's easy to provision and hard to attribute back to a team without something reading the proxy logs.
