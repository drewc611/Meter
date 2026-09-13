---
date: '2026-09-08'
category: research
title: 'Google DeepMind publishes a 1-petabyte map predicting how every possible
  single-letter DNA change affects the genome'
dek: >-
  AlphaGenome Atlas covers roughly 9 billion possible single-nucleotide
  variants across the human genome, free for academic use, and DeepMind says
  it's more than 30 times the size of the AlphaFold Database.
sources:
  - label: 'AlphaGenome Atlas: A predictive map of every possible DNA letter change in the human genome — Google DeepMind (official blog)'
    url: 'https://deepmind.google/blog/alphagenome-atlas-a-predictive-map-of-every-possible-dna-letter-change-in-the-human-genome/'
---
Google DeepMind published AlphaGenome Atlas on September 8, a free public database of AI-generated predictions covering roughly 9 billion possible single-nucleotide variants -- every possible single-letter change -- across the human genome. DeepMind calls it "the most comprehensive catalogue of how genetic mutations affect molecular biology" available to researchers, and the dataset is large enough to notice on its own terms: about 1 petabyte, more than 30 times the size of DeepMind's AlphaFold Database.

## What's actually in the atlas

For each of those billions of variants, the atlas provides thousands of molecular-effect predictions spanning multiple cell types and tissues, plus a combined AlphaGenome Variant Impact (AVI) score that merges output from DeepMind's AlphaGenome and AlphaMissense models into a single ranking. Critically, DeepMind says the predictions cover both the roughly 2% of the genome that codes for proteins and the remaining 98% that doesn't -- the non-coding regions where a mutation's effect on gene regulation is far harder to interpret from sequence alone, and where most existing prediction tools are weakest.

## Who it's built for

DeepMind is positioning the atlas as a triage tool rather than a diagnostic one: a way for researchers to rank candidate variants by predicted impact before committing to lab validation, aimed specifically at rare-disease research where a patient's causal mutation often sits in a non-coding region no existing catalogue scores well, and at population studies looking for rare non-coding variants tied to common traits or protein levels. Access is through a public web portal, free for academic use -- the kind of open-access research infrastructure play that, unlike a model launch, won't show up in a benchmark chart but could show up years from now in how fast a rare-disease diagnosis gets made.
