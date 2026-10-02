---
title: 'AI harness engineering: the discipline nobody named'
description: >-
  Every production AI agent runs inside a harness — the tool contracts, context
  budget, control boundaries, and failure handling around the model. It's
  usually invisible, unowned, and the single biggest determinant of whether an
  agentic system is safe. It deserves to be a named engineering discipline.
kicker: Guide · systems engineering
lead: >-
  Ask ten engineers who shipped an AI agent this year what model they used,
  and all ten will answer immediately. Ask them who owns the tool-authority
  model, the context budget, the approval boundary, and the failure-handling
  contract that surrounds that model, and most will describe a patchwork —
  whoever happened to be building the feature, making it up as they went.
  That patchwork has a name. It just hasn't been treated as a discipline yet.
wide: true
group: systems-engineering
tileMeta: >-
  Why the system around the model, not the model itself, decides whether an
  agent is safe — and why that system deserves to be engineered on purpose
---
## 1\. What a harness actually is

Strip an AI agent down to its components and you find two very different things sitting next to each other. One is the model: a function that takes tokens in and produces tokens out, non-deterministic, swappable, improving on a vendor's release schedule that no engineering team controls. The other is everything around it — the system prompt and how it's assembled, the tool definitions and what authority each one actually carries, the rules for what enters the context window and what gets left out, the identity the agent acts under, the gate a human has to clear before a consequential action executes, the retry and timeout behavior when a tool call fails, the logging that lets anyone reconstruct what happened after the fact, and the evaluation suite that says whether a change to any of the above made the system better or worse. That second thing is the harness. Claude Code is a harness. So is any production customer-support agent, coding assistant, or research tool built on top of a frontier model — named or not, designed on purpose or accumulated by accident.

The distinction matters because the two halves fail in completely different ways and get fixed by completely different kinds of work. A model limitation gets fixed by a better model, a better prompt, or a different model entirely — a vendor-side or prompt-side change. A harness limitation gets fixed by engineering: a narrower tool, a context budget, an identity boundary, a gate placed at the right point in the workflow. Confuse the two and the fix doesn't land. Teams that watch an agent do something unsafe and respond by rephrasing the system prompt to say "be more careful about X" are applying a model-side fix to a harness-side problem — asking a non-deterministic system to consistently choose caution, rather than building a surrounding system that doesn't depend on it choosing anything. The instruction might even work, most of the time, on most inputs. "Most of the time, on most inputs" is not what a production control is supposed to mean.

## 2\. Why this isn't prompt engineering

Prompt engineering is real, useful work, and it is a small corner of what a harness actually requires. It optimizes a single exchange: what to say to the model, how to phrase instructions, which examples to include, how to word a system prompt so the model's single-turn output is more likely to be what you want. That's a legitimate skill, and it's also the entire reason "prompt engineering" became the catch-all term for working with language models in the first place — single-turn chat was the first thing most people built, so the first discipline that got named was the one single-turn chat needed.

An agentic system is not a single exchange. It's a loop that runs for an unknown number of turns, calls tools whose combined authority can touch real systems, accumulates context that has to be actively managed rather than left to grow, and produces outcomes that a human finds out about after the fact unless the harness surfaces them along the way. None of "what tools exist and what can each one actually do," "what's allowed into context and what gets held back," "who has to approve what before it executes," "what happens on the fifth retry of a call that keeps timing out," or "how do we know, a release later, whether last week's prompt change helped or hurt in production" is a prompting question. A team that's genuinely skilled at prompt engineering and has no harness discipline will ship a system whose individual responses look sharp in a demo and whose behavior across many turns, many tool calls, and many real users is effectively unmanaged — because nobody engineered the part of the system actually responsible for managing it.

## 3\. Why this isn't (just) MLOps or platform engineering, either

MLOps grew up around training and serving predictive models: data pipelines, model registries, drift monitoring on a classifier's outputs, retraining schedules. Platform engineering grew up around deploying deterministic services: CI/CD, infrastructure as code, observability for systems whose behavior on a given input is, by design, the same every time. Both disciplines are mature, both contribute real tooling to a harness — the observability stack, the CI gate, the deployment pipeline all come from platform engineering's toolbox — and neither one was built around the actual shape of the problem an agentic system presents.

The shape is this: the unit of work isn't a single prediction or a single deployment, it's a loop whose length, branching, and sequence of tool calls are decided by the model at runtime, differently each time, on inputs nobody enumerated in advance. A platform engineer's instinct — define the states, test the transitions, deploy the thing that passed — runs into a system that doesn't have a fixed set of states to define, because the model is free to take a different path through the same tools on two calls with nearly identical input. Borrowing MLOps and platform engineering's tools is necessary and not sufficient. The design problem underneath them — bounding a system that doesn't hold still, rather than deploying one that does — is a different problem, and nobody owns it by default just because they own the tools that happen to be useful for part of it.

