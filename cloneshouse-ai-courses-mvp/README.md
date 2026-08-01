# Cloneshouse AI Courses MVP

One-page landing page + simple automation backend for the Cloneshouse AI for Evaluators course hub.

## What is included

- React + Vite one-page course website
- Node.js + Express API
- MongoDB/Mongoose registration and payment models
- First name / last name registration fields
- Country dropdown
- Phone and WhatsApp fields
- Early bird countdowns
- Course curriculum accordions
- NGN Payment with Paystack
- Paystack/Squad payment-init structure
- Paystack webhook route
- Zoom/email service placeholders
- Optional Google Sheets sync through a Google Apps Script webhook
- Vitest tests

## Apps

- `web/` — React + Vite one-page course page.
- `backend/` — Node.js + Express API with MongoDB models, registration flow, payment-init flow, webhook route, Zoom/email service stubs.

## Local start

Open two terminals.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### Web

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Web runs on `http://localhost:5173`.

## First local test

1. Open `http://localhost:5173`
2. Click **Register**
3. Choose August or September
4. Fill the form
5. Choose Paystack or Squad
6. Because `PAYMENTS_MOCK_MODE=true`, you will be redirected to the local success page.

## Logo

The starter includes `web/public/cloneshouse-logo.svg` as a temporary logo placeholder.

Replace it with the official Cloneshouse logo file when available. Keep the file name as:

```text
web/public/cloneshouse-logo.svg
```

or update the image path in `web/src/App.jsx`.

## Early bird rule

Early bird pricing ends 3 weeks before the course start date.

- August 27, 2026 course → early bird ends August 6, 2026
- September 24, 2026 course → early bird ends September 3, 2026

The backend uses the same rule when calculating the payment amount.

## Optional Google Sheets sync

The app still uses MongoDB for automation reliability, but it can also send registrations and payment updates to Google Sheets so the Cloneshouse team can track learners easily.

Beginner-friendly approach:

1. Create a Google Sheet.
2. Open **Extensions → Apps Script**.
3. Paste a small web app script that receives JSON and appends rows.
4. Deploy the script as a web app.
5. Add the web app URL to `backend/.env`:

```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

If `GOOGLE_SHEETS_WEBHOOK_URL` is empty, the backend logs a mock Google Sheets sync instead.

## Environment variables

Backend variables live in `backend/.env`.

Do not commit real secrets to GitHub.

Important values:

```env
PORT=4000
MONGODB_URI=your_mongodb_atlas_connection_string
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
PAYMENTS_MOCK_MODE=true
PAYSTACK_SECRET_KEY=
PAYSTACK_CALLBACK_URL=http://localhost:5173/payment-success
SQUAD_SECRET_KEY=
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_CALLBACK_URL=http://localhost:5173/payment-success
GOOGLE_SHEETS_WEBHOOK_URL=
EMAIL_FROM=training@cloneshouse.com
```

## Tests

Run backend tests:

```bash
cd backend
npm test
```

The pricing test confirms that the early bird price is used before the deadline and the standard price is used after the deadline.
