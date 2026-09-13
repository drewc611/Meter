---
date: '2026-09-13'
category: product
title: 'Box brings enterprise files into ChatGPT -- with its own permissions layer intact'
dek: >-
  Box expanded its MCP-based integration beyond Claude to ChatGPT, Microsoft
  365 Copilot and Glean, letting employees search, preview and act on
  company content from inside whichever AI assistant they already use.
sources:
  - label: 'Box Expands MCP Apps to ChatGPT, M365 Copilot, and Glean — Box (official company blog)'
    url: 'https://blog.box.com/box-expands-mcp-apps-chatgpt-m365-copilot-and-glean'
---
Box announced on September 10, 2026 that its Model Context Protocol server -- previously available to Claude -- now also connects to ChatGPT, Microsoft 365 Copilot and Glean's Assistant, giving employees access to Box-stored files, folder structures and previews from inside whichever AI tool their employer has standardized on. Box CEO Aaron Levie framed the move around a specific claim: "the next era of enterprise AI will be defined by how effectively AI can understand the content and context that power a business." OpenAI's Sondra Batbold, product lead for personalization and context, said the integration is about "making it easier to move from finding information to understanding it." The ChatGPT integration is generally available now; M365 Copilot support is coming, and the underlying MCP server already supports Atlassian, Figma, GitHub Copilot and Cursor, with Salesforce Agentforce listed as coming soon.

## The governance detail is the actual news

Box is explicit that existing permissions and access controls carry through to whichever assistant an employee is using -- a file an employee can't open in Box still can't be surfaced to them via ChatGPT. That's the substantive claim in an announcement otherwise full of the usual "visual collaborator" language: enterprise IT departments have been slow to let employees point consumer AI tools at company documents specifically because permissions and audit trails don't automatically travel with the content. Whether Box's controls hold up under real usage is a separate question from whether the company built them, but building them at all is what makes this a governance story rather than just a feature-parity one.

## One vendor becoming the connective layer instead of the destination

Box's own product is increasingly the plumbing behind other companies' AI interfaces rather than the interface itself -- the same content now surfaces inside Claude, ChatGPT, Copilot, Glean, and several developer tools, with Salesforce's agent platform next. For a company whose core business is enterprise file storage, becoming the identity- and permission-aware layer that every AI assistant has to go through is a more durable position than betting on any one assistant staying dominant, and it says something about where the actual leverage is settling in the current wave of enterprise AI deployment: not in the model, but in who controls access to the data the model needs to be useful.
