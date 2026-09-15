---
date: '2026-09-15'
category: research
title: A 143-author paper says AI agents now write most of a frontier model's own code -- but not the decisions
dek: >-
  Shanghai AI Laboratory released the open-weight Atria Dawn Preview alongside
  a study of its own development process, finding participants rated a third
  of AI-assisted tasks impossible without AI, while humans kept final say.
sources:
  - label: 'Atria Dawn: The Dawn of Agentic Superintelligence — arXiv (Honglin Guo, Tao Gui, Yicheng Chen, Guanting Dong, Qiming Ge, and 138 others)'
    url: 'https://arxiv.org/abs/2609.15818'
  - label: 'atria-asi/Atria-Dawn-Preview — Shanghai Artificial Intelligence Laboratory (GitHub, model release)'
    url: 'https://github.com/atria-asi/Atria-Dawn-Preview'
---
Shanghai AI Laboratory released Atria Dawn Preview on September 15 -- a 744-billion-parameter open-weight agentic model under an MIT license, post-trained on top of Zhipu's GLM-5.2 foundation -- alongside a 143-author arXiv paper that reads less like a model card and more like a study of the lab's own workflow while building it. The model is trained via what the paper calls a "Verifiable Experience Pipeline," which ties tool-mediated interactions to executable environments and externally verified outcomes rather than static preference data. Across 16 benchmarks spanning research, engineering, and digital work, the paper reports Atria Dawn Preview is competitive with frontier agents and posts the highest reported score on five of them.

## What the paper actually measured

The more unusual part of the release is a labor study bolted onto the model card: the team logged 769 task records from 56 participants alongside the agent's own logs, then had participants evaluate the completed work under comparable conditions. Roughly a third of completed AI-assisted tasks were rated infeasible without AI. The paper's own gloss on the division of labor is direct: agents "frequently propose methods and implement revisions, while humans retain most final decisions." The authors describe this as a shift from task-level execution to project-level partnership, with human effort concentrating on what's worth pursuing rather than on execution itself.

## Why the caveat matters

The paper doesn't stop at the capability claim -- it also argues that autonomy and human oversight need to scale together, not trade off against each other, so that accountable human authority over the risks and direction of the work doesn't shrink as the agents' share of it grows. That's a research lab publishing evidence of its own agents doing a growing share of the actual research work, then arguing in the same breath for why the human sign-off step can't shrink alongside it -- a tension that's becoming the live question at every lab shipping agentic coding and research tools, not just this one.
