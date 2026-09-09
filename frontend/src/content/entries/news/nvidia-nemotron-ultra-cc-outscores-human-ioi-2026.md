---
date: '2026-09-02'
category: research
title: >-
  Nvidia says its Nemotron-3-Ultra-CC model outscored the top human at the 2026
  Olympiad in Informatics
dek: >-
  Running live under the same no-internet, local-execution rules as the
  teenagers competing against it, the 550-billion-parameter system posted 535.4
  out of 600 -- above both the gold-medal cutoff and the top human score. The
  claim comes from Nvidia's own unreviewed preprint, with almost no independent
  verification yet.
sources:
  - label: >-
      Post-Training Language Models for Gold-Medal Performance in Coding
      Competitions — arXiv (Ficek, Narenthiran, Samadi, Majumdar, Ginsburg;
      NVIDIA)
    url: 'https://arxiv.org/abs/2609.02849'
---
Nvidia researchers posted a paper on arXiv on September 2, 2026 claiming that a competition-tuned version of their Nemotron 3 Ultra model, called Nemotron-3-Ultra-CC, outscored every human contestant at the 2026 International Olympiad in Informatics (IOI). Run live under the same constraints as the teenage competitors it was up against -- no internet access, submissions judged locally, the same time limits -- the system scored 535.4 out of 600, clearing both the contest's own gold-medal threshold of 361.12 and the top human score of 498.27.

## A different model, a different competition

This isn't the same system as "Nemotron-Cascade," the separate Nvidia model line associated with earlier work around the International Mathematical Olympiad -- Nemotron-3-Ultra-CC is a distinct, newer system (550 billion total parameters, 55 billion active) built on Nvidia's Nemotron 3 Ultra base model, and IOI is a programming contest, not a math one. The paper credits most of the gain to GenCorrect, a test-time strategy that generates, checks, and revises candidate solutions using the contest's own automated judge as feedback -- the authors write it's "the first AI system to outscore the highest-scoring human contestant on an IOI problem set."

## Worth flagging: this is Nvidia grading its own model

The paper hasn't been peer reviewed, it's Nvidia's own team publishing a claim about Nvidia's own model, and as of this writing the only outside discussion of it found is a single automated analysis blog -- no mainstream tech outlet had covered it independently at the time of writing. None of that makes the arithmetic wrong; IOI's scoring is a hard, objective pass/fail judge, which is exactly the kind of result that's easy for someone else to check. It does mean the "first to beat a human" framing should be read as the authors' own claim about their own system until someone outside Nvidia verifies it.

That last point is close to the whole reason Merit AC's own Tier 3 -- sampled human grading of AI output -- is deliberately left stubbed rather than faked: a benchmark with a built-in, objective judge, like a compiler or a contest's automated grader, is the rare case where a vendor's claim about its own model is directly checkable by someone else. Almost none of the AI work an organization actually pays for looks like that. IOI has a compiler; a quarterly report or a customer email doesn't -- which is exactly why a company's own AI spend can't be graded by extrapolating from a coding-contest score, no matter how real that score turns out to be.
