# Copilot Instructions for Fastfood-WEB

## Project Overview

This monorepo powers a food ordering platform with:
- **FatFood** (`FatFood/`): Node.js REST API backend (Express, Sequelize)
- **FE** (`FE/`): Vite + React SPA frontend

The backend and frontend are decoupled, communicating via JSON APIs. The backend exposes `/api/*` endpoints, while the frontend consumes these using a shared API client.

## Key Workflows

### Backend (FatFood)
- **Start dev server:**
  ```cmd
  cd FatFood
  npm install
  npm run dev
  ```
- **API base URL:** `http://localhost:3000` (configurable via `.env`)
- **Health check:** `GET /api/health`
- **Extend API:** Add routes/controllers under `src/route/api` and `src/controllers/api/`
- **Database:** Sequelize migrations in `src/migrations/`, models in `src/models/`
- **Config:** `src/config/config.json` and `.env` for secrets, origins, and port

### Frontend (FE)
- **Start dev server:**
  ```cmd
  cd FE
  npm install
  npm run dev
  ```
- **API base URL:** Set `VITE_API_BASE_URL` in `.env`
- **Role-based UI:** Admin/staff dashboards, live data via API
- **API client:** Use `src/services/apiClient.js` and `lib/session` for JWT auth
- **Build:** `npm run build` (code-splits charts/components)

## Patterns & Conventions
- **API endpoints:** All under `/api/*`, grouped by role (auth, admin, staff)
- **JWT Auth:** Tokens issued by backend, persisted in frontend session
- **Migrations/Seeders:** Use sequentially numbered files in `src/migrations/` and `src/seeders/`
- **Frontend routing:** React Router, pages in `src/pages/`, routes in `src/routes/`
- **Styling:** Bootstrap 5 + custom gradients/glass cards
- **Charts:** Chart.js for dashboard analytics

## Integration Points
- **Frontend <-> Backend:** All communication via REST API, CORS origins set in backend config
- **Session management:** JWT stored in frontend, injected into API requests
- **Live updates:** Frontend polls API for live order/inventory data

## Examples
- **Add new API route:**
  - Backend: `src/route/api/newFeature.js`, controller in `src/controllers/api/newFeatureController.js`
  - Frontend: Call via `apiClient.js`, display in `src/pages/NewFeature.jsx`
- **Add migration:**
  - Create `src/migrations/0021-migration-description.js` following existing pattern

## References
- Backend: `FatFood/README.md`
- Frontend: `FE/README.md`
- API client: `FE/src/services/apiClient.js`
- Session: `FE/src/lib/session.js`

---

If any section is unclear or missing, please provide feedback to improve these instructions.
