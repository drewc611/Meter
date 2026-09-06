---
date: '2026-08-23'
category: research
title: >-
  DARPA and the Air Force flew an F-16 under AI control, with a human able to
  take back the stick instantly
dek: >-
  The VENOM program converted a standard combat-fleet F-16 to autonomous
  control, tested at Eglin Air Force Base in June 2026 -- notable less for the
  flight itself than for the human-on-the-loop switch that makes it reversible.
sources:
  - label: >-
      DARPA, U.S. Air Force fly AI-controlled F-16 — DARPA (official press
      release)
    url: 'https://www.darpa.mil/news/2026/darpa-us-air-force-fly-ai-controlled-f-16'
  - label: >-
      After Surviving a Dogfight in a Test Aircraft, DARPA's VENOM AI-Controlled
      Pilot Just Flew a Modified Combat-Style F-16 — The Debrief
    url: >-
      https://thedebrief.org/after-surviving-a-dogfight-in-a-test-aircraft-darpas-venom-ai-controlled-pilot-just-flew-a-modified-combat-style-f-16/
---
DARPA disclosed on July 16, 2026 that it and the U.S. Air Force had flown an F-16 under AI control at Eglin Air Force Base, part of the VENOM program (Viper Experimentation and Next-generation Operations Model) -- flight operations were conducted the previous month, in June 2026.

## What makes this one different from a demo jet

The aircraft is a standard, operational-fleet F-16, not a purpose-built experimental airframe -- the point being that ordinary combat aircraft can be converted to carry autonomy, not that DARPA needed to build something exotic to prove the concept. Program manager Brig. Gen. James Valpiani said the team "automated flight controls and sensors on a standard F-16 without changing the jet's core software."

## The part that actually matters: the switch

The VENOM Autonomy Kit lets a human pilot toggle between manual and AI control with a physical switch flip -- "human-on-the-loop," in DARPA's own framing, not fully autonomous and unsupervised. That's the detail worth sitting with more than the flight itself: the control boundary between the AI system and the consequential action (flying a combat aircraft) isn't a policy document or a training assumption, it's a hardware-level, instantly reversible handoff. That's the same shape of control this site's own guides argue for in far lower-stakes settings -- a real, verifiable boundary between an agent's reasoning and its ability to act, not a boundary that exists only until something goes wrong.

It's a useful contrast to the Claude/GPT test-environment breach story covered here in August: that failure happened because a network-access boundary was assumed rather than verified. VENOM's human-on-the-loop switch is what it looks like when a team builds the boundary as an explicit, tested mechanism instead.
