# 03 Tools

Twenty tools. Each is a folder under `tools/` with one `SKILL.md`. They are
written to be loaded by an assistant, and to be read by a human. Both audiences
matter.

## The contract

Every tool declares the same six things, in the same order, and any tool that
does not is broken.

1. **Run it when.** The trigger, in the operator's words.
2. **Reads.** Exactly which files and commands. No hidden inputs.
3. **The run.** Numbered steps. Judgment is stated, not implied.
4. **Writes.** Exactly which files and which fields. A tool that says it writes
   nothing must write nothing.
5. **Finish line.** Something checkable that proves it worked.
6. **Refuses.** What the tool will not do, including the things it would be
   convenient to do.

The refusals are the load bearing part. A tool that will do anything you ask is
not a tool, it is a risk.

## The twenty

**Money**

| Tool | Protects |
|---|---|
| `invoice` | work already done, not yet billed |
| `chase` | money billed, not yet collected |
| `expenses` | money out, attached to the job it belongs to |
| `cashflow` | the date you run out |
| `taxset` | the part of the balance that is not yours |
| `pricing` | the margin, after your own hours are paid |

**Work**

| Tool | Protects |
|---|---|
| `projects` | the state of committed work |
| `tasks` | commitments having dates and estimates |
| `time` | the hours, including the unpaid ones |
| `schedule` | the order things get done in |
| `capacity` | the one real constraint |

**Demand**

| Tool | Protects |
|---|---|
| `crm` | who people are and what was agreed |
| `pipeline` | every opportunity having a next action |
| `quote` | prices built from cost, with an expiry |
| `followup` | the loops that close themselves in silence |
| `content` | next month, built during this month |

**Control**

| Tool | Protects |
|---|---|
| `day` | five minutes, three things |
| `week` | the Friday close |
| `reaper` | removing the dead so the live is visible |
| `doctor` | the install and the machine |

## The rhythm they fit into

Daily `day`. Weekly `chase`, `pipeline`, `followup`, `week`. Monthly `pricing`,
`taxset`, `reaper`. Everything else runs on an event: work won, work done,
receipt arrived, hours logged.

## Adding your own

Copy the shape. Six sections, a finish line, and at least one refusal. A tool
without a refusal has not been thought about yet.
