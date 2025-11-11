## FatFood API

This folder contains the Node.js/Express REST API that powers the standalone frontend in `../frontend`.

### Getting started

```bash
cd backend
npm install
npm run dev
```

The server listens on `http://localhost:3000` by default. Adjust the port via the `PORT` entry in `.env`.

### Realtime chat + chatbot

- Realtime Socket.IO is enabled. The backend creates rooms for `staff` and `user:<id>`.
- Customer endpoints:
  - `GET /api/customer/support/conversation/messages`
  - `POST /api/customer/support/conversation/messages` (auto-reply bot + optional LLM fallback)
- Staff endpoints:
  - `GET /api/staff/support/messages`
  - `GET /api/staff/support/metrics` (unreplied count)
  - `POST /api/staff/support/:messageId/reply` (pushes realtime to the customer)

To enable LLM fallback (optional), set these in `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=15000
```

If `OPENAI_API_KEY` is not set, the bot uses rule-based replies only.

### Configuration

- `CLIENT_ORIGIN` or `CLIENT_ORIGINS` lists the allowed frontend origins (comma separated).
- `JWT_SECRET`, `JWT_EXPIRES_IN`, and `JWT_ISSUER` secure access tokens issued during authentication.

### Health check

```
GET http://localhost:3000/health
```

Use the `/api` namespace (for example `/api/auth/login`) to connect your frontend.

### API overview

- `GET /api/health` — service heartbeat.
- Auth: `POST /api/auth/login`, `POST /api/auth/signup`.
- Admin (token required): `GET /api/admin/dashboard`, CRUD endpoints under `/api/admin/users`, `GET /api/admin/staff`.
- Staff workspace (token required): `GET /api/staff/dashboard`.

Extend these endpoints or add new ones under `src/routes/api` as the React frontend evolves.

### Payment integrations

The backend exposes several payment options. Configure the environment variables in `.env`:

- **VNPAY**: `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL`, `VNP_IPN_URL`.
- **VietQR / Bank transfer** (manual): `VIETQR_BANK`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`.
- **PayPal**: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, optional `PAYPAL_*_REDIRECT` URLs, and `PAYPAL_CURRENCY`.
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` (default `vnd`). The frontend also needs `VITE_STRIPE_PUBLISHABLE_KEY`.

Routes:

- `/api/payments/vnpay/*` — VNPay create/return/IPN helpers.
- `/api/payments/paypal/create|return|cancel|webhook`.
- `/api/payments/stripe/create-intent` (customer token required) and `/api/payments/stripe/webhook`.
- `/api/payments/vietqr/*` and `/api/payments/cod/create` for manual/COD flows.

Admin users can reconcile transactions through `GET /api/admin/payments` and update statuses via `PATCH /api/admin/payments/:paymentId/status`.
