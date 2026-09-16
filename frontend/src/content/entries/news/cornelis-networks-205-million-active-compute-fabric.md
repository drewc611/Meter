---
date: '2026-09-14'
category: funding
title: 'Cornelis Networks raises $205M to make AI networking do compute, not just carry it'
dek: >-
  The Intel networking spinoff''s new Active Compute Fabric offloads
  collective operations into the network itself, and its 400 Gbps CN5000
  switch is shipping now as an open, GPU-agnostic alternative to Nvidia''s fabric.
sources:
  - label: 'Cornelis Expands into Scale-Up Networking with Active Compute Fabric, $205M in Funding, and Qualcomm Collaboration -- Cornelis Networks (official)'
    url: 'https://www.cornelis.com/stories/cornelis-expands-into-scaleup-networking-with-active-compute-fabric'
  - label: 'Cornelis lands $205M to make AI networks compute, not just connect -- Network World (Sean Michael Kerner)'
    url: 'https://www.networkworld.com/article/4221872/cornelis-lands-205m-to-make-ai-networks-compute-not-just-connect.html'
---
Cornelis Networks, the Intel networking-technology spinoff, announced a $205 million funding round on September 14, led by IAG Capital Partners, alongside a new product architecture it's calling Active Compute Fabric and a strategy collaboration with Qualcomm. The capital will go toward scaling production of the company's switch line and funding its next-generation roadmap.

## What Active Compute Fabric actually does

Rather than treating the network as a passive pipe between GPUs, Active Compute Fabric pushes programmable compute into the fabric itself -- offloading collective operations (the synchronization traffic that keeps distributed training and inference jobs in step) so accelerators spend less time idle waiting on data. It's built to industry standards (UALink, ESUN, Ultra Ethernet) rather than a single vendor's stack, which is the company's explicit pitch against Nvidia's proprietary networking: an open, GPU-agnostic layer that works across accelerator brands. CEO Lisa Spelman put the underlying bet plainly: "the fabric has to become an active part of the compute system."

The 400 Gbps CN5000 switch is shipping today; an 800 Gbps CN6000 is sampling with customers ahead of broader availability in Q4 2026.

## The bigger number behind it

IAG Capital partner Joel Whitley framed the round around a market-sizing claim -- "more than $55 billion of opportunity by 2030" for this category -- which is a projection worth treating as exactly that, not a settled fact. What is verifiable is the immediate competitive framing: as GPU clusters scale into the hundreds of thousands of chips, the network connecting them increasingly determines whether that hardware spend actually translates into usable training and inference throughput, rather than idle accelerators waiting on a slow fabric.
