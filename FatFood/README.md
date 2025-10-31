## FatFood API

This project now runs purely as a REST API that powers the standalone frontend in `../FE`.

### Getting started

```bash
cd FatFood
npm install
npm run dev
```

The server listens on `http://localhost:3000` by default. Adjust the port via the `PORT` entry in `.env`.

### Configuration

- `CLIENT_ORIGIN` or `CLIENT_ORIGINS` lists the allowed frontend origins (comma separated).
- `JWT_SECRET`, `JWT_EXPIRES_IN`, and `JWT_ISSUER` secure access tokens issued during authentication.

### Health check

```
GET http://localhost:3000/health
```

Use the `/api` namespace (for example `/api/auth/login`) to connect your frontend.

### API overview

- `GET /api/health` – service heartbeat.
- Auth: `POST /api/auth/login`, `POST /api/auth/signup`.
- Admin (token required): `GET /api/admin/dashboard`, CRUD endpoints under `/api/admin/users`, `GET /api/admin/staff`.
- Staff workspace (token required): `GET /api/staff/dashboard`.

Extend these endpoints or add new ones under `src/route/api` as the React frontend evolves.