## 4\. The disciplines a harness is actually made of

A harness isn't one thing to get right; it's several, and most organizations have informally solved a few of them while leaving the rest completely unaddressed, without necessarily knowing which is which. Each of these is deep enough to deserve its own treatment — this site has a standalone field guide for several of them — but the list itself is the part most teams have never seen laid out together:

| Discipline | The question it answers | Where this gets covered in depth |
| --- | --- | --- |
| Tool design & authority | What can each tool actually do, and does its authority match its stated purpose? | [Four control boundaries](/guides/four-control-boundaries) |
| Context engineering | What enters the context window, what gets left out, and when does "more context" stop helping? | [Context engineering](/guides/context-engineering) |
| Identity & control boundaries | Whose credential is the agent acting under, and where does a human have to approve before something consequential executes? | [Ten disciplines of governed agentic DevSecOps](/guides/ten-disciplines-of-governed-agentic-devsecops) |
| Memory & state | What does the agent remember across turns and sessions, and where does that state actually live? | [Agent memory architecture](/guides/agent-memory-architecture) |
| Adversarial inputs | What happens when content the agent reads — not just what a user types — tries to redirect it? | [Prompt injection & agent security](/guides/prompt-injection-agent-security) |
| Evaluation | How do you know a change to any of the above made the system better, not just different? | [Eval-driven development](/guides/eval-driven-development) |

Harness engineering is the discipline that treats this list as one coherent job rather than six separate concerns that happen to live in six separate teams' backlogs, if they live anywhere at all. A context-engineering fix that isn't paired with an eval suite is a change nobody can confirm actually helped. A tool-authority model with no identity boundary behind it is a lock with the key taped to the door. The six rows interact constantly — the point of naming the discipline is making someone responsible for the interactions, not just the rows.

## 5\. Why this is widely needed now, not eventually

Model capability has moved fast in a specific direction: tool use, multi-step reasoning, and long-running autonomous loops have gone from research demos to default features in the space of a couple of product cycles. Giving a model the ability to call tools, read its own tool results, and decide what to do next without a human in the loop on every step used to be an unusual architecture choice. It is now closer to the default way agentic products get built, because it's the architecture that makes an agent actually useful instead of a chatbot with extra steps.

The engineering discipline that's supposed to surround that capability has not moved at the same pace, and the reason is structural rather than a matter of individual teams being careless: harness engineering doesn't have a natural home in most organizational charts. It isn't quite security's job, because most of it isn't about keeping attackers out — it's about bounding what an authorized, well-intentioned agent can do to itself and its own environment. It isn't quite the ML team's job, because little of it involves training or model quality. It isn't quite platform engineering's job, because the failure modes don't look like the deterministic-service failures that discipline was built to catch. So it falls to whichever team shipped the first agent feature, who build what they need to ship that one feature, and the organization ends up with harness decisions made as a side effect of shipping rather than as a discipline someone is accountable for across every agent the company runs. That gap — rising capability, flat or lagging harness maturity, no default owner — is not a hypothetical risk. It's the condition most organizations building with agents are already in, whether or not anyone has named it.

## 6\. What happens without it: three predictable failure shapes

None of these require a specific incident to make the point — they're predictable consequences of a known gap, the same way "a service with no health checks will eventually fail silently" doesn't need a named outage to be true.

**Authority conflation.** A pilot gets stood up fast by running the agent against a developer's own broad credentials or a personal access token that already has wide access — the fastest way to a working demo, because nobody has to design a scoped identity on day one. The pilot works, it gets extended, and eighteen months later every action that agent ever took is indistinguishable in the logs from that one developer's own actions. The audit trail that would tell you what the agent actually did is worthless for anything it touched, not because anyone hid it, but because the identity boundary was never built. By the time anyone notices, "add a scoped identity" is a migration project, not a configuration change.

**Context rot read as model regression.** A team notices their agent is "getting worse" — missing instructions it used to follow, losing track of earlier parts of a long session — and the instinct is to blame the model or wait for the next release to fix it. Often the real cause is that the system has been quietly accumulating unmanaged context: tool results appended to history in full instead of extracted down to what's relevant, a conversation that's grown long enough that attention is spread thin across material most of which no longer matters to the current step. The next model release doesn't fix it, because it was never a model problem, and the team has now spent a release cycle waiting on a fix that was never coming from that direction.

