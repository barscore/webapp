-- =============================================
-- fix_security_report.sql — correzioni dell'audit di sicurezza (REPORT.md, 17/9/2026)
-- Da eseguire nel SQL Editor di Supabase DOPO fix_rls_hardening.sql e
-- add_rating_replies.sql. Idempotente.
--
--   CRIT-01 / HIGH-02  free drink: un solo riscatto per account, atomico, legato al bar
--   HIGH-04            SECURITY DEFINER con search_path fisso
--   HIGH-05            PR sugli eventi solo dopo approvazione del creatore
--   MED-06             get_nearby_bars unica (sponsor + free drink)
-- =============================================

-- ---------------------------------------------------------------------------
-- CRIT-01 / HIGH-02 — registro dei riscatti.
-- UNIQUE(user_id) è la garanzia vera del «un drink per account»: anche se un
-- token venisse rigenerato per sbaglio, il secondo riscatto non passa.
-- SET NULL (non CASCADE): la riga serve alla rendicontazione del bar anche dopo
-- la cancellazione dell'account, e senza user_id non identifica più nessuno.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.free_drink_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  bar_id      UUID REFERENCES public.bars(id) ON DELETE SET NULL,
  redeemed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_free_drink_redemptions_bar
  ON public.free_drink_redemptions(bar_id, redeemed_at DESC);

-- RLS on, nessuna policy: la tocca solo il backend (service-role).
ALTER TABLE public.free_drink_redemptions ENABLE ROW LEVEL SECURITY;

-- Chi ha già un token e lo aveva già usato prima di questa migrazione non è
-- ricostruibile: si parte da qui.

-- Riscatto atomico: la UPDATE condizionale sul token è insieme il controllo e
-- il consumo, quindi due scansioni concorrenti non possono passare entrambe.
-- Ritorna uno stato invece di sollevare errori, così il token consumato da un
-- riscatto doppio resta consumato (un RAISE annullerebbe anche la UPDATE).
CREATE OR REPLACE FUNCTION public.redeem_free_drink(p_token UUID, p_bar_id UUID, p_owner_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_user UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bars
    WHERE id = p_bar_id AND owner_id = p_owner_id
      AND is_active = TRUE AND accepts_free_drinks = TRUE
  ) THEN
    RETURN 'bar_not_eligible';
  END IF;

  -- Il proprietario non si riscatta il drink da solo nel suo locale.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_owner_id AND free_drink_token = p_token) THEN
    RETURN 'self';
  END IF;

  UPDATE public.profiles SET free_drink_token = NULL
  WHERE free_drink_token = p_token
  RETURNING id INTO v_user;

  IF v_user IS NULL THEN
    RETURN 'invalid';
  END IF;

  BEGIN
    INSERT INTO public.free_drink_redemptions (user_id, bar_id, redeemed_by)
    VALUES (v_user, p_bar_id, p_owner_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'already_redeemed';
  END;

  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_free_drink(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- HIGH-05 — un PR si candida, il creatore dell'evento approva.
-- NULL = in attesa. Le righe già presenti restano visibili (approvate adesso):
-- non si possono distinguere a posteriori, e sparire di colpo dagli eventi
-- sarebbe peggio per i PR legittimi. Lo staff può rimuoverle.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_prs' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.event_prs ADD COLUMN approved_at TIMESTAMPTZ;
    UPDATE public.event_prs SET approved_at = created_at;
  END IF;
END $$;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'new_event', 'event_reminder', 'event_updated', 'event_cancelled',
    'request_approved', 'request_rejected', 'claim_approved', 'claim_rejected',
    'content_removed', 'account_restricted', 'rating_reply',
    'pr_request', 'pr_approved'));

-- ---------------------------------------------------------------------------
-- MED-06 — get_nearby_bars unica: add_free_drink_acceptance.sql e
-- add_sponsor_radius.sql se la ridefinivano a vicenda togliendosi le colonne.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_nearby_bars(double precision, double precision, double precision);
CREATE FUNCTION public.get_nearby_bars(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  id UUID, name TEXT, address TEXT, city TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  avg_overall NUMERIC, total_ratings INTEGER,
  sponsored BOOLEAN,
  accepts_free_drinks BOOLEAN, free_drinks_hours TEXT,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.city, b.lat, b.lng,
    COALESCE(s.avg_overall, 0),
    COALESCE(s.total_ratings, 0),
    COALESCE(b.boost_until > NOW(), FALSE) AS sponsored,
    b.accepts_free_drinks,
    b.free_drinks_hours,
    ROUND((ST_Distance(
      ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::NUMERIC, 2)::DOUBLE PRECISION AS distance_km
  FROM public.bars b
  LEFT JOIN public.bar_ratings_summary s ON s.bar_id = b.id
  WHERE b.is_active = TRUE
    AND (
      ST_DWithin(
        ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000
      )
      OR (
        b.boost_until > NOW()
        AND b.sponsor_radius_km IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
          LEAST(b.sponsor_radius_km, 50) * 1000
        )
      )
    )
  ORDER BY COALESCE(b.boost_until > NOW(), FALSE) DESC, distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, extensions, pg_temp;

-- ---------------------------------------------------------------------------
-- HIGH-04 — ogni SECURITY DEFINER in public con un search_path fisso.
-- Si fa sul catalogo e non funzione per funzione: prende anche quelle create
-- a mano o da migrazioni future dimenticate. pg_temp va messo IN FONDO in modo
-- esplicito: se manca, Postgres lo cerca per primo per le tabelle, e
-- `SET search_path = public` da solo lascia aperto lo shadowing con una
-- tabella temporanea. Restano intatte quelle già a '' (handle_new_user) e le
-- funzioni delle estensioni.
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
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c
        WHERE c = 'search_path=""' OR (c LIKE 'search_path=%' AND c LIKE '%pg_temp%')
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.sig);
    RAISE NOTICE 'search_path fissato su %', f.sig;
  END LOOP;
END $$;
