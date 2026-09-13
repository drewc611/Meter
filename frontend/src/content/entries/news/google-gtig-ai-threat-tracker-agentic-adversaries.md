---
date: '2026-09-08'
category: research
title: 'Google says attackers moved from prompting AI for help to letting it run the attack'
dek: >-
  Google Threat Intelligence Group's latest AI Threat Tracker documents a
  financially motivated actor harvesting thousands of credentials in under
  six hours and a China-nexus group building an agentic pentesting framework.
sources:
  - label: >-
      GTIG AI Threat Tracker: From Prompting to Autonomy -- The Evolution of
      Adversarial AI — Google Cloud (official)
    url: 'https://cloud.google.com/blog/topics/threat-intelligence/from-prompting-to-autonomy-the-evolution-of-adversarial-ai'
  - label: >-
      Autonomous AI Agents Compromise Thousands of Credentials in Under Six
      Hours — The Hacker News (Ravie Lakshmanan)
    url: 'https://thehackernews.com/2026/09/autonomous-ai-agents-compromise.html'
---
Google Threat Intelligence Group published its latest AI Threat Tracker on September 8, 2026, arguing that the threat actors it tracks have moved from using AI as a prompting assistant to running agentic workflows that need little human supervision. The report's central claim is that "human-in-the-loop latency is dramatically reduced," and its lead example is a financially motivated actor who, after compromising a piece of cloud infrastructure in the second quarter of 2026, used an autonomous multi-agent framework to plan, build, and execute a mass credential-harvesting campaign that compromised thousands of third-party credentials in under six hours -- with the AI system itself managing the vulnerability-scanning pipeline and doing real-time troubleshooting.

## A dashboard for stolen secrets

GTIG also describes a framework it calls "Recon": a command-and-control server, exposed and discovered by researchers, hosting a set of agentic configuration files -- including files named AGENTS.md, KNOWLEDGE.md, and agentic_vuln_research.md -- built to organize and manage more than 23,800 harvested secrets in real time. Separately, the report ties a China-nexus group to a penetration-testing framework built on Google's Gemini model, designed to automate discovery-phase tasks like port scanning and service enumeration. GTIG stops short of claiming attackers have crossed into fully autonomous zero-day discovery, saying it has not yet observed threat actors running fully autonomous attack pipelines against real targets for that purpose -- though it says AI is already speeding up how fast a public vulnerability disclosure turns into working exploit code.

## Why the framing matters

The distinction Google is drawing -- prompting versus autonomy -- is a narrower and more falsifiable claim than the general "AI supercharges hackers" line that shows up in most vendor threat reports, and it comes from a company with its own incident-response arm (Mandiant) and its own frontier model (Gemini) with something to lose either way the finding cuts. The Recon dashboard in particular is a concrete artifact, not just a described technique: a C2 server built to let a human operator manage tens of thousands of stolen credentials through the same kind of agent-configuration files a developer would use to manage a coding assistant, which is a fairly direct answer to what "AI-orchestrated cybercrime" looks like in practice once you go looking for it.
