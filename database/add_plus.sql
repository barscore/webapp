-- ============================================================================
-- add_plus.sql — rabar+ (piano a pagamento, abbonamento Stripe).
--
-- Cosa sblocca: badge "+" accanto al logo e al nome utente, tutti i temi,
-- niente pubblicità. Prezzi: 1,99 €/settimana, 3,99 €/mese, 29,99 €/anno.
--
-- Il diritto vive su profiles.plus_until: "plus" = plus_until > NOW(), stessa
-- forma della scadenza lazy dei boost (boost_until). Nessun cron: chi disdice
-- resta Plus fino alla fine del periodo già pagato e poi decade da solo.
--
-- La riga di plus_subscriptions è la copia locale dell'abbonamento Stripe,
-- scritta SOLO dal webhook firmato (service-role). Serve al portale di
-- gestione (customer id) e a rendere idempotente il webhook.
--
-- ORDINE: eseguire questo file PRIMA di deployare il nuovo backend e il nuovo
-- frontend. Da qui in poi le query selezionano `profiles.plus_until`, e su un
-- DB senza la colonna PostgREST risponde errore: le recensioni, /me e la
-- lettura del ruolo (quindi il gate beta) smetterebbero di funzionare.
--
-- Da eseguire nel SQL Editor di Supabase.
-- ============================================================================

-- 1) Diritto Plus sul profilo -----------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plus_until TIMESTAMPTZ;

-- Le query pubbliche leggono il flag su liste di profili (classifica,
-- recensioni): indice parziale sui soli abbonati, la tabella resta piccola.
CREATE INDEX IF NOT EXISTS profiles_plus_until_idx
  ON public.profiles (plus_until)
  WHERE plus_until IS NOT NULL;

-- 2) Abbonamenti -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plus_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider               TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe')),
  plan                   TEXT CHECK (plan IN ('week', 'month', 'year')),
  status                 TEXT NOT NULL DEFAULT 'incomplete',
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plus_subscriptions_customer_idx
  ON public.plus_subscriptions (stripe_customer_id);

-- Nessuna policy: la tabella si tocca solo con la service-role key (backend).
-- Con RLS attiva e zero policy la anon key non legge e non scrive nulla.
ALTER TABLE public.plus_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3) Classifica: espone il flag Plus ----------------------------------------
-- Il tipo di ritorno cambia, quindi va ricreata (CREATE OR REPLACE non basta).
DROP FUNCTION IF EXISTS get_leaderboard(INTEGER);

CREATE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID, username TEXT, avatar_url TEXT, ice_cubes BIGINT, plus BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    (COUNT(r.id) * 10)::BIGINT AS ice_cubes,
    (p.plus_until IS NOT NULL AND p.plus_until > NOW()) AS plus
  FROM public.profiles p
  LEFT JOIN public.ratings r ON r.user_id = p.id
  GROUP BY p.id, p.username, p.avatar_url, p.plus_until
  ORDER BY ice_cubes DESC, p.username ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
