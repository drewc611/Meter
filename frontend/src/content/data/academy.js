// AI Skills Academy membership -- a recurring Stripe Payment Link, same
// placeholder-until-real-credentials-exist pattern as paidTrack.js and
// monetization.js: nothing in this repo can create a real Stripe price or
// live-workshop calendar on its own, so these start empty and
// pages/AcademySpotlight.jsx shows an honest waitlist fallback until real
// values are pasted in.
//
// To go live:
//   Membership (recurring):
//     1. Stripe Dashboard -> Payment Links -> "+ New" -> recurring price
//     2. Product name: "AI Skills Academy -- membership"
//     3. Paste the resulting https://buy.stripe.com/... URL into
//        ACADEMY_MEMBERSHIP_PAYMENT_LINK below
//   Workshop seat (optional, if a workshop is ticketed separately):
//     1. Cal.com or Calendly -> create an event type -> copy its public
//        scheduling URL
//     2. Paste it into ACADEMY_WORKSHOP_BOOKING_URL below
export const ACADEMY_MEMBERSHIP_PRICE_LABEL = "$49/mo";
export const ACADEMY_MEMBERSHIP_PAYMENT_LINK = "";
export const ACADEMY_WORKSHOP_BOOKING_URL = "";

// How many days of the 30-day challenge are open to everyone, no membership
// required. Keep this in sync with the prose in AcademySpotlight.jsx if it
// changes -- it's read by that page to decide which /prompts/day-N tiles
// link out for free versus show as membership-locked.
export const ACADEMY_FREE_PREVIEW_DAYS = 3;
