# FatFood Monorepo Layout

```
.
├─ backend/   # Express + Sequelize API (formerly FatFood/)
└─ frontend/  # Vite + React SPA (formerly FE/)
```

## Getting started

```bash
# Backend API
cd backend
npm install
npm run dev

# Frontend SPA
cd ../frontend
npm install
npm run dev
```

The backend listens on `http://localhost:3000` and serves REST endpoints under `/api`. The frontend runs on `http://localhost:5173` and consumes the backend via `VITE_API_BASE_URL`.

### Environment files

- Backend: `backend/.env` (see `backend/.env.example` for all keys: JWT, VNPAY, VietQR, PayPal, Stripe, etc.).
- Frontend: `frontend/.env` & `frontend/.env.example` (contains `VITE_API_BASE_URL`, Stripe publishable key, etc.).

### Notes

- The legacy folders `FatFood/` and `FE/` were replaced by `backend/` and `frontend/`. If you still have processes running from the old paths, stop them and delete those folders once you copy any local changes.
- When testing webhooks on localhost, expose port 3000 via `ngrok` and configure PayPal/Stripe/VNPAY IPN URLs with the ngrok domain.

## Rate limiting with Kong

- Kong is configured to proxy `/api` through `kong.yml` with `rate-limiting` (5 req/min, 60 req/hr) and `key-auth`. A `local-tester` consumer owns the key `local-demo-key`.
- Run the Kong stack via:
  ```bash
  docker compose up -d
  ```
  This brings up a Postgres database and the Kong gateway that uses it. Kong mounts `kong.yml` in `/kong/declarative`.
- Install [`deck`](https://docs.konghq.com/deck/latest/) or use the Admin API directly, then sync the declarative config:
  ```bash
  deck sync --config deck.yml kong.yml
  ```
  (`deck.yml` points at `http://localhost:8001`.)
- Keep your backend running (`npm run dev` in `backend/`) and call the gateway:
  ```bash
  curl -X POST http://localhost:8000/api/auth/login \
    -H 'Content-Type: application/json' \
    -H 'apikey: local-demo-key' \
    -d '{"identifier":"admin@fastfood.local","password":"wrong"}'
  ```
  Kong enforces both API key validation and rate limiting; missing or invalid `apikey` returns 401/403, while sending >5 valid requests per minute results in `429 Too Many Requests`, preventing brute-force hits against the Express server.
- To stop Kong, run `docker compose down`. Rate limiting thresholds are defined in `kong.yml`; adjust them there if you need different limits.

For ongoing hardening guidance see `docs/security-hardening.md`, which lists Kong-only playbooks.
