# Eventi: account PR/organizzatore, follow + notifiche, boost sponsorizzati

**Data:** 2026-07-15 · **Stato:** approvato

## Obiettivo

Estendere la sezione Eventi esistente: i PR, gli organizzatori e i proprietari di attività possono registrarsi come tali (con verifica admin), pubblicare eventi, essere seguiti dagli utenti (che ricevono notifiche) e acquistare boost a pagamento via Stripe che mettono in evidenza eventi e bar ("Sponsorizzato", in cima alla lista).

## Contesto esistente

- `events` (tabella + `get_nearby_events` PostGIS) e route `backend/src/routes/events.js` esistono già; CRUD oggi solo admin/moderator. Il commento in `events.js` prevedeva già un futuro ruolo per i locali.
- Ruoli in `profiles.role`: `user | betatester | moderator | admin` (CHECK).
- `Admin.jsx` è a tab; pattern approvazione già usato per suggestions/reports/drinks.
- PWA con `sw.js` presente, **senza** gestione push.
- Rate limiting: globale 120/min + 5/min sui form pubblici (pattern da riusare).

## Architettura scelta (approccio A)

Tutta la logica nuova vive nel backend Hono esistente: scheduler promemoria in-process, invio Web Push (lib `web-push` + VAPID), Stripe Checkout + webhook. Scadenza boost lazy (filtro in query, nessun cron). Alternative scartate: pg_cron + Edge Functions (logica e secrets su due runtime), consegna monolitica senza fasi (il piano potrà comunque fasare).

## 1. Database — `database/add_organizers.sql`

### Ruolo

- `profiles.role`: CHECK esteso con `'organizer'`.
- `profiles.organizer_type TEXT CHECK (organizer_type IN ('pr','organizzatore','proprietario'))`, nullable (valorizzato solo per organizer).

### Tabelle nuove

- **`organizer_requests`** — richiesta upgrade account:
  `id`, `user_id → profiles`, `requested_type` (stesso CHECK di `organizer_type`), `proof TEXT NOT NULL` (≤1000), `channels TEXT[] NOT NULL` (valori ammessi: `instagram, facebook, x, telegram, whatsapp, tiktok, volantinaggio, altro`), `channels_other TEXT` (≤200, richiesto se `altro` selezionato), `collaborations TEXT NOT NULL` (≤1000), `status` (`pending|approved|rejected`, default `pending`), `reviewed_by → profiles`, `reviewed_at`, `admin_note TEXT`, `created_at`.
  Indice parziale unico su `user_id WHERE status = 'pending'` → max 1 richiesta pendente (violazione → 409).
- **`bar_claims`** — rivendicazione proprietà bar:
  `id`, `user_id → profiles`, `bar_id → bars`, `proof TEXT NOT NULL` (≤1000), `status` (`pending|approved|rejected`), `reviewed_by`, `reviewed_at`, `admin_note`, `created_at`.
  Indice parziale unico su `(user_id, bar_id) WHERE status = 'pending'`.
- **`follows`** — `id`, `user_id → profiles`, `event_id → events ON DELETE CASCADE` (nullable), `organizer_id → profiles ON DELETE CASCADE` (nullable), `created_at`.
  `CHECK` esattamente uno tra `event_id`/`organizer_id` valorizzato; UNIQUE `(user_id, event_id)` e `(user_id, organizer_id)`.
- **`notifications`** — `id`, `user_id → profiles ON DELETE CASCADE`, `type` (`new_event | event_reminder | event_updated | event_cancelled | request_approved | request_rejected | claim_approved | claim_rejected`), `title TEXT`, `body TEXT`, `link TEXT` (path interno, es. `/bar/<id>`), `read BOOLEAN DEFAULT FALSE`, `created_at`.
  Indice `(user_id, created_at DESC)`.
- **`push_subscriptions`** — `id`, `user_id → profiles ON DELETE CASCADE`, `endpoint TEXT UNIQUE NOT NULL`, `p256dh TEXT NOT NULL`, `auth TEXT NOT NULL`, `created_at`.
- **`boost_orders`** — `id`, `user_id → profiles`, `event_id → events` (nullable), `bar_id → bars` (nullable, CHECK esattamente uno), `tier` (`3d|7d|30d`), `amount_cents INT NOT NULL`, `stripe_session_id TEXT UNIQUE`, `status` (`pending|paid`), `created_at`, `paid_at`.

### Colonne nuove

