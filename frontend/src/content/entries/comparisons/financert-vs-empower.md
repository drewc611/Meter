---
title: 'Financert vs. Empower'
description: >-
  Empower's free dashboard benchmarks your net worth against its own users,
  by age -- and says plainly that this isn't the same as the Federal
  Reserve's representative national data. Financert benchmarks your asset
  allocation against that Federal Reserve data directly, by wealth
  percentile, without asking you to link a single account.
kicker: Comparison · personal finance
lead: >-
  Empower is free, well-known, and genuinely useful for the thing it does:
  aggregate your linked accounts into one net-worth chart. But its own
  benchmark data is its own user base, not the Federal Reserve's — a
  distinction it states outright. Financert benchmarks against the real
  Federal Reserve numbers, by asset-allocation percentile tier, self-hosted,
  with no account linking required.
tileMeta: 'Own-user-base benchmarking vs. real Federal Reserve percentile-tier data, no account linking'
---

[Empower](https://www.empower.com/) (formerly Personal Capital) is a genuinely useful free tool: link your accounts and it aggregates them into one net-worth chart with a "net worth by age" comparison. It's worth being precise about what that comparison actually is, though — Empower's own content describes it as built from Empower's own user base, and states directly that these figures "are not identical to, nor directly comparable with, representative national data from the Survey of Consumer Finances from the Federal Reserve." Its paid wealth-management tier is a different product entirely, requiring a $100,000 minimum in investable assets and charging roughly 0.89% of assets under management on the first $1M (per third-party fee trackers, stepping down at higher tiers) — a real financial advisory service, not a benchmarking feature.

## What Empower gets right

Empower's core dashboard is free with no catch for the tracking itself, and account linking means your net-worth chart updates itself once — for someone willing to hand over bank and brokerage credentials, that's real convenience Financert doesn't try to replicate. If what you want is "my net worth over time, automatically," Empower does that well.

## Where Financert differs

Financert answers a narrower, more specific question: not "what's my net worth" but "how does my asset *allocation* compare to households at my actual wealth level" — using the Federal Reserve's own [Distributional Financial Accounts](https://www.federalreserve.gov/releases/z1/dataviz/dfa/) data, broken into five tiers from the top 0.1% down to the bottom 50%, validated against the Fed's own published totals on every refresh. That's the same government data Empower's own team draws on for its published research content, not a separately-sourced number — the difference is that Financert puts the actual percentile-tier breakdown in front of you directly, rather than a same-user-base age comparison.

The mechanics differ just as much. Financert doesn't ask you to link any account — you enter what you hold by asset class, and everything lives in your own self-hosted SQLite database behind a bearer token you set, not a hosted account with your credentials on file anywhere. It works with no network connection at all, ships in six languages including full right-to-left support for Arabic, and exposes an MCP server so an AI assistant like Claude can answer "how does my portfolio compare to the top 1%?" directly against your own data. It's also explicit about its limits: it reports what the data says, not investment advice — copying the top 1%'s allocation wouldn't reproduce their returns, since a sixth of their assets is equity in businesses they personally run, not a portfolio move anyone else can replicate.

If automatic account aggregation into a net-worth number is what you want, Empower's free tier does that well. If the question is specifically "how does my allocation compare to real households at my wealth level," Financert is built to answer exactly that, with real government data and nothing to link.
