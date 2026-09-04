-- =============================================
-- rate_limits — store condiviso per il rate limiting.
-- Da eseguire nel SQL Editor di Supabase su un deploy esistente. Idempotente.
--
-- backend/src/middleware/rateLimiter.js tiene i bucket in una `Map` di
-- processo. Andava bene sul singolo container; su Vercel Fluid compute no: le
-- istanze sono più d'una e scendono a zero quando non c'è traffico, quindi il
-- contatore si azzera a ogni cold start e si moltiplica per il numero di
-- istanze vive. I limiti su cui il codice conta davvero — POST /suggestions e
-- POST /reports a 5/min, POST /bars/resolve a 30/min che è ANONIMO e inserisce
-- righe in `bars` — sono quindi indicativi, non reali: basta far girare le
-- richieste su abbastanza istanze per moltiplicarli.
--
-- Il contatore va dove lo stato è già condiviso, cioè qui. Solo il backend con
-- la service-role key chiama le funzioni: RLS attiva, zero policy, REVOKE su
-- entrambe le funzioni.
-- =============================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  -- Chiave del bucket costruita dal chiamante: "<rotta>:<ip>" o "<rotta>:<uid>".
  bucket_key TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  reset_at   TIMESTAMPTZ NOT NULL
);

-- Serve alla sola pulizia (prune_rate_limits): le letture per bucket passano
-- dalla primary key.
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- RLS on, nessuna policy: solo la service-role key (backend) tocca la tabella.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- --- Un colpo sul bucket ----------------------------------------------------
-- Deve essere ATOMICA. SELECT-poi-UPDATE è la versione rotta: due richieste
-- concorrenti leggono lo stesso `count`, lo trovano sotto il tetto e passano
-- entrambe — proprio sotto il carico che il limite dovrebbe fermare. Qui c'è
-- una sola INSERT ... ON CONFLICT DO UPDATE: la riga è bloccata dal conflitto,
-- l'incremento e la decisione escono dallo stesso RETURNING.
--
-- Finestra fissa, non scorrevole: se `reset_at` è passato la finestra riparta
-- da 1, altrimenti si incrementa lasciando `reset_at` dov'è. È lo stesso
-- comportamento del limiter in memoria, così i due sono intercambiabili.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(
  p_key      TEXT,
  p_window_s INTEGER,
  p_max      INTEGER
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
-- `reset_at` è insieme colonna e parametro di uscita: senza la direttiva qui
-- sopra plpgsql solleverebbe un'ambiguità sul nome dentro la query.
BEGIN
  RETURN QUERY
  WITH hit AS (
    INSERT INTO public.rate_limits AS rl (bucket_key, count, reset_at)
    VALUES (p_key, 1, NOW() + make_interval(secs => p_window_s))
    ON CONFLICT (bucket_key) DO UPDATE
      SET count = CASE WHEN rl.reset_at <= NOW() THEN 1 ELSE rl.count + 1 END,
          reset_at = CASE WHEN rl.reset_at <= NOW()
                          THEN NOW() + make_interval(secs => p_window_s)
                          ELSE rl.reset_at END
    RETURNING rl.count AS hits, rl.reset_at AS window_end
  )
  SELECT hit.hits <= p_max,
         GREATEST(p_max - hit.hits, 0),
         hit.window_end
  FROM hit;
END;
$$;

-- --- Pulizia ----------------------------------------------------------------
-- Un bucket scaduto è inerte (la prossima INSERT lo riusa ripartendo da 1), ma
-- la tabella crescerebbe con ogni IP mai visto. L'ora di grazia evita di
-- cancellare finestre appena chiuse. Da chiamare ogni tanto dal backend o da
-- pg_cron; non è nel percorso della richiesta.
CREATE OR REPLACE FUNCTION public.prune_rate_limits()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH gone AS (
    DELETE FROM public.rate_limits
     WHERE reset_at < NOW() - INTERVAL '1 hour'
    RETURNING 1
  )
  SELECT COUNT(*) FROM gone;
$$;

-- SECURITY DEFINER senza REVOKE sarebbe una scorciatoia per chiunque abbia la
-- anon key: chi può chiamare hit_rate_limit può anche bruciare il bucket di un
-- altro, o azzerare il proprio. Le chiama solo il backend.
REVOKE ALL ON FUNCTION public.hit_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hit_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.hit_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
REVOKE ALL ON FUNCTION public.prune_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_rate_limits() FROM anon;
REVOKE ALL ON FUNCTION public.prune_rate_limits() FROM authenticated;