- `bars.owner_id UUID REFERENCES profiles ON DELETE SET NULL` — un proprietario per bar, settato dall'approvazione del claim.
- `events.cancelled_at TIMESTAMPTZ` — l'"eliminazione" da parte dell'organizer è un annullamento: la riga resta, i follower vengono notificati, l'evento sparisce dalle liste pubbliche. L'hard delete resta agli admin.
- `events.reminder_sent_at TIMESTAMPTZ` — il promemoria si manda una sola volta per evento (a tutti i follower insieme).
- `events.boost_until TIMESTAMPTZ` e `bars.boost_until TIMESTAMPTZ` — scadenza lazy: nessun job, le query filtrano/ordinano con `boost_until > NOW()`. Acquisti sovrapposti: `boost_until = GREATEST(NOW(), boost_until) + durata`.

### RPC aggiornate

`get_nearby_events` e `get_nearby_bars`: aggiungono al SELECT il flag `sponsored` (`boost_until > NOW()`), ordinano sponsorizzati prima (poi `starts_at` / distanza come oggi) ed escludono gli eventi con `cancelled_at NOT NULL`. Stesse regole nelle query non-geo (`GET /events`, `GET /bars` senza coordinate).

### RLS

Come il resto del progetto: scritture solo dal backend (service-role). SELECT own-row-only (`auth.uid() = user_id`) su `organizer_requests`, `bar_claims`, `follows`, `notifications`, `push_subscriptions`, `boost_orders`.

## 2. Backend (Hono)

### Route nuove

| Route | Auth | Note |
|---|---|---|
| `GET /me/organizer-request` | auth | ultima richiesta + stato |
| `POST /me/organizer-request` | auth, 5/min | valida con Zod; 409 se pending; vietata se già organizer |
| `GET /me/claims` | auth | claims propri |
| `POST /bars/:id/claim` | auth + organizer, 5/min | 409 se pending; 409 se bar già con owner |
| `GET /admin/organizer-requests` | admin/mod | lista con risposte complete |
| `POST /admin/organizer-requests/:id/approve` | admin/mod | setta `role='organizer'` + `organizer_type`; notifica `request_approved` |
| `POST /admin/organizer-requests/:id/reject` | admin/mod | con `admin_note` opzionale; notifica `request_rejected` |
| `GET /admin/bar-claims` + `approve/reject` | admin/mod | approve setta `bars.owner_id`; notifiche `claim_*` |
| `PUT /follows` / `DELETE /follows` | auth | body `{ event_id }` o `{ organizer_id }`; idempotenti |
| `GET /me/follows` | auth | per stato bottoni "Segui" |
| `GET /notifications` | auth | paginata, `?unread_count=true` per il badge |
| `POST /notifications/read` | auth | `{ ids }` o `{ all: true }` |
| `POST /push/subscribe` / `DELETE /push/subscribe` | auth | upsert/delete per `endpoint` |
| `GET /boosts/tiers` | pubblica | `[{tier, days, amount_cents}]` da env |
| `POST /boosts/checkout` | auth + organizer | crea Checkout Session (`price_data` inline, metadata `{order_id}`); ownership: evento → `created_by = user`, bar → `owner_id = user`; evento passato o annullato → 400 |
| `POST /stripe/webhook` | firma Stripe | vedi sotto |

### Modifiche a `events.js`

- `POST /events`: `requireRole('organizer','moderator','admin')`. Se `created_by` è un organizer → notifica `new_event` ai follower dell'organizzatore.
- `PUT /events/:id`: organizer solo su eventi propri (`created_by`), admin/mod su tutti. Modifica a orario/luogo/annullamento → notifica `event_updated` ai follower dell'evento.
- `DELETE /events/:id`: per organizer diventa annullamento (`cancelled_at = NOW()`) + notifica `event_cancelled` ai follower; per admin resta hard delete.

### Infrastruttura

- **`lib/notify.js`** — `notify(userIds, {type,title,body,link})`: insert batch in `notifications` + invio Web Push (lib `web-push`) a tutte le subscription degli utenti; su 404/410 la subscription viene eliminata. Mai notificare l'autore dell'azione.
- **Worker promemoria** — `setInterval` 5 min nel processo Hono: eventi con `starts_at` entro 3h, non annullati, `reminder_sent_at IS NULL`, con almeno un follower → `event_reminder` ai follower + `reminder_sent_at = NOW()`. Se il backend è giù nella finestra, il promemoria parte al riavvio (accettato).
- **Stripe webhook** — montato **prima** del body-parsing JSON (serve il raw body per `stripe.webhooks.constructEvent`). Su `checkout.session.completed`: ordine → `paid`, `boost_until` esteso sul target. Idempotente via `stripe_session_id UNIQUE`. Esente dal rate limiter come `/health`.

### Env nuove