**The convenience tool that becomes the incident.** Under deadline pressure, a team wires up a broad, general-purpose tool — a shell-execution capability, an administrative API key with far more scope than the feature needs — because it's flexible and it covers every case the pilot might hit. It works fine in the pilot, because the pilot only ever used it for the cases it was built for. It ships to production because nothing in the review process flagged "this tool can do more than this feature needs" as a problem worth blocking on. Months later, it's the tool an incident report points to — not because anyone used it maliciously, but because its authority was never actually scoped to the job, and eventually some combination of inputs exercised the part of its authority nobody was watching.

## 7\. A minimal harness-engineering checklist

A discipline earns the name by being checkable, not just arguable. Before calling an agentic system production-ready, a harness should be able to answer all of the following — not most of them, because a gap in any one undermines what the others are protecting:

> **Harness readiness checklist**
>
> *   **Named owner.** One person or team is accountable for the harness as a whole, not just for the feature it happens to power.
> *   **Tool inventory with authority levels.** Every tool the agent can call is documented with what it can actually do, not just what it's named — and anything closer to "run arbitrary commands" than "perform this one scoped action" has been justified, not defaulted into.
> *   **Context budget policy.** There's an explicit answer for what enters context, what gets extracted or summarized before it does, and what gets offloaded to a file or store instead of carried in history indefinitely.
> *   **Identity separation.** The agent acts under its own scoped, short-lived credential — never a developer's interactive session or a long-lived key that outlives the review that issued it.
> *   **Independent validation.** Tests, policy checks, and security scans gate the agent's output the same way they'd gate a human's, and the agent cannot adjust the gate itself to make its own work pass.
> *   **A placed approval boundary.** Human sign-off happens at a point where the approver has something concrete to evaluate — a diff, an affected-resource list, a rollback plan — not a rubber stamp on an intention or a flood of low-stakes requests that trains reviewers to stop reading.
> *   **Correlation-threaded observability.** One identifier connects a request through every model call, tool call, and policy decision it triggers, so "what happened for this one request" is answerable without manually cross-referencing five dashboards.
> *   **A failure-handling contract per stateful tool.** Every tool that mutates something has a documented answer for what a second, retried call does — the conversation history that led there, idempotent or not, explicitly, not by accident.
> *   **An eval suite that runs on every harness change.** Not just on model upgrades — a context-budget tweak, a new tool, a changed approval threshold all get evaluated against the same suite a model swap would be, because any of them can move the system's actual behavior as much as a new model can.

A system that satisfies eight of these nine isn't 90% safe. It has exactly one unaddressed failure mode standing between normal operation and an incident, and which one it is tends to be invisible until it's the one that happens.

## 8\. Where this discipline should sit

Site reliability engineering is worth the comparison, not because the two disciplines solve the same problem, but because of how SRE came to exist at all. Running services at a scale and complexity where ad hoc, whoever's-on-call ownership stopped working didn't produce better outcomes by hoping individual teams would get more careful — it produced SRE as a named discipline, with its own practices, its own error budgets, and its own accountability that cut across whichever team happened to own a given service. The forcing function wasn't a single catastrophic failure; it was the accumulated cost of a known gap that nobody owned, repeated across enough services that naming the discipline and giving it a seat at the table became cheaper than continuing to absorb the cost of not doing so.

Agentic systems are at an analogous point, for the same structural reason: the gap between what harness engineering needs to cover and who's actually covering it is distributed across security, ML, and platform teams in a way that makes it nobody's full-time job by default. The fix isn't necessarily a new department on day one — for most organizations it starts as a named responsibility assigned to a specific senior engineer with explicit authority to block a launch over a harness gap, the way an early security champion predates a full security team. What it cannot be, if the discipline is going to hold, is "the thing whichever team shipped the first agent feature figured out for themselves, informally, under their own deadline pressure" — because that's the condition that produces the three failure shapes in section 6, and it produces them reliably, not occasionally.

## 9\. Start here

None of this is abstract once you look for it: every agent already running in production has a harness, whether or not anyone built it on purpose. The question worth asking this week isn't "should we adopt AI harness engineering" — it's "who, right now, could answer every item in section 7's checklist for the agent we already shipped?" If the honest answer is nobody, that's not a hypothetical gap. It's the one this discipline exists to close, and the checklist above is a starting inventory, not a finished one.

Merit AC exists because the same discipline problem shows up one level up the stack: organizations can tell you what they spend on AI tools long before they can tell you whether that spend is producing real work, and the gap between those two questions is, in practice, mostly a harness-engineering gap — ungoverned tool access and unmeasured agent behavior don't just create safety risk, they're the same reason the spend itself is hard to account for. For a day-by-day way to apply the disciplines above to a real repository, see the [30-day challenge](/challenge); for the full list of control disciplines this piece draws on, [ten disciplines of governed agentic DevSecOps](/guides/ten-disciplines-of-governed-agentic-devsecops) is the deeper reference.
