---
date: '2026-09-03'
category: research
title: Google's WeatherNext 3 trades physics-model inputs for hourly satellite feeds
dek: >-
  The new model updates its own forecast every hour instead of every six, and
  DeepMind says precipitation accuracy is up to 60% better against NASA
  satellite measurements -- with an outside evaluator, not just Google, checking
  the claim.
sources:
  - label: >-
      Introducing WeatherNext 3, our most advanced and accurate global weather
      AI model — Google
    url: >-
      https://blog.google/innovation-and-ai/models-and-research/google-deepmind/introducing-weathernext-3/
  - label: >-
      Google's latest AI weather model gives you no excuse to forget your
      umbrella — TechCrunch
    url: >-
      https://techcrunch.com/2026/09/03/googles-latest-ai-weather-model-gives-you-no-excuse-to-forget-your-umbrella/
---
Google DeepMind and Google Research released WeatherNext 3 on September 3, 2026, now feeding directly into Google Search, the Gemini app, Google Maps, the Maps Platform Weather API, and Google Earth Engine. Per Google's own announcement, the model's central change is its input data: rather than relying only on the periodic physics-simulation snapshots prior versions used, WeatherNext 3 ingests real-time geostationary satellite imagery on a one-hour update cycle, and produces forecasts on the same hourly cadence -- a six-fold jump in refresh frequency over WeatherNext 2's six-hour cycle. Resolution for core surface variables like temperature and moisture also jumped to 5km, from 25km, which Google describes as roughly five times sharper.

## An outside check on the accuracy claim

Google's own figures are specific: up to 60% improvement in a standard precipitation-accuracy score (CRPS) against NASA's IMERG satellite precipitation data, 30% against MRMS ground-radar data, and 10% against rain-gauge measurements at short lead times, with Google explicitly noting the largest gains land in Latin America, Africa, and Asia-Pacific -- regions where ground weather-station coverage is thinnest and forecasting has historically been weakest. Rather than resting only on its own numbers, Google's announcement points to independent live evaluations run by Brightband, an outside atmospheric-science group, as the accuracy check.

TechCrunch's Tim Fernholz separately reports that WeatherNext 3 posts the top score on Operational WeatherBench, ahead of competing models from Microsoft, Nvidia, and the European Centre for Medium-Range Weather Forecasting. DeepMind staff research scientist manager Ferran Alet told TechCrunch: "Weather is chaotic, and so small differences really start to perturb massively" -- the reasoning, per Alet, for why a machine-learning approach fits a problem that's fundamentally about extracting patterns from incomplete, noisy physical data.

The detail worth noting is the sourcing structure, not just the benchmark score: DeepMind is citing an outside evaluator's live testing rather than asking readers to take a self-reported number on faith. That's a small but real distinction -- a vendor benchmark graded by the vendor tells you less than the same claim checked by someone with no stake in the result.
