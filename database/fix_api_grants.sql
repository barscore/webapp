-- Permessi dei ruoli dell'API (anon, authenticated) ridotti a quello che
-- PostgREST usa davvero. Audit di sicurezza della webapp, 2026-10-28.
--
-- 1) public.spatial_ref_sys — tabella di PostGIS, di proprietà di
--    supabase_admin, con la RLS spenta e INSERT/UPDATE/DELETE concessi ad anon:
--    con la anon key, che è pubblica, chiunque poteva cancellare lo SRID 4326
--    via /rest/v1/spatial_ref_sys e rompere le RPC geografiche. `postgres` non
--    è il proprietario: non può né revocare né accendere la RLS. Può però
--    creare trigger (ha il privilegio TRIGGER), e un trigger di istruzione
--    BEFORE scatta anche quando la riga non c'è: ogni scrittura dai ruoli
--    dell'API viene rifiutata. Gli aggiornamenti di PostGIS girano come
--    supabase_admin e passano. L'advisor continuerà a segnalare "RLS
--    disabled": è atteso, la protezione è il trigger.
--
-- 2) TRUNCATE, TRIGGER, REFERENCES, MAINTAIN su tutte le tabelle nostre:
--    PostgREST non li usa mai, e TRUNCATE salta la RLS. Revocati anche dai
--    default, così le tabelle nuove nascono senza.
--
-- 3) app_settings.updated_by: la riga è leggibile da anon (i client ci leggono
--    manutenzione e beta) e il campo pubblicava l'id dell'admin. Il backend
--    non lo scrive più; chi ha cambiato cosa sta in admin_audit.
--
-- Rilanciabile. Applicata in prod il 2026-10-28 (MCP) e verificata.

-- 1 ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_api_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'permission denied for table %', TG_TABLE_NAME USING ERRCODE = '42501';
  END IF;
  RETURN NULL;
END;
$$;

-- Un trigger non controlla EXECUTE quando scatta: si toglie a tutti, così la
-- funzione non è chiamabile da nessun'altra parte.
REVOKE EXECUTE ON FUNCTION public.block_api_writes() FROM PUBLIC, anon, authenticated;

-- CREATE OR REPLACE e non DROP + CREATE: DROP TRIGGER vuole il proprietario
-- della tabella (supabase_admin), CREATE OR REPLACE solo il privilegio TRIGGER.
CREATE OR REPLACE TRIGGER spatial_ref_sys_block_api_writes
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.spatial_ref_sys
  FOR EACH STATEMENT EXECUTE FUNCTION public.block_api_writes();

-- 2 ---------------------------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p', 'v', 'm')
       AND c.relowner = current_user::regrole
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON public.%I FROM anon, authenticated',
      t.relname
    );
  END LOOP;
END;
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLES FROM anon, authenticated;

-- 3 ---------------------------------------------------------------------------
UPDATE public.app_settings SET updated_by = NULL WHERE updated_by IS NOT NULL;
