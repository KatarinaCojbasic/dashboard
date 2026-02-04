# Deploy on Render (one place: app + API + PostgreSQL)

One Web Service serves the built frontend and the API on the same URL. PostgreSQL is used when `DATABASE_URL` is set.

## 1. Environment (one place)

In Render **Dashboard → Your Web Service → Environment**, add:

| Key | Value |
|-----|--------|
| **VITE_API_URL** | `https://your-app-name.onrender.com` (your Render service URL; or leave empty for same-origin) |
| **DATABASE_URL** | (from Render PostgreSQL – Internal URL, e.g. `postgresql://...`) |
| **REGISTRATION_KEY** | Your secret key for sign-up (e.g. `1234567`) |

- **VITE_API_URL**: Set to your app’s full URL so the built frontend knows the API base. If the app and API are on the same host (as here), you can leave it empty and the app will use relative `/api`.
- **DATABASE_URL**: Set this to use PostgreSQL (e.g. from Render’s PostgreSQL). Leave unset to use SQLite (not recommended on Render; use PostgreSQL).

## 2. Build & start

- **Build command**: `npm install && npm run build && cd server && npm install`
- **Start command**: `cd server && node index.js`

Or use a single start from root:

- **Build command**: `npm install && npm run build && cd server && npm install`
- **Start command**: `node server/index.js` (run from **root**; ensure `server/node_modules` exists from build)

Recommended: set **Root Directory** to the project root, then:

- **Build**: `npm install && npm run build && cd server && npm install`
- **Start**: `node server/index.js`

(If the start command runs from root, `node server/index.js` finds `server/node_modules` and `dist/` at root.)

## 3. PostgreSQL

- Create a **PostgreSQL** instance in Render and connect it to your Web Service.
- Copy the **Internal Database URL** into **DATABASE_URL**.
- The server runs `init-db-pg.sql` on startup and creates `users` and `analysis_logs` if they don’t exist.

## 4. Switch DB easily

- **PostgreSQL**: set `DATABASE_URL=postgresql://...` (e.g. on Render).
- **SQLite** (local only): do not set `DATABASE_URL`; the server uses `server/data.sqlite`.

No code changes needed; only env vars.
