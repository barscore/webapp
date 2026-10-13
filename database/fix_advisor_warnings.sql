-- =============================================
-- fix_advisor_warnings.sql — avvisi del Security Advisor di Supabase (13/10/2026)
-- Da eseguire nel SQL Editor di Supabase. Idempotente.
--
--   0011  function_search_path_mutable     get_drink_top_bars, get_leaderboard
--   0028  anon_security_definer_function_executable
--   0029  authenticated_security_definer_function_executable
--           handle_new_user, update_bar_ratings_summary,
--           update_drink_bar_summary                      (funzioni trigger)
--           get_nearby_events                             (la chiama solo il backend)
--
-- Lavora sul catalogo, non funzione per funzione: non dipende dalla firma
-- esatta di quello che c'è sul database e prende anche ciò che una migrazione
-- futura dovesse dimenticare.
--
-- DA RIESEGUIRE dopo un'installazione da zero, e ogni volta che una di queste
-- funzioni viene ricreata: `CREATE OR REPLACE FUNCTION` senza clausola SET
-- azzera il search_path, e un DROP + CREATE riporta i permessi di default
-- (EXECUTE ad anon e authenticated).
--
-- Avvisi lasciati aperti, e perché:
--   * rls_disabled_in_public su spatial_ref_sys, e i tre st_estimatedextent:
--     sono oggetti di PostGIS, di proprietà di supabase_admin — il ruolo del
--     SQL Editor non può alterarli. spatial_ref_sys è la tabella pubblica dei
--     sistemi di riferimento, non contiene dati dell'app.
--   * extension_in_public (postgis, pg_net): spostarle vuol dire ricrearle, e
--     postgis regge le colonne `location` e l'indice GIST di `bars`.
--   * rls_enabled_no_policy: voluto. Sono le tabelle che tocca solo il backend
--     con la service-role; RLS attiva e nessuna policy = nessun accesso dai
--     client.
--   * auth_leaked_password_protection: non è SQL, si attiva dalla dashboard
--     (Authentication → Sign In / Providers → Password).
-- =============================================

-- ---------------------------------------------------------------------------
-- 0011 — search_path fisso su ogni funzione di public che non ce l'ha.
-- fix_security_report.sql lo aveva messo alle sole SECURITY DEFINER; qui si
-- chiude il resto. Stesso valore, già in produzione su get_nearby_bars:
-- PostGIS vive in public, pg_temp va in fondo in modo esplicito (se manca
-- Postgres lo cerca per primo, e una tabella temporanea può fare ombra a una
-- vera). Restano intatte le funzioni che un search_path lo hanno già — anche
-- vuoto, come handle_new_user — e quelle delle estensioni.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.sig);
    RAISE NOTICE 'search_path fissato su %', f.sig;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 0028 / 0029 — funzioni trigger.
-- PostgREST espone come /rest/v1/rpc/<nome> ogni funzione di public su cui il
-- ruolo ha EXECUTE, e Supabase lo concede di default ad anon e authenticated.
-- Una funzione trigger chiamata così fallisce comunque («can only be called as
-- triggers»), ma non c'è motivo che sia raggiungibile.
-- Togliere EXECUTE non ferma i trigger: Postgres controlla quel permesso
-- quando il trigger viene CREATO, non quando scatta. handle_new_user continua
-- a creare il profilo alla registrazione, le due update_* a ricalcolare le
-- medie.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'pg_catalog.trigger'::regtype
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    RAISE NOTICE 'EXECUTE revocato su %', f.sig;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 0028 / 0029 — get_nearby_events.
-- SECURITY DEFINER, quindi gira coi permessi del proprietario saltando la RLS.
-- La chiama una sola cosa: GET /events del backend (routes/events.js), con la
-- service-role. Nessun client la invoca via PostgREST — web, Android e iOS
-- passano tutti dall'API. Stesso trattamento di redeem_free_drink e
-- add_rewarded_view. Il GRANT esplicito serve perché, tolto PUBLIC, il backend
-- non resti appeso a un permesso ereditato.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_nearby_events'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    RAISE NOTICE 'get_nearby_events riservata alla service-role: %', f.sig;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Verifica: le due query devono tornare zero righe.
-- ---------------------------------------------------------------------------
-- Funzioni di public (non di estensione) ancora senza search_path:
--   SELECT p.oid::regprocedure
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prokind = 'f'
--     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass
--                     AND d.objid = p.oid AND d.deptype = 'e')
--     AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c
--                     WHERE c LIKE 'search_path=%');
--
-- SECURITY DEFINER di public (non di estensione) ancora eseguibili da anon:
--   SELECT p.oid::regprocedure
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef
--     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass
--                     AND d.objid = p.oid AND d.deptype = 'e')
--     AND has_function_privilege('anon', p.oid, 'EXECUTE');
