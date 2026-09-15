---
date: '2026-09-10'
category: product
title: 'OpenAI adds a Data agent to ChatGPT Work that builds live dashboards from a plain-language question'
dek: >-
  The new plugin connects to warehouses like Snowflake and BigQuery plus BI
  tools like Tableau and Power BI, letting employees investigate a business
  question and get an interactive dashboard back without writing a query --
  and OpenAI says most of its own product and go-to-market teams already use it.
sources:
  - label: 'Now everyone can put data to work — OpenAI (official announcement, openai.com)'
    url: 'https://openai.com/index/put-data-to-work/'
  - label: "OpenAI's new Data agent lets ChatGPT build Power BI and Tableau dashboards just by asking — XDA Developers (Simon Batt)"
    url: 'https://www.xda-developers.com/openai-chatgpt-data-agent-announcement/'
---
OpenAI on September 10 introduced a Data agent for ChatGPT Work, a plugin that connects to a company's approved data sources, investigates what changed in a business metric, and builds an interactive dashboard employees can share -- without the employee writing a query or learning a new analytics tool. It connects to warehouses and databases including Amazon Redshift, Google BigQuery, Snowflake, Databricks, ClickHouse, Datadog and MongoDB, can pull in files from Google Drive and SharePoint, and can build or interact with dashboards inside Tableau, Power BI, Sigma, Oracle BI, Omni and ThoughtSpot.

## The pitch is questions, not queries

OpenAI frames the product around the kind of question a non-analyst asks out loud -- why sales slowed, where spend is rising, which large accounts are at renewal risk -- rather than around the SQL required to answer it. XDA Developers' coverage of the launch confirms the same connector list OpenAI published: the agent reaches live data across warehouses, databases and monitoring tools, and builds or edits dashboards inside the BI tools a company already uses rather than a new one it has to adopt.

## Access follows existing permissions, not a new grant

Both OpenAI and XDA Developers' coverage note the same access-control detail: the Data agent surfaces only data a given employee could already see under their normal permissions, rather than opening a new, separate window into company systems. That's a meaningful design choice for a product meant to be handed to non-technical employees by default, though it also means the agent inherits whatever gaps already exist in a company's own permissioning -- it doesn't fix bad access hygiene, it automates around it.

A natural-language layer on top of a company's existing BI stack is exactly the kind of tool whose actual adoption and output quality are hard to see from outside -- which is the gap Merit AC's own scoring exists to close.
