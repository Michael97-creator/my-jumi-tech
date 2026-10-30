# Jumi Tech Flagship Website + Academy Enrollment (v2)

This project preserves the existing HTML/CSS/JavaScript Jumi Tech company website and adds an Academy enrollment backend designed for Vercel Functions, Neon PostgreSQL and Paystack.

## What's included

- Existing Jumi Tech company pages, branding, logo, Billion Rush link and contact form.
- Formspree remains in use for the general project/contact enquiry form (`https://formspree.io/f/xzebazao`).
- Four current Academy courses with tuition, timetables and public weekly student syllabuses:
  - Frontend Development — ₦30,000 — Mon/Wed/Fri, 5–7 PM WAT.
  - Backend Development — ₦30,000 — Mon/Wed/Fri, 8–10 PM WAT.
  - Python Programming — ₦30,000 — Tue/Thu/Sat, 5–7 PM WAT.
  - Ethical Hacking — ₦40,000 — Tue/Thu/Sat, 8–10 PM WAT.
- Academy registration is saved to PostgreSQL rather than relying on a Formspree submission as the registration record.
- Full payment, 50/50 installment payment and no-payment waitlist options.
- Server-side tuition calculation; the browser never controls the amount charged.
- Paystack initialization and transaction verification, plus a signed-webhook handler and duplicate-safe payment updates.
- Restricted admin area at `/academy/admin` for registration review, cohort dates, notes, balances and certificate issuance.
- Certificate PDF generation with QR code and public verification at `/academy/verify`.
- Certificate issuance is blocked until the registration's tuition is fully paid and the selected course belongs to the registration.

## Important enrollment policy implemented

- Full payment: the complete selected-course tuition is due at checkout.
- Installments: 50% is due at checkout; the remaining 50% is due one month after the cohort start date. The admin sets the start date and the system calculates the balance due date.
- Waitlist: saves the student's interest without initiating a payment.
- Multiple selected course fees are added together by the backend.
- Each course has its own scheduled class time. Students should review the timetable before selecting multiple courses.
- Course certificate generation is an admin action, after payment is fully settled. Completion should be confirmed by the Academy before issuing a certificate.

## Deployment setup

### 1. Import the project into Vercel

Upload this project to your Git repository or import the ZIP contents into a new repository, then import the repository into Vercel. Keep the current static website structure; do not create a separate frontend app.

### 2. Create a Neon PostgreSQL database

Create a Neon project and copy its PostgreSQL connection string. Use the pooled connection string if available and keep `sslmode=require` in the connection string. Tables and indexes are created automatically the first time an Academy API endpoint is used.

### 3. Configure Vercel environment variables

Copy the keys from `.env.example` into **Vercel → Project Settings → Environment Variables**:

- `DATABASE_URL` — Neon PostgreSQL connection string.
- `PAYSTACK_SECRET_KEY` — use a Paystack test secret key during the first end-to-end test; change to the live secret only after the tests pass.
- `PAYSTACK_CURRENCY` — `NGN`.
- `SITE_URL` — exact deployed public origin, without a trailing slash.
- `ADMIN_PASSWORD` — a unique admin password with at least 12 characters.
- `SESSION_SECRET` — a random secret with at least 32 characters.

Redeploy after setting or changing environment variables. Never put these secrets in HTML, CSS, `js/app.js`, GitHub or a public message. Do not commit a real `.env` file.

### 4. Configure Paystack webhook

In the Paystack dashboard, configure the webhook URL as:

`https://YOUR-DEPLOYED-DOMAIN/api/paystack/webhook`

Replace the domain with the actual `SITE_URL`. The webhook handler validates Paystack's HMAC signature and re-verifies successful transactions before updating the saved payment record. The browser return page also verifies the transaction server-side.

### 5. Test before switching to live payments

Use Paystack test mode first. Test all of these cases:

1. A waitlist submission is saved and does not open Paystack.
2. A full payment charges the combined tuition for the selected course(s).
3. An installment checkout charges exactly 50% of the combined tuition.
4. A cancelled/failed payment is not marked paid.
5. A successful payment updates the registration and payment record.
6. Repeated return checks/webhooks do not double-count a payment.
7. The admin login works only with the configured password and HTTPS cookie in production.
8. Admin can set a cohort start date; the balance due date is one month later.
9. Admin can create a balance checkout for a partially paid registration.
10. Certificate issuance is blocked for unpaid registrations and succeeds for a fully paid registration.
11. The QR code opens the public certificate verification page.
12. The existing contact form still submits to Formspree.

Only after all tests pass should you switch `PAYSTACK_SECRET_KEY` to your live secret key and redeploy.

## Routes

- `/academy` — Academy courses and fees.
- `/academy/course/frontend` — Frontend Development syllabus.
- `/academy/course/backend` — Backend Development syllabus.
- `/academy/course/python` — Python Programming syllabus.
- `/academy/course/ethical-hacking` — Ethical Hacking syllabus.
- `/academy/register` — registration, full payment, installments and waitlist.
- `/academy/admin` — restricted Academy administration.
- `/academy/verify?id=CERTIFICATE_ID` — public certificate verification.

## API routes

- `POST /api/academy/register`
- `GET /api/paystack/verify?reference=...`
- `POST /api/paystack/webhook`
- `GET/POST/DELETE /api/admin/login`
- `GET/PATCH /api/admin/registrations`
- `POST /api/admin/balance-payment`
- `POST /api/admin/certificate`
- `GET /api/certificates/verify?id=...`

## Operational notes

- The backend persists registrations and payments in Neon. It does not rely on the browser's local storage.
- The admin area does not provide student accounts or student dashboards.
- General contact enquiries remain on Formspree. Academy records are in the database and visible in the restricted admin area.
- Automatic email/SMS reminders are not configured in this package because a verified email/SMS provider and credentials have not been supplied. Admin can see due dates and create secure balance checkout links.
- The code is prepared for deployment but must be connected to your Neon database, configured with environment variables and tested on the deployed Vercel URL before it can process real registrations or live payments.
