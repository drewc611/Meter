---
date: '2026-09-09'
category: research
title: 'A single attacker used hundreds of AI agents to breach 395 organizations in hours'
dek: >-
  GreyNoise says a likely Russian-speaking actor chained two PaperCut NG/MF
  flaws and ran the exploitation through an OpenAI Codex harness driving a
  DeepSeek model, compromising 440 servers across 48 countries.
sources:
  - label: >-
      Agents Gone Wild: An AI-Orchestrated Global Campaign Against PaperCut
      NG/MF — GreyNoise (official)
    url: 'https://www.greynoise.io/blog/ai-orchestrated-campaign-against-papercut-ng-mf'
  - label: >-
      AI agents exploited PaperCut flaws to breach 395 organizations — Help
      Net Security
    url: 'https://www.helpnetsecurity.com/2026/09/11/ai-agents-papercut-ng-mf-attack-campaign/'
---
GreyNoise published research on September 9, 2026 describing a campaign in which one attacker, assessed as likely Russian-speaking, chained an authentication-bypass flaw (CVE-2026-81578) with a remote-code-execution flaw (CVE-2026-82078) in PaperCut NG/MF print management software and ran the exploitation through hundreds of AI agents. The agents ran on an OpenAI Codex harness driving a DeepSeek model, wrapped around public offensive-security tools including Mimikatz, SharpHound, Certipy, Rubeus, and Impacket. By the time GreyNoise finished counting, the campaign had compromised at least 440 PaperCut instances across 395 organizations in 48 countries, with education accounting for 204 of the victims.

## Hours, not weeks

The attacker built a private lab -- a vulnerable copy of PaperCut NG/MF paired with an Active Directory server -- to develop and test the exploit chain before going live, and used the Netlas.io internet-scanning service to build target lists. GreyNoise's timeline for the live campaign, which began August 31, is the part that stands out: an empty workspace to first remote code execution against a real victim in under four hours, a first domain admin two hours after that, and once the full campaign launched, at least 11 organizations compromised in 26 seconds. Domain admin access, once achieved, took as little as five minutes and never longer than 144 minutes. GreyNoise harvested credentials from 280 of the victim organizations and obtained operating-system or domain secrets from 147.

## What the attribution rests on

GreyNoise's Russian-speaking attribution comes from a hardcoded, 28-country exclusion list embedded in the attacker's tooling and led by Russia and Belarus -- a common pattern in criminal and state-linked malware meant to avoid domestic targets, rather than a confirmed identity. The firm's own framing of the takeaway is blunt: "AI enables fast and efficient complex orchestration of cyber operations." What the case illustrates for defenders isn't a new class of vulnerability -- PaperCut NG/MF's flaws were already known -- but how much an attacker's operational tempo changes once agentic tooling, not a human operator, is doing the exploitation, credential harvesting, and lateral movement in parallel across hundreds of targets at once.
