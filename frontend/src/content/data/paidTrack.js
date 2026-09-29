// Monetization for the 30-day challenge: a free preview, then a one-time
// unlock for the full 30 days, plus a separate optional review of a
// finished capstone build. Both are one-time purchases via Stripe Payment
// Links.
//
// *_PAYMENT_LINK are placeholders until real Payment Links exist -- creating
// one requires an actual Stripe account, which nothing in this repo can do
// on its own. To go live:
//   Full access (one-time):
//     1. Stripe Dashboard -> Payment Links -> "+ New" -> one-time price,
//        amount matching CHALLENGE_ACCESS_PRICE_LABEL below
//     2. Product name: "Merit AC -- 30-day challenge, full access"
//     3. Under "After payment", choose "Redirect customers to a website"
//        and paste https://usemeritai.com/prompts/full-access-y1txjt9yz3eu
//        (see pages/PromptsFullAccess.jsx) -- this step is the actual
//        delivery mechanism. Without it, a buyer pays and lands on Stripe's
//        generic thank-you page with nothing telling them where their
//        content is. This site has no backend, no webhook, and no way to
//        check who paid -- the redirect URL IS the product handoff.
//     4. Paste the Payment Link's own https://buy.stripe.com/... URL in as
//        CHALLENGE_ACCESS_PAYMENT_LINK below and redeploy
//   Build review (one-time):
//     1. Same flow, amount matching PAID_TRACK_PRICE_LABEL
//     2. Product name: "Merit AC -- capstone build review"
//     3. After payment: redirect to /contact (or wherever review delivery
//        should start) -- a review is a service, not a page unlock, so this
//        one doesn't need PromptsFullAccess.jsx's approach
//     4. Paste it in as PAID_TRACK_PAYMENT_LINK and redeploy
// Until each is done, its CTA shows an honest "coming soon" state instead
// of a dead link.

// How many of the 30 days stay free with no signup or payment. Read by
// PromptDay.jsx and PromptsIndex.jsx to decide what actually gets rendered
// into the built page for a given day -- not just what a CTA says, since
// this is a static site with no runtime auth to enforce a gate at request
// time. Keep this in sync between the two files.
export const CHALLENGE_FREE_PREVIEW_DAYS = 3;

export const CHALLENGE_ACCESS_PRICE_LABEL = "$79 one-time";
export const CHALLENGE_ACCESS_PAYMENT_LINK = "";

export const PAID_TRACK_PRICE_LABEL = "$299 one-time";
export const PAID_TRACK_PAYMENT_LINK = "";
