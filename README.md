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
