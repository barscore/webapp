# PRD — rabar

**Progetto**: rabar
**Versione**: 1.0
**Stato**: Bozza
**Data**: 2026-06-30

---

## 1. Sommario Esecutivo

**Obiettivo**: Gli utenti non hanno un modo rapido per valutare un bar su dimensioni che contano davvero — quanto costa bere, la qualità degli alcolici e la "vibe" sociale del locale. Le app esistenti (Google Maps, TripAdvisor) offrono una valutazione generica. rabar risolve questo con un radar chart specifico per bar.

**Destinatari**: Giovani adulti (18-35 anni) che frequentano locali, vogliono sapere dove andare la sera e si fidano delle opinioni della community più che delle guide ufficiali.

**Valore Aggiunto**: Nessuna app esistente mostra queste tre metriche specifiche su mappa in modo visivo e immediato. L'interfaccia radar chart è più ricca di un semplice voto numerico e la community alimenta i dati senza dipendere da redazioni esterne.

---

## 2. Dominio Applicativo e Risorse

**Risorsa principale**: Bar / Locale

| Attributo | Tipo | Descrizione | Vincoli |
|-----------|------|-------------|---------|
| id | UUID | Identificatore univoco | PK, auto-generato |
| name | TEXT | Nome del locale | 2-100 caratteri, obbligatorio |
| address | TEXT | Indirizzo completo | Obbligatorio |
| city | TEXT | Città | Obbligatorio |
| lat / lng | FLOAT | Coordinate geografiche | Obbligatorio, range valido |
| osm_node_id | BIGINT | ID OpenStreetMap (sorgente dati gratuita) | Unico, opzionale |
| google_place_id | TEXT | ID Google Places (legacy, non usato) | Unico, opzionale |
| is_active | BOOLEAN | Bar attivo/visibile | Default TRUE |

**Risorsa secondaria**: Rating

| Attributo | Tipo | Descrizione | Vincoli |
|-----------|------|-------------|---------|
| prezzo | SMALLINT | Valutazione prezzo (1=costoso, 5=economico) | 1-5, obbligatorio |
| qualita_alcol | SMALLINT | Qualità alcolici | 1-5, obbligatorio |
| socialita | SMALLINT | Frequentazione/atmosfera | 1-5, obbligatorio |
| commento | TEXT | Recensione testuale | Max 500 caratteri, opzionale |

**Relazioni**:
- Un `bar` ha molti `ratings` (1:N)
- Un `user` può avere un solo `rating` per bar (unique `bar_id, user_id`)
- Ogni `bar` ha un `bar_ratings_summary` (1:1, aggiornato via trigger)

---

## 3. Requisiti Funzionali

### Autenticazione & Profilazione
- Registrazione con email, password e username (Supabase Auth)
- Login email/password + **Google OAuth** (`signInWithOAuth`)
- Sessione e refresh token gestiti da Supabase (trasparenti)
- Profilo auto-creato via trigger `handle_new_user` su `auth.users`
- Backend verifica l'access token Supabase (`auth.getUser`)
- Ruoli: `user` (default), `moderator`, `admin` (letti da `profiles`)

### Logica di Business (Core)
- **Mappa**: tutti i bar attivi con marker colorato per `avg_overall`
- **Bar vicini**: filtro per raggio (default 2km) via PostGIS `get_nearby_bars`
- **Dettaglio bar**: radar chart + info + lista valutazioni paginata
- **Valutazione**: utente autenticato vota 3 dimensioni (un voto per bar)
- **Aggiornamento voto**: l'utente modifica il proprio voto
- **Media automatica**: trigger PostgreSQL aggiorna `bar_ratings_summary`

### Validazione Input (Zod)
- Email valida · Password 8-64 · Username 3-30 alfanumerico
- Valutazioni intere 1-5 · Commento max 500

### UI/UX
- **Home**: mappa + slider raggio + lista bar
- **BarDetail**: scheda scorrevole con radar, info, recensioni, form voto
- **Login/Register**: form mobile-friendly
- **PWA**: installabile, offline fallback

---

## 4. Requisiti Tecnici

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind |
| Mappa | react-leaflet + OpenStreetMap (tile gratuiti) |
| Dati locali | OpenStreetMap — Overpass (bar) + Nominatim (geocoding), gratuiti |
| Grafici | recharts (RadarChart) |
| Backend | Hono.js (Node.js 20) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Validazione | Zod |
| Database | Supabase (PostgreSQL 15 + PostGIS) |
| Container | Docker + Docker Compose |
| Monetizzazione | Google AdSense |

### Sicurezza
- Credenziali e hashing password gestiti da Supabase Auth (GoTrue)
- Access token Supabase verificato lato backend (`auth.getUser`)
- Sessione/refresh gestiti da Supabase (rotazione automatica)
- `anon` key sul frontend, `service_role` solo sul backend
- RLS abilitata su Supabase (policy su `auth.uid()`; backend usa service role)
- CORS con whitelist del dominio frontend
- Validazione/sanitizzazione input via Zod

### Infrastruttura
- Backend in container `node:20-alpine`, `docker-compose up --build`
- Frontend build statico Vite (Cloudflare Pages / Vercel)
- Supabase hosted

### Monitoraggio
- `GET /health`: status, uptime, timestamp
- Error handler centralizzato con codici HTTP
- Log su stdout (Docker-friendly)

---

## 5. Requisiti Non Funzionali

**Prestazioni**: risposta API < 300ms; markers caricati per raggio; immagini da CDN.
**Affidabilità**: refresh token trasparente; offline fallback PWA; trigger DB garantisce consistenza aggregati.
**Portabilità**: PWA su iOS/Android; backend Docker su qualsiasi host Linux.

---

## 6. Casi d'Uso

1. Utente non registrato vede la mappa dei bar in zona.
2. Utente non registrato vede il radar chart di un bar.
3. Utente registrato valuta un bar su prezzo, qualità, vibe.
4. Utente registrato aggiorna la propria valutazione.
5. Utente mobile installa rabar come app.
6. Admin aggiunge nuovi bar.

---

## 7. Documentazione e Consegna

- **API**: commenti inline nelle route; tabella endpoint nel README.
- **Avvio**: README — "Avvio rapido".
- **Schema DB**: `database/schema.sql` commentato.
- **Env**: `.env.example` per frontend e backend.
