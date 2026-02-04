# Data AI Dashboard – Deploy on Render

One Web Service on Render: frontend + API on the same URL. Uses PostgreSQL when `DATABASE_URL` is set.

## Quick deploy

1. **Create a Web Service** (not Static Site) in Render and connect your repo.
2. **Root Directory:** leave default (project root).
3. **Environment:** Node.
4. **Build Command:**
   ```bash
   npm install && npm run build && cd server && npm install
   ```
5. **Start Command:**
   ```bash
   node server/index.js
   ```
6. **Environment variables** (in Render dashboard):
   - `DATABASE_URL` – from Render PostgreSQL (Internal URL), or leave unset for SQLite (not recommended on Render).
   - `REGISTRATION_KEY` – your secret for sign-up (e.g. `1234567`).
   - `VITE_API_URL` – optional; set to your Render URL (e.g. `https://your-service.onrender.com`) or leave empty for same-origin.

## PostgreSQL

- Create a **PostgreSQL** instance in Render and connect it to this Web Service.
- Copy the **Internal Database URL** into `DATABASE_URL`.
- Tables (`users`, `analysis_logs`) are created on first start from `server/init-db-pg.sql`.

## Switching database

- **PostgreSQL:** set `DATABASE_URL=postgresql://...`
- **SQLite (local):** do not set `DATABASE_URL`; server uses `server/data.sqlite`

No code changes; only env vars.

## Local run (same port)

From project root:

```bash
npm run start
```

Builds the frontend and starts the server. Open http://localhost:3001 (app + API).
