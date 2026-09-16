---
date: '2026-09-14'
category: product
title: 'Apple ships its rebuilt Siri, running partly on custom Google Gemini models'
dek: >-
  iOS 27''s English-only Siri AI beta splits work between on-device
  processing and Apple''s Private Cloud Compute, with the heaviest reasoning
  routed to Apple Foundation Models built in collaboration with Google.
sources:
  - label: 'Siri AI, a profoundly more capable and personal assistant, is here -- Apple (official newsroom)'
    url: 'https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/'
  - label: 'Apple opens its new Siri AI to everyone with the iOS 27 public beta -- TechCrunch (Sarah Perez)'
    url: 'https://techcrunch.com/2026/07/14/apple-opens-its-new-siri-ai-to-everyone-with-the-ios-27-public-beta/'
---
Apple announced on September 14 that Siri AI -- the rebuilt assistant it previewed at WWDC in June -- is now rolling out in beta, in English only, across iOS 27, iPadOS 27, macOS 27, watchOS 27 and visionOS 27. French, Japanese, Korean, Portuguese and Spanish support is due the following month; the EU and China are excluded from this initial rollout. Apple's own announcement describes the result as "a profoundly more capable and conversational assistant" with personal-context understanding, broad world knowledge and on-screen awareness.

## The Google piece

The architecture is the more unusual part of this launch for a company that has spent years building its "Apple Intelligence" pitch around doing everything on-device. Apple's newsroom post says the new generation of Apple Foundation Models was "custom-built in collaboration with Google and its Gemini models" -- a partnership Apple first confirmed at WWDC and is now shipping. Processing is split three ways: simple requests stay entirely on-device, moderately complex ones route to Apple's own Private Cloud Compute servers, and the heaviest reasoning tasks are handed off to the Google-trained models.

TechCrunch's earlier coverage of the July developer/public beta rollout for the same feature set noted Apple was opening the assistant to "everyone" well ahead of today's wider release, suggesting Apple used the summer beta cycle specifically to stress-test the Gemini-trained tier before today's broader English launch.

## Why the split matters

Apple is, in effect, running a live experiment in cost and latency tradeoffs at consumer scale: which queries are cheap enough to keep on-device, which justify Apple's own cloud compute, and which are worth paying Google to answer. That's the same tradeoff -- cost per query weighed against output quality -- that shows up in miniature every time an enterprise decides which model tier to route a given task to, the exact decision Factory's own "router" product (covered separately) is built to automate.
