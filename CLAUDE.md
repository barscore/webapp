# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**rabar** — interactive map of bars rated by the community on three axes: **prezzo** (price), **qualita_alcol** (alcohol quality), **socialita** (vibe), shown as a radar chart. Italian-language UI/domain terms; keep them in Italian. Three deployables: `frontend/` (React PWA), `backend/` (Hono API), `database/` (Supabase SQL). No paid APIs — maps/venues/geocoding all via free OpenStreetMap (tile, Overpass, Nominatim).

## Commands

Backend (`cd backend`):
- `npm run dev` — run with `--watch` (auto-reload)
- `npm start` — run once
- `docker-compose up --build` — containerized, API on `:3000`

Frontend (`cd frontend`):
- `npm run dev` — Vite dev server on `:5173`
- `npm run build` — static build to `dist/`
- `npm run preview` — serve the build

No test suite, no linter configured. Both apps need their `.env` filled first (`cp .env.example .env` in each dir).

Database: paste `database/schema.sql` into the Supabase SQL Editor (full setup), or `database/migrate_to_supabase_auth.sql` if migrating an older deploy.

## Architecture

**Auth is Supabase Auth, end to end — there is no custom JWT.** The flow that ties everything together:
1. Frontend signs in via `@supabase/supabase-js` (`frontend/src/services/supabase.js`, `hooks/useAuth.js`): email/password or Google OAuth. supabase-js owns session persistence + refresh.
2. The axios client (`frontend/src/services/api.js`) reads the live session in a request interceptor and attaches `Authorization: Bearer <access_token>` to every call.
3. Backend `requireAuth` (`backend/src/middleware/auth.js`) verifies that token with `supabase.auth.getUser(token)`. App roles (`user`/`moderator`/`admin`) are **not** in the token — `requireRole` fetches them from the `profiles` table.

**Two Supabase clients, do not confuse them:**
- Backend (`backend/src/lib/supabase.js`) uses the **service-role key** — bypasses RLS, used for all writes. Never expose it to the frontend.
- Frontend uses only the **anon key** (`VITE_SUPABASE_ANON_KEY`). RLS policies in `schema.sql` exist for any direct anon access, but normal writes go through the backend.

**Profiles are derived, not created by app code.** On any `auth.users` insert (email or OAuth), the `handle_new_user` trigger auto-creates a `profiles` row, deriving/sanitizing a unique username. Don't write profile-creation logic — extend the trigger.

**Rating aggregates are trigger-maintained.** Never compute averages in JS. The `ratings` table has a `trigger_update_ratings_summary` that recomputes `bar_ratings_summary` (avg_prezzo/qualita/socialita/overall + total) on every insert/update/delete. Read aggregates from `bar_ratings_summary`; one rating per (bar_id, user_id) is enforced by a unique constraint (insert returns Postgres `23505` → 409 CONFLICT).

**Geo queries use PostGIS RPCs, not JS distance math.** `GET /bars?lat=&lng=&radius_km=` calls the `get_nearby_bars` Postgres function; `/places/*` proxy Overpass/Nominatim through `backend/src/lib/osm.js`. Plain `GET /bars` (no coords) returns up to 500 active bars.

### Backend layout (Hono)
`src/index.js` mounts CORS + logger then `/health`, `/bars`, `/places`. Routes nest: `bars.js` mounts `ratings.js` at `/:id/ratings`. Every route validates input with a Zod schema from `src/schemas/`. Errors are thrown as `AppError(status, code, message)` (`src/middleware/errorHandler.js`) and serialized to `{ error, code, statusCode }`. Protected routes chain `requireAuth` then `requireRole(...)`. Note: `src/middleware/rateLimiter.js` exists but is not wired into `index.js`.

### Frontend layout (React + Vite)
Routes in `App.jsx`: `/` (Home — map + radius slider + bar list), `/bar/:id` (BarDetail — radar chart + paginated reviews + rating form), `/login`, `/register`. Maps via `react-leaflet`, radar via `recharts`. PWA: `manifest.json` + `public/sw.js` (static cache + `public/offline.html`); icons at `public/icons/icon-{192,512}.png`. Optional AdSense via `VITE_ADSENSE_CLIENT_ID` alone — `AdBanner` injects the loader script at runtime when the id is set, else shows a placeholder (no `index.html` edit needed). Static pages `/privacy` + `/tos` (`pages/Privacy.jsx`, `pages/Tos.jsx`); "segnala un bar" leads flow through public `POST /suggestions` → admin "Segnalazioni" tab. Rate limiting: a shared global limiter is wired in `index.js` (`RATE_LIMIT_GLOBAL_MAX`, default 120/min/IP, `/health` exempt); `POST /suggestions` adds a stricter 5/min. SEO lives in `index.html` (meta/OG/Twitter/JSON-LD) + `public/robots.txt` + `public/sitemap.xml` (replace the `rabar.app` domain before deploy).

## Conventions

- ESM throughout (`"type": "module"` in both package.json). Use `import`, `.js` extensions in relative imports.
- Domain field names stay Italian (`prezzo`, `qualita_alcol`, `socialita`, `commento`); ratings are integers 1–5, `commento` ≤ 500 chars.
- API error shape is fixed: `{ error, code, statusCode }` — keep it when adding endpoints.
