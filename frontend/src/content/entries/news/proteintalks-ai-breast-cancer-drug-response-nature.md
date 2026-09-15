---
date: '2026-09-15'
category: research
title: 'An AI model trained on 38 million protein measurements predicts which cancer drugs will actually work'
dek: >-
  Published in Nature on September 9, the ProteinTalks model from Westlake
  University correctly predicted responses to 81 anticancer compounds it had
  never seen and flagged drug pairs stronger together than alone.
sources:
  - label: 'An operational perturbation proteomics-based virtual cell model — Nature (Westlake University research team; DOI: 10.1038/s41586-026-11001-9)'
    url: 'https://www.nature.com/articles/s41586-026-11001-9'
  - label: 'AI virtual cell uses protein dynamics to predict personalized breast cancer treatments — Medical Xpress (Sanjukta Mondal)'
    url: 'https://medicalxpress.com/news/2026-09-ai-virtual-cell-protein-dynamics.html'
---
A team led by proteomics researcher Tiannan Guo at Westlake University in Hangzhou published a study in Nature on September 9 describing ProteinTalks, an AI model that predicts whether a given drug will work against a specific cancer cell line by tracking how its proteins change over time after treatment -- rather than relying on static gene-activity snapshots, the approach most existing models use.

## How it was trained, and what it got right on unseen data

The team treated 18 breast cancer cell lines -- 16 of them triple-negative -- with 63 FDA-approved anticancer drugs and 59 drug combinations, measuring more than 38 million data points across 5,585 proteins at baseline and at 6, 24, and 48 hours after treatment. Tested against 81 anticancer compounds it had never seen during training, ProteinTalks accurately predicted drug response and surfaced four drug pairs that performed better together than either did alone against triple-negative breast cancer -- the subtype with the fewest targeted-therapy options. The model also flagged AKR1C3 as a driver of resistance to docetaxel, a standard chemotherapy drug; knocking the protein down in follow-up experiments restored the cells' sensitivity to the drug.

## Generalizing past breast cancer, and into patient outcomes

The model's predictions held up when applied to lung, colorectal, pancreatic, and melanoma cell lines beyond the breast-cancer data it was trained on, and the team used it to split 501 triple-negative breast cancer patients into groups with distinct recurrence and survival outcomes -- a step toward using the model on tissue samples rather than only cultured cell lines. It's a narrow, single-cancer-type application rather than a general-purpose "virtual cell," but it's a rare case of that kind of model being tested against real, held-out clinical outcomes rather than just other benchmarks.
