-- =============================================
-- fix_rls_hardening.sql — chiude la scrittura diretta via anon key.
-- Da eseguire una volta nel SQL Editor di Supabase. schema.sql porta le stesse
-- policy per le installazioni nuove. Idempotente: si può rieseguire.
--
-- IL PROBLEMA
-- Alla creazione del progetto Supabase esegue
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
-- quindi il ruolo `authenticated` ha UPDATE su TUTTE le colonne di ogni tabella.
-- L'unico freno è RLS, che però è row-level, non column-level: la policy
--   CREATE POLICY "profiles_update_own" ON public.profiles
--     FOR UPDATE USING (auth.uid() = id);
-- non ha WITH CHECK, e senza WITH CHECK Postgres riusa la USING come check —
-- che verifica solo che la riga resti la propria, mai QUALE colonna cambia.
--
-- La anon key è pubblica per definizione: sta nel bundle web, nell'APK e in
-- chiaro in ios/Rabar/Config/Config.swift. Con quella e una sessione valida
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', session.user.id)
-- passa, e l'utente si ritrova il pannello admin: requireRole('admin')
-- (backend/src/middleware/auth.js:65) legge il ruolo proprio da `profiles`.
-- Stesso vettore, stessa riga, altre colonne: `plus_until` (rabar+ gratis a
-- vita), `banned = FALSE` (auto-sblocco dopo un ban), `suspended_until`,
-- `rewarded_count` (tema sbloccato senza guardare un annuncio),
-- `organizer_type`.
--
-- VERIFICATO PRIMA DI DROPPARE: nessun client scrive mai su `profiles`. Le
-- uniche occorrenze sono letture — webapp/frontend/src/hooks/useAuth.js (role,
-- plus_until), components/BanBanner.jsx (stato di moderazione),
-- pages/Maintenance.jsx (polling del ruolo),
-- android/.../data/auth/AuthManager.kt e ios/.../Data/Auth/AuthManager.swift
-- (loadRole) — tutte `.select()`. Le policy di SELECT restano intatte.
-- =============================================

-- 1) profiles: via la UPDATE diretta ---------------------------------------
-- Il profilo lo scrivono solo il trigger handle_new_user (SECURITY DEFINER,
-- gira come owner) e il backend con la service-role key.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- 2) ratings e bookmarks: via le scritture dirette ---------------------------
-- Un ban non revoca l'access token già emesso: requireAuth
-- (backend/src/middleware/auth.js:29) blocca l'utente sull'API, ma PostgREST
-- no — l'utente bannato continua a votare andando dritto al database. Lo
-- stesso percorso salta il kill switch `ratings_enabled`, `maintenance_mode`,
-- `beta_mode` e OGNI rate limit. Le policy di SELECT (ratings_select_all,
-- bookmarks_select_own, …) restano: sono letture e non espongono niente di
-- privato.
DROP POLICY IF EXISTS "ratings_insert_own"   ON public.ratings;
DROP POLICY IF EXISTS "ratings_update_own"   ON public.ratings;
DROP POLICY IF EXISTS "ratings_delete_own"   ON public.ratings;
DROP POLICY IF EXISTS "bookmarks_insert_own" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_delete_own" ON public.bookmarks;

-- 3) Difesa in profondità: togliere anche il privilegio ----------------------
-- Senza policy nessuna scrittura passa, ma una policy futura scritta male
-- riaprirebbe la porta da sola. Il REVOKE la chiude un livello più sotto: il
-- privilegio di tabella manca, e RLS non c'entra più. Tutte le scritture
-- dell'app passano dal backend con la service-role key, che è `BYPASSRLS` e
-- non è toccata da questi REVOKE. Il SELECT resta concesso: le letture dirette
-- dei client (ruolo, stato di moderazione, salvati) continuano a funzionare.
REVOKE INSERT, UPDATE, DELETE ON public.profiles  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ratings   FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bookmarks FROM anon, authenticated;

-- 4) notifications: due tipi per il DSA -------------------------------------
-- L'art. 17 del DSA vuole che l'utente sappia PERCHÉ un suo contenuto è stato
-- rimosso o il suo account limitato. Oggi la moderazione è muta: senza questi
-- due tipi la notifica non è nemmeno scrivibile (il CHECK la rifiuta).
-- Il constraint è inline nella CREATE TABLE di add_organizers.sql:80-82, quindi
-- Postgres lo ha chiamato `notifications_type_check`; si droppa e si riscrive
-- per intero perché un CHECK non si estende sul posto.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'new_event', 'event_reminder', 'event_updated', 'event_cancelled',
    'request_approved', 'request_rejected', 'claim_approved', 'claim_rejected',
    'content_removed', 'account_restricted'));
