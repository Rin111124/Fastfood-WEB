# QuickBite Frontend

Vite + React SPA for the FatFood platform. The UI now mirrors a modern admin/staff dashboard experience (inspired by DashStack) and consumes JSON APIs exposed by `../FatFood`.

## Getting started

```bash
cd FE
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`. Configure the backend base URL through `.env`:

```
VITE_API_BASE_URL=http://localhost:3000
```

You can tweak the request timeout with `VITE_API_TIMEOUT_MS`.

## Highlights

- Role-based dashboards (admin/staff) with responsive cards, charts (Chart.js), and live order/inventory listings.
- Shared `apiFetch` wrapper injects JWT tokens persisted via `lib/session`.
- Bootstrap 5 + custom gradients/“glass” cards for a DashStack-style look & feel.

## Scripts

- `npm run dev` – start the Vite dev server.
- `npm run build` – production build (code-splits charts/components).
- `npm run preview` – preview the production build locally.
