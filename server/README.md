# Backend (SQLite)

Same schema as before: `analysis_logs` table. Uses a single SQLite file locally.

## Setup

1. Install and run:

   ```bash
   cd server
   npm install
   npm run dev
   ```

2. The server creates `data.sqlite` in the `server/` folder and creates the `analysis_logs` table on startup.

3. (Optional) In the project root `.env`, set `VITE_API_URL=http://localhost:3001` so the frontend uses this backend instead of localStorage.

Optional env (in `server/.env`): `SQLITE_PATH` (default `./data.sqlite`), `PORT` (default `3001`).
