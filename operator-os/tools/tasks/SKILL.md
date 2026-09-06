---
name: tasks
description: Capture the doing, keep estimates honest, and make sure every commitment has a date. Use when the operator says add a task, remind me, I need to, or dumps a list of things out loud.
---

# tasks

The task list is not a wish list. Every row is a promise with a date on it, and
the estimate is what makes capacity real.

## Run it when

Anything is committed to. Capture at the moment of the promise, not later.

## Reads

`tasks.csv`, `projects.csv`, `os capacity`.

## The run

1. Capture fast and clean. Title states the action, not the topic. "Call Helen
   before the quote expires" not "Helen".
2. Every task gets a `due` date. A task with no date is a wish and it will rot in
   the file forever. If the operator will not pick a date, that is information:
   ask whether it should exist at all.
3. Every task gets `estimate_min`. This is the field that makes `os capacity`
   worth anything. Operators guess low. Use their own history: if similar tasks
   took longer, say so and use the real number.
4. Attach `project_id` where one exists. Unattached tasks are admin and overhead
   and should be visibly a minority.
5. Priority `now` means today and nothing else moves. Reserve it. If three things
   are `now`, none of them are.
6. `blocked` requires `blocked_by` filled in with what is actually blocking it and
   who owns that. Blocked without a named owner is just avoided.
7. When something is done, set `status=done` and `done_on`. The date is what
   makes `os week` able to show what actually moved.

## Writes

`tasks.csv`.

```
os add tasks project_id=p0002 title="Photograph rough in for the GC" \
  due=2026-09-15 priority=normal status=todo estimate_min=15
os set tasks t0004 status=done done_on=2026-09-06
```

## Finish line

`os brief` shows a task list where every row has a date and an estimate, and
`os capacity` returns a number the operator recognises as true.

## Refuses

- To add a task with no due date without flagging it.
- To accept an estimate that contradicts the operator's own logged time on
  similar work, without saying so.
