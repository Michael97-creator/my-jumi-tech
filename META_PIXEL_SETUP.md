# Meta Pixel installation — Jumi Tech Academy

Meta Pixel ID: 4679526532326626

The base Meta Pixel code is installed in `index.html`. The site is a client-side routed app,
so `PageView` is also sent whenever the app renders a new route.

Academy events implemented:
- `ViewContent`: Academy landing page, registration page, and individual course pages.
- `InitiateCheckout`: after the Academy registration API successfully creates a Paystack checkout session.
- `Lead`: after the waitlist registration is successfully accepted (no payment is collected).
- `Purchase`: only after `/api/paystack/verify` confirms a successful Paystack transaction with a matching amount and currency.
  Each Paystack reference is deduplicated in the visitor's local storage to prevent repeat Purchase events on refresh.

Purchase value is the amount for the verified transaction (not the registration's cumulative lifetime paid amount),
so installment payments are measured as individual successful transactions.

## Deployment and testing
1. Deploy this project to the existing Vercel project.
2. In Meta Events Manager, open this Pixel and use Test Events while visiting the live Academy pages.
3. Confirm PageView and ViewContent events, then test a waitlist registration for Lead.
4. Only use a Paystack test transaction in a safe test environment to validate InitiateCheckout and Purchase.
   Do not create a live charge just to test tracking.

This is browser Pixel tracking. It does not include Conversions API (server-to-server) integration.
