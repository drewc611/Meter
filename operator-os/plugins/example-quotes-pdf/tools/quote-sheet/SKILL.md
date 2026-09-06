---
name: quote-sheet
description: Turn a recorded quote into a printable sheet the customer can read and sign, without inventing a single number. Use when the operator says send the quote, print the quote, they want it on paper, or make it look like a real quote.
---

# quote-sheet

The quote already exists as a row. This puts it on a page. Nothing here decides
a price. If the number on the page is wrong, the row is wrong, and the fix is in
the row.

## Run it when

A quote in `quotes.csv` is ready to go out, or a customer asks for it again in a
form they can file, sign or forward to whoever actually pays.

## Reads

`quotes.csv` for the row, `contacts.csv` for who it is for, `deals.csv` for the
title of the work, `business.yml` for the business name, operator, trade and
currency symbol. Nothing else. No pricing tool runs here.

## The run

1. Find the quote by id or by number. If two are close, ask which one rather
   than guessing. `os quote-sheet` with no argument lists every quote with its
   status and total.
2. Check the row before rendering it. A quote with no `expires` is not ready to
   send. A quote with `status` draft is not ready either. Fix the row with
   `os set quotes <id> ...` first, then render.
3. Run `os quote-sheet <quote_id>`. It writes one HTML file to `data/out/`.
4. Open the file and read it as the customer will. The scope paragraph comes
   from the deal title and the quote notes. If it does not say what is included
   and what is not, the gap is in the row and that is where to fix it.
5. Print to PDF from the browser and attach the PDF to your own email. The
   system does not send it.

## Writes

One file: `data/out/quote-<number>.html`. No row is created, changed or deleted.
`data/out/` is rendered output. Deleting the whole folder loses no business
record.

## Finish line

The file exists under `data/out/`, opens in a browser with no network, and the
total on the page matches `total` in the quotes.csv row you rendered. Check both
numbers with your own eyes before it goes out.

## Refuses

- To change the price, the tax or the expiry while rendering. It prints the row
  as it stands, including a red flag on the page when the quote expired and was
  never marked accepted or declined.
- To render a quote for a contact marked `do_not_contact`.
- To send anything. There is no email step here and there will not be one.
