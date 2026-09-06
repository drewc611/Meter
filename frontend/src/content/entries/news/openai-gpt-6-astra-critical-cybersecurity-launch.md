---
date: '2026-09-03'
category: product
title: >-
  OpenAI launches GPT-6 Astra, its first model rated 'Critical' for
  cybersecurity capability
dek: >-
  The rollout starts with vetted defenders in OpenAI's Daybreak program before
  reaching ChatGPT and the API -- a distinct, later milestone from the Astra
  math-proof preview this site covered in August, and OpenAI's own safety
  materials admit the model is also harder to monitor than its predecessor.
sources:
  - label: 'Deployment safety: GPT-6 Astra — OpenAI (official)'
    url: 'https://deploymentsafety.openai.com/gpt-6-astra'
  - label: >-
      OpenAI debuts GPT-6 Astra, says it triggered security measures — NBC News
      (Jared Perlo)
    url: >-
      https://www.nbcnews.com/tech/tech-news/openai-debuts-gpt-6-astra-security-measures-rcna595940
  - label: >-
      'Welcome to the AGI era': OpenAI launches GPT-6 Astra — VentureBeat (Carl
      Franzen)
    url: >-
      https://venturebeat.com/technology/welcome-to-the-agi-era-openai-launches-gpt-6-astra
---
OpenAI released GPT-6 Astra on September 3, 2026, rolling it out first to organizations in Daybreak, its vetted cybersecurity-defender program, before opening it to ChatGPT Plus, Pro, Business, and Enterprise users, the API, and cloud platforms including AWS and Azure over the following days. Per OpenAI's own deployment-safety documentation, Astra is the first model the company has ever classified as reaching "Critical" under its Preparedness Framework's cybersecurity category -- its highest capability tier.

## What crossing that line actually restricts

OpenAI's own framing is blunt about what the classification means: with the right tools and access, the model "can find previously unknown security flaws and develop new ways to exploit them," largely without step-by-step human direction. In practice that means Astra currently refuses to generate proof-of-concept exploits outside Daybreak, and OpenAI says it plans to loosen those restrictions gradually as it expands vetted access, rather than opening the capability broadly on day one.

## Not the Astra story this site already ran

This is a different milestone from the one this site covered in August, when an internal Astra research preview produced ten machine-checked math proofs for about $2,000 in compute -- that was a research-capability teaser; this is the actual model launch, with the cybersecurity classification as its headline safety fact rather than a footnote.

OpenAI's own safety materials pair the capability jump with an uncomfortable admission: Astra's monitorability -- how well its reasoning can be observed for warning signs -- has decreased relative to its predecessor, even as its raw capability went up. Chief scientist Jakub Pachocki put a line on that trade-off: "we will not accept the degradation in our ability to monitor model alignment." That's the exact tension Merit AC's own scoring keeps running into on a much smaller scale -- a system getting more capable doesn't automatically mean it's getting easier to verify, and a benchmark score alone can't tell an organization which side of that trade a given deployment landed on.
