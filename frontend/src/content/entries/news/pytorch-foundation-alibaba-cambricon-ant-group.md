---
date: '2026-09-08'
category: tools
title: Alibaba Cloud and Cambricon join the PyTorch Foundation as Platinum members
dek: >-
  Ant Group joins at the Gold tier, and the two Platinum members each get a
  seat on the Foundation's governing board and technical advisory council --
  a formal stake for three of China's largest AI infrastructure players in
  a framework most of the industry already depends on.
sources:
  - label: >-
      Alibaba Cloud, Ant Group, Cambricon and Huawei Come Together in Shanghai
      to Advance the Open Source AI Stack at PyTorch Conference China —
      PyTorch Foundation (official)
    url: >-
      https://pytorch.org/blog/alibaba-cloud-ant-group-cambricon-and-huawei-come-together-in-shanghai-to-advance-the-open-source-ai-stack-at-pytorch-conference-china/
  - label: >-
      Alibaba Cloud, Cambricon and Ant Group Deepen PyTorch Ties — ChannelE2E
      (Eric Mboizi)
    url: 'https://www.channelinsider.com/ai/news-alibaba-cambricon-ant-group-pytorch-apac-china/'
---
The PyTorch Foundation announced on September 8, 2026, at the first-ever KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China in Shanghai, that Alibaba Cloud and Cambricon have joined as Platinum members and Ant Group has joined at the Gold tier -- joining Huawei, a member since 2023. As Platinum members, Alibaba Cloud and Cambricon each get one seat on the PyTorch Foundation's governing board and one on its technical advisory council, the Foundation's own announcement confirms. More than 250 organizations across China already contribute to PyTorch Foundation projects including PyTorch itself, vLLM, DeepSpeed, Ray, Helion, and Safetensors.

## Three companies, three layers of the stack

The Foundation frames the three new members as covering different layers of how AI actually gets built and run: Alibaba Cloud's Qwen infrastructure team is presenting on serving its open-weight Qwen models at scale, Cambricon -- a Chinese AI chip and accelerator designer -- is working on hardening PyTorch's device-agnostic foundation so its own hardware backend gets the same native support Nvidia's does, and Ant Group is focused on the application layer, showing how Kubernetes-based building blocks can run secure, on-demand environments for AI agents. Alibaba Cloud CTO Feifei Li said in the Foundation's own release that the company is "looking forward to working alongside the PyTorch Foundation to raise the bar for AI infrastructure."

## Why a chipmaker wants a board seat in an open source project

Cambricon's interest is the most concrete of the three: PyTorch's device-agnostic design determines how much native support any non-Nvidia accelerator gets from the broader ecosystem, and a governing-board seat is a direct way to shape that roadmap rather than wait on it. ChannelE2E's own reporting frames Cambricon's aim simply -- the company wants to "reduce friction between PyTorch applications and its hardware" -- the same goal Huawei has been pursuing since 2023 for its own Ascend chips, per the Foundation's own announcement.

## What this means for anyone tracking where AI spend actually goes

A framework-level governance seat doesn't show up on an invoice the way a GPU cluster does, but it's a real lever on where compute costs land over the next several years: broader, better-supported non-Nvidia backends in PyTorch is exactly the kind of infrastructure shift that changes whether a company training or serving models has real hardware choice, or is locked into one vendor's pricing by default. It's a slower, less visible story than a funding round or a model launch, but it's the kind of structural change that eventually shows up in what organizations actually pay per token.
