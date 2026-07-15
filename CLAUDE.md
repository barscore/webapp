# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**rabar** — interactive map of bars rated by the community on five axes: **prezzo** (price), **qualita_drinks** (drinks quality), **socialita** (vibe), **varieta** (variety), **orari** (opening hours), shown as a radar chart. Italian-language UI/domain terms; keep them in Italian. Three deployables: `frontend/` (React PWA), `backend/` (Hono API), `database/` (Supabase SQL). No paid APIs — maps/venues/geocoding all via free OpenStreetMap (tile, Overpass, Nominatim).

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

Database: paste `database/schema.sql` into the Supabase SQL Editor (full setup), or `database/migrate_to_supabase_auth.sql` if migrating an older deploy. `database/migrate_varieta_orari_drinks.sql` upgrades a 3-axis deploy to the 5-axis schema (qualita_alcol → qualita_drinks + varieta/orari). `database/fix_security.sql` hardens pre-existing deploys (profiles RLS own-row-only, pinned search_path on `handle_new_user`) — new installs get both from `schema.sql`.

## Architecture

**Auth is Supabase Auth, end to end — there is no custom JWT.** The flow that ties everything together:
1. Frontend signs in via `@supabase/supabase-js` (`frontend/src/services/supabase.js`, `hooks/useAuth.js`): email/password or Google OAuth. supabase-js owns session persistence + refresh.
2. The axios client (`frontend/src/services/api.js`) reads the live session in a request interceptor and attaches `Authorization: Bearer <access_token>` to every call.
3. Backend `requireAuth` (`backend/src/middleware/auth.js`) verifies that token with `supabase.auth.getUser(token)`. App roles (`user`/`moderator`/`admin`) are **not** in the token — `requireRole` fetches them from the `profiles` table.

**Two Supabase clients, do not confuse them:**
- Backend (`backend/src/lib/supabase.js`) uses the **service-role key** — bypasses RLS, used for all writes. Never expose it to the frontend.
- Frontend uses only the **anon key** (`VITE_SUPABASE_ANON_KEY`). RLS policies in `schema.sql` exist for any direct anon access, but normal writes go through the backend.

**Profiles are derived, not created by app code.** On any `auth.users` insert (email or OAuth), the `handle_new_user` trigger auto-creates a `profiles` row, deriving/sanitizing a unique username. Don't write profile-creation logic — extend the trigger.

**Rating aggregates are trigger-maintained.** Never compute averages in JS. The `ratings` table has a `trigger_update_ratings_summary` that recomputes `bar_ratings_summary` (avg_prezzo/qualita_drinks/socialita/varieta/orari/overall + total) on every insert/update/delete. Read aggregates from `bar_ratings_summary`; one rating per (bar_id, user_id) is enforced by a unique constraint (insert returns Postgres `23505` → 409 CONFLICT).

**Geo queries use PostGIS RPCs, not JS distance math.** `GET /bars?lat=&lng=&radius_km=` calls the `get_nearby_bars` Postgres function; `/places/*` proxy Overpass/Nominatim through `backend/src/lib/osm.js`. Plain `GET /bars` (no coords) returns up to 500 active bars.

### Backend layout (Hono)
`src/index.js` mounts CORS + logger + `secureHeaders` then `/health`, `/bars`, `/places`. Routes nest: `bars.js` mounts `ratings.js` at `/:id/ratings`. Every route validates input with a Zod schema from `src/schemas/`; `:id`-style path params go through `uuidParam` (`src/schemas/common.js`) for clean 400s. Errors are thrown as `AppError(status, code, message)` (`src/middleware/errorHandler.js`) and serialized to `{ error, code, statusCode }`. Protected routes chain `requireAuth` then `requireRole(...)`.

### Frontend layout (React + Vite)
Routes in `App.jsx`: `/` (Home — map + radius slider + bar list), `/bar/:id` (BarDetail — radar chart + paginated reviews + rating form), `/login`, `/register`. Maps via `react-leaflet`; the radar is a hand-rolled SVG (`components/RadarChart.jsx`, no chart lib). i18n: only `it` ships eagerly, other locales lazy-load via dynamic `import()` (`src/i18n/index.js`). Google Fonts are requested per active theme only (bootstrap script in `index.html` + `useTheme.js` swap the `#rabar-fonts` link). PWA: `manifest.json` + `public/sw.js` (static cache + `public/offline.html`); icons at `public/icons/icon-{192,512}.png`. Optional AdSense (Auto Ads) via `VITE_ADSENSE_CLIENT_ID` — **prior-blocking**: `services/adsense.js` injects the loader only after the user grants consent (`services/consent.js`, banner in `CookieBanner.jsx`, revocable from Settings → Preferenze cookie; a GPC browser signal counts as a standing denial). Static pages `/privacy` + `/tos` (`pages/Privacy.jsx`, `pages/Tos.jsx`; Italian authoritative + English for every other UI language, GDPR + CCPA/CPRA). "segnala un bar" leads flow through public `POST /suggestions` → admin "Segnalazioni" tab; generic "Segnala" reports (account menu → `ReportModal`) flow through auth-only `POST /reports` (table `user_reports`, `database/add_reports.sql`) → admin "Report" tab. Rate limiting: a shared global limiter is wired in `index.js` (`RATE_LIMIT_GLOBAL_MAX`, default 120/min/IP, `/health` exempt); `POST /suggestions`, `POST /reports`, `POST /drinks/suggestions` add a stricter 5/min and the public `POST /bars/resolve` 30/min. SEO lives in `index.html` (meta/OG/Twitter/JSON-LD) + `public/robots.txt` + `public/sitemap.xml` (replace the `rabar.app` domain before deploy).

## Conventions

- **Organizer/PR accounts + eventi + boost** (`database/add_organizers.sql`): role `organizer` (con `profiles.organizer_type`: `pr|organizzatore|proprietario`) si richiede da Settings (form 3 domande → `organizer_requests`) e si approva dal tab admin "Organizzatori" (`/admin/organizers/*`, anche `bar_claims` → `bars.owner_id`). Gli organizer creano/modificano/annullano i **propri** eventi (l'annullamento setta `events.cancelled_at`, mai hard-delete); follow di eventi/organizzatori in `follows` → notifiche in-app (`notifications`, campanella) + Web Push (`web-push`, VAPID, `push_subscriptions`; handler in `sw.js`, toggle in Settings); promemoria ~3h prima via worker in-process (`lib/reminderWorker.js`). Boost a pagamento: Stripe Checkout (`/boosts/*`, prezzi solo server-side da env `BOOST_PRICE_*_CENTS`) + webhook firmato idempotente (`/stripe/webhook`, raw body) → `boost_until` su events/bars; scadenza lazy (`boost_until > NOW()` in query), flag `sponsored` ordinato in cima. `notify()` (`lib/notify.js`) è best-effort: mai far fallire la scrittura chiamante.
- ESM throughout (`"type": "module"` in both package.json). Use `import`, `.js` extensions in relative imports.
- Domain field names stay Italian (`prezzo`, `qualita_drinks`, `socialita`, `varieta`, `orari`, `commento`); ratings are integers 1–5, `commento` ≤ 500 chars. On migrated DBs `varieta`/`orari` are nullable (legacy 3-axis votes) — the summary trigger averages only axes that have votes.
- API error shape is fixed: `{ error, code, statusCode }` — keep it when adding endpoints.
