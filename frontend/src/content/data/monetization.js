// Consultation and subscription monetization -- Stripe Payment Links (Stripe's
// own hosted checkout page, so no backend Stripe integration is needed here)
// plus a calendar booking link. Same placeholder-until-real-credentials-exist
// pattern as paidTrack.js: nothing in this repo can create a real Stripe
// account or booking calendar on its own, so these start empty and
// pages/Pricing.jsx shows an honest waitlist-style fallback until real
// values are pasted in.
//
// To go live:
//   Consultation (one-time):
//     1. Stripe Dashboard -> Payment Links -> "+ New" -> one-time price
//     2. Product name: "Merit AC -- consultation"
//     3. Paste the resulting https://buy.stripe.com/... URL into
//        CONSULTATION_PAYMENT_LINK below
//   Subscription (recurring):
//     1. Stripe Dashboard -> Payment Links -> "+ New" -> recurring price
//     2. Product name: "Merit AC -- [tier name]"
//     3. Paste the URL into SUBSCRIPTION_PAYMENT_LINK below
//   Booking link:
//     1. Cal.com or Calendly -> create an event type -> copy its public
//        scheduling URL
//     2. Paste it into BOOKING_URL below
export const CONSULTATION_PRICE_LABEL = "$250/hr";
export const CONSULTATION_PAYMENT_LINK = "";
export const BOOKING_URL = "";

export const SUBSCRIPTION_PRICE_LABEL = "$99/mo";
export const SUBSCRIPTION_PAYMENT_LINK = "";
