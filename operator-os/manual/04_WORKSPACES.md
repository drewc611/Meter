# 04 Workspaces

Five businesses, encoded. Each is a persona plus a full set of live data, and the
data is anchored to relative dates so it looks current whenever you load it. No
demo ever reads as stale.

| Workspace | Shape | The leak it teaches |
|---|---|---|
| `01-field-service` | goes to the customer, quotes then works then bills | money earned and never collected |
| `02-fractional-consultant` | sells months, not deliverables | scope creep and revenue concentration |
| `03-design-studio` | fixed price project work | hours past the estimate, revisions given away |
| `04-maker-brand` | physical product, direct and wholesale | cash tied up in stock, wholesale priced off retail |
| `05-coach-practice` | sells time in blocks | the ceiling, and unpaid hours between sessions |

## How to use them

```
os use                              list them
os use 03-design-studio             load one and look around
os brief                            see it running
os margin                           see the lesson
os use 03-design-studio --empty     keep the config shape, drop the rows
```

Loading a workspace backs up whatever was in `data/` first. Nothing you have is
overwritten silently.

## Which one to fork

Not the one whose trade matches yours. The one whose leak matches yours.

A photographer with a collections problem should fork the field service
workspace, not the studio. The trade is cosmetic. The failure mode is the thing
being encoded.

## What is inside one

```
workspaces/03-design-studio/
  persona.md    who runs it, how they talk, what they are bad at
  seed.json     config plus every row, dates as relative tokens
```

The persona is not decoration. Tools that draft anything read it for voice, so a
message drafted for a field service operator sounds different from one drafted
for a coach. Replace it with yours the day you fork.

## Building your own

Copy a `seed.json`, change the config block, replace the rows, keep the id
prefixes and the relative date tokens (`T`, `T-14`, `T+30`). Then
`os use <yours>` and `os validate`. If it validates, it works.
