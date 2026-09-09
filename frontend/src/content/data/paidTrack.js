// Paid track for the 30-day challenge: a structured review of a finished
// capstone build against the checklist on /challenge, offered as a one-time
// purchase via a Stripe Payment Link.
//
// PAID_TRACK_PAYMENT_LINK is a placeholder until a real Payment Link exists --
// creating one requires an actual Stripe account, which nothing in this repo
// can do on its own. To go live:
//   1. Stripe Dashboard -> Payment Links -> "+ New"
//   2. One-time price, amount matching PAID_TRACK_PRICE_LABEL below
//   3. Product name: "Merit AC -- capstone build review"
//   4. Create, copy the resulting https://buy.stripe.com/... URL
//   5. Paste it in as PAID_TRACK_PAYMENT_LINK and redeploy
// Until that's done, the /challenge and prompt-day-30 CTAs show an honest
// "coming soon" state instead of a dead link.
export const PAID_TRACK_PRICE_LABEL = "$299 one-time";
export const PAID_TRACK_PAYMENT_LINK = "";
