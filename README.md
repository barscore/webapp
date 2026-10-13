# rabar 🍺

Mappa interattiva dei bar con valutazioni comunitarie su **prezzo**, **qualità dei drinks** e **socialità**.

## Tech Stack

- **Frontend**: React (Vite) + Tailwind + react-leaflet + recharts — PWA installabile
- **Backend**: Hono.js + JWT + Zod — containerizzato con Docker
- **Database**: Supabase (PostgreSQL + PostGIS)

## Prerequisiti

- Node.js 20+
- Docker & Docker Compose
- Account Supabase

> **Nessuna API a pagamento.** Mappa, dati dei bar e geocoding usano solo
> OpenStreetMap (tile OSM, Overpass, Nominatim) — gratuiti, senza chiave.

## Avvio rapido

### 1. Configura il database

1. Crea un progetto su [supabase.com](https://supabase.com)
2. **SQL Editor** → incolla ed esegui `database/schema.sql`
   (se avevi già applicato la vecchia versione: esegui invece `database/migrate_to_supabase_auth.sql`)
3. Copia URL e chiavi da **Project Settings → API** (servono `anon` key e `service_role` key)

> **Auth via Supabase Auth**: registrazione/login (email+password e Google)
> sono gestiti da Supabase Auth. La tabella `profiles` estende `auth.users` ed è
> popolata in automatico dal trigger `handle_new_user`. Il backend verifica
> l'access token Supabase (`auth.getUser`) e usa la **service role key** per le
> scritture: non esporre mai quella chiave al frontend (nel frontend va la `anon` key).

### 1b. Abilita Google OAuth

1. Supabase → **Authentication → Providers → Google** → abilita
2. Crea credenziali OAuth su [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (tipo *Web application*)
3. **Authorized redirect URI**: incolla quello mostrato da Supabase
   (`https://<project>.supabase.co/auth/v1/callback`)
4. Incolla **Client ID** + **Client Secret** in Supabase
5. Supabase → **Authentication → URL Configuration** → aggiungi
   `http://localhost:5173` (e il dominio di produzione) ai *Redirect URLs*

### 2. Variabili d'ambiente

```bash
cp backend/.env.example backend/.env     # compila tutte le variabili
cp frontend/.env.example frontend/.env   # compila tutte le variabili
```

- Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (solo la `anon` key!)

### 3a. Backend con Docker (consigliato)

```bash
cd backend
docker-compose up --build
```

API su `http://localhost:3000`.

### 3b. Backend manuale

```bash
cd backend
npm install
node src/index.js
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App su `http://localhost:5173`.

> Per la PWA in produzione: `npm run build` e servi `frontend/dist/`. Le icone vanno in
> `frontend/public/icons/icon-192.png` e `icon-512.png` (referenziate da `manifest.json`).

## Endpoint principali

| Metodo | Path | Descrizione | Auth |
|--------|------|-------------|------|
| GET | /health | Health check | — |
| GET | /bars | Lista bar (filtro geo: `lat`, `lng`, `radius_km`) | — |
| GET | /bars/:id | Dettaglio bar | — |
| POST | /bars | Crea bar | admin/moderator |
| PUT | /bars/:id | Aggiorna bar | admin/moderator |
| DELETE | /bars/:id | Elimina bar | admin |
| GET | /bars/:id/ratings | Valutazioni (paginate: `page`, `limit`) | — |
| POST | /bars/:id/ratings | Inserisci valutazione | utente |
| PUT | /bars/:id/ratings/:rid | Aggiorna propria valutazione | utente |
| DELETE | /bars/:id/ratings/:rid | Elimina propria valutazione | utente |
| GET | /places/nearby | Bar vicini da OpenStreetMap (`lat`, `lng`, `radius_km`) | — |
| GET | /places/search | Geocoding indirizzo via Nominatim (`q`) | — |

### Formato errore

```json
{ "error": "Descrizione", "code": "CODICE_ERRORE", "statusCode": 400 }
```

## Autenticazione

Gestita da **Supabase Auth** lato frontend (`@supabase/supabase-js`):
email/password (`signInWithPassword` / `signUp`) e **Google** (`signInWithOAuth`).
Il frontend invia l'access token Supabase nell'header `Authorization: Bearer`;
il backend lo verifica con `auth.getUser`. Il ruolo (`user`/`moderator`/`admin`)
è letto dalla tabella `profiles` per gli endpoint protetti. Nessun token JWT
custom: refresh e sessione sono gestiti da Supabase.

## PWA

Installabile su mobile via "Aggiungi alla schermata Home". Service worker
(`public/sw.js`) gestisce cache statica e pagina offline (`public/offline.html`).

## AdSense

Cinque variabili, lette da Vite **al build** (in produzione stanno nelle Environment
Variables del progetto Vercel: cambiarle richiede un redeploy):
`VITE_ADSENSE_CLIENT_ID` (`ca-pub-XXXX`), `VITE_ADSENSE_SLOT_LIST` +
`VITE_ADSENSE_LAYOUT_KEY_LIST` (In-feed, elenco bar), `VITE_ADSENSE_SLOT_BAR`
(In-article, scheda bar), `VITE_ADSENSE_SLOT_BOARD` (Display, classifica). Senza client
id non si carica nulla; uno slot vuoto non viene renderizzato.

Lo script lo inietta `src/services/adsense.js`, non `index.html`. Il consenso lo
raccoglie il messaggio «Regolamenti europei» di AdSense (Privacy e messaggi), che
arriva con lo script: non c'è un banner cookie nostro. Per sapere se un build ha gli
annunci: `grep -c adsbygoogle` sul bundle `assets/index-*.js` — zero vuol dire che le
variabili erano vuote al build.

## Struttura

```
rabar/
├── backend/      # Hono.js API (Docker)
├── frontend/     # React + Vite PWA
├── database/     # schema.sql Supabase/PostgreSQL
├── README.md
└── PRD.md
```