Backend: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BOOST_PRICE_3D_CENTS`, `BOOST_PRICE_7D_CENTS`, `BOOST_PRICE_30D_CENTS`. Frontend: `VITE_VAPID_PUBLIC_KEY`. Aggiornare i due `.env.example`.

Dipendenze nuove (backend): `web-push`, `stripe`.

## 3. Frontend (React)

- **Settings → "Account organizzatore"**: mostra stato richiesta (pending/approvata/rifiutata con nota admin) oppure il form a 3 domande:
  1. Tipo account (pr / organizzatore / proprietario) + textarea *"Dimostra che sei un PR/organizzatore"* con esempi nel placeholder (link a evento passato con il tuo nome in locandina, screenshot delle liste/tavoli gestiti, profilo Instagram con storico eventi, lettera/contratto del locale).
  2. *"Con quali canali sposti le persone?"* — chip toggle: Instagram, Facebook, X, Telegram, WhatsApp, TikTok, Volantinaggio, Altro (+ campo testo).
  3. Textarea *"Con quali locali/organizzatori hai collaborato negli ultimi 6 mesi?"*.
- **Settings → toggle "Notifiche push"**: chiede il permesso browser solo al toggle, registra la subscription (`pushManager.subscribe` con `VITE_VAPID_PUBLIC_KEY`), `POST /push/subscribe`. `sw.js`: aggiungere handler `push` (mostra notifica) e `notificationclick` (apre `link`).
- **Campanella** in header/NavTabs con badge non lette → pannello lista notifiche (tap → naviga a `link` + segna letta; azione "segna tutte lette").
- **Tab Eventi**: per organizer, bottone "Crea evento" (form: titolo, descrizione, bar opzionale, data/ora inizio/fine) e sezione "I miei eventi" (modifica / annulla / boost). `EventRow`: badge "Sponsorizzato" (boostati in cima), chip "Segui" evento e "Segui organizzatore" (@username, visibile quando l'evento ha un organizer).
- **BarDetail**: se organizer e bar senza owner → link "Sei il proprietario? Rivendica questo bar" (form proof); se owner → bottone "Boost". Badge "Sponsorizzato" su `BarRow` e `BarSheet`.
- **Flusso boost**: scelta tier (3/7/30 giorni, prezzi da `GET /boosts/tiers`) → redirect a Stripe Checkout → ritorno su `/boost/esito?session_id=…` con conferma (stato letto dal backend, non dal query param).
- **Banner promo boost**: dismissibile (localStorage), visibile solo ad account organizer, nel tab Eventi: invito ad acquistare un boost.
- **Admin → tab "Organizzatori"**: due liste — richieste ruolo (con le 3 risposte complete) e rivendicazioni bar — con approve/reject + nota.
- i18n: stringhe nuove in `it` eager; altre lingue lazy come oggi. Nomi dominio in italiano (`sponsorizzato`, `segui`, `boost`).

## 4. Sicurezza e casi limite

- Prezzi solo server-side; il client manda solo `tier` + target. Firma webhook obbligatoria; `STRIPE_SECRET_KEY` e VAPID privata mai nel frontend.
- Webhook idempotente (`stripe_session_id UNIQUE`): i retry di Stripe non raddoppiano il boost.
- Form ruolo/claim: rate limit 5/min, 1 pending per utente (constraint DB → 409 `CONFLICT`), errori nel formato standard `{ error, code, statusCode }`.
- Un rifiuto non blocca richieste future; l'admin può revocare il ruolo dal tab Utenti esistente.
- Evento boostato ma annullato → escluso dalle liste (l'annullamento vince); boost su evento passato → 400.
- Modifiche evento dopo il promemoria → i follower ricevono comunque `event_updated`.
- Utente organizer eliminato → eventi restano (`created_by SET NULL`, comportamento già esistente).
- Push: permesso chiesto solo su azione esplicita; nessun dato personale nel payload push oltre titolo/body dell'evento.

## 5. Verifica

Nessuna test suite nel progetto. Verifica manuale end-to-end per flusso (richiesta → approvazione → creazione evento → follow → notifica → boost). Webhook in locale con `stripe listen --forward-to localhost:3000/stripe/webhook` (Stripe CLI, chiavi test). Push testabile su `localhost` (service worker già attivo in dev).

## Fuori scope (esplicito)

- Claim multipli/multi-proprietario per bar, trasferimento proprietà.
- Pagina profilo pubblica dell'organizzatore.
- Rimborsi/annullamento boost, fatturazione, abbonamenti.
- Notifiche email.

## Nota pre-deploy

La rotazione della service-role key (leak 2026-07) è ancora pendente: va fatta **prima** di deployare queste modifiche.
