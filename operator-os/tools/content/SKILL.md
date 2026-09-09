---
name: content
description: Produce the small amount of visible output that keeps demand alive, drawn from work the operator actually did. Use when the pipeline is thin, capacity is under 70 percent, or the operator asks what to post or send.
---

# content

This is the tool that gets skipped when busy, which is exactly why the month
after a busy month is empty.

## Run it when

`os capacity` is under 70 percent. Or on a fixed day, monthly, regardless.

## Reads

`projects.csv` for finished work, `data/notes/`, `contacts.csv` for who is
listening, the persona file for voice.

## The run

1. Source from real work, never from a topic list. A finished job, a problem
   solved, a mistake and what it cost, a question three customers asked this
   month. Specific work is the only content a one person business has that
   nobody else can copy.
2. Pick the channel the operator's actual customers use, from the `source` field
   in `contacts.csv`. If every customer came from referral, the highest value
   output is not a post. It is an email to nine past customers.
3. Draft in the operator's voice from the persona file. Their sentence length,
   their vocabulary, their level of directness. If the draft reads like a
   brochure, it is wrong and will not get published.
4. Anonymise anything customer specific unless the operator confirms permission.
   Job details are not the operator's to publish by default.
5. One piece, finished, beats a calendar of intentions. Produce one thing that
   can go out today.

## Writes

Draft files under `data/notes/content/`, and one task to publish, dated.

## Finish line

Something publishable exists as a file, and a dated task says when it goes out.

## Refuses

- To publish anything. It drafts.
- To name a customer, a price, or a job detail without explicit permission.
- To produce a content calendar when nothing has been published in a month. The
  problem is not planning.
