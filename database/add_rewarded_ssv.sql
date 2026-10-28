-- rabar — rewarded AdMob verificati lato server (SSV).
--
-- Fino a qui una visione la contava POST /me/rewarded, cioè l'app che dice «l'ho
-- guardato»: bastava chiamarla dieci volte per avere il tema mar7yyy. Con SSV la
-- conta Google: a ricompensa data chiama GET /admob/ssv con una firma ECDSA, il
-- backend la verifica e passa da qui. POST /me/rewarded (con ADMOB_SSV=1) non
-- incrementa più: aspetta il callback, lo «riscatta» e risponde col conteggio.
--
-- Solo la service-role key (il backend) tocca tabella e funzioni.
-- Idempotente: si può rieseguire.

-- 1) Le transazioni già contate ------------------------------------------------
-- La chiave primaria è l'antireplay: Google ritenta lo stesso callback finché non
-- riceve un 200, e un callback copiato non deve valere due volte.
CREATE TABLE IF NOT EXISTS public.rewarded_ssv (
  transaction_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rewarded_ssv_unclaimed
  ON public.rewarded_ssv (user_id, created_at) WHERE NOT claimed;
CREATE INDEX IF NOT EXISTS rewarded_ssv_created_at
  ON public.rewarded_ssv (created_at);

ALTER TABLE public.rewarded_ssv ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rewarded_ssv FROM anon, authenticated;

-- 2) Callback verificato → visione contata -------------------------------------
-- Inserimento e incremento nella stessa transazione: un ritento dopo una
-- scrittura a metà non può né contare due volte né perdere la visione.
-- Pota le righe oltre i due giorni: il backend scarta comunque i callback più
-- vecchi di un giorno, quindi oltre non servono all'antireplay.
CREATE OR REPLACE FUNCTION public.record_rewarded_ssv(p_transaction TEXT, p_user UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RETURN 'no_user';
  END IF;

  INSERT INTO public.rewarded_ssv (transaction_id, user_id)
  VALUES (p_transaction, p_user)
  ON CONFLICT (transaction_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN 'duplicate';
  END IF;

  PERFORM public.add_rewarded_view(p_user);

  DELETE FROM public.rewarded_ssv WHERE created_at < NOW() - INTERVAL '2 days';
  RETURN 'ok';
END;
$$;

-- 3) La risposta all'app ---------------------------------------------------------
-- Segna come riscattato il callback più vecchio non ancora riscattato di
-- quell'utente, arrivato da `p_since` in poi. Vero se ce n'era uno.
CREATE OR REPLACE FUNCTION public.claim_rewarded_ssv(p_user UUID, p_since TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH next AS (
    SELECT transaction_id
      FROM public.rewarded_ssv
     WHERE user_id = p_user AND NOT claimed AND created_at >= p_since
     ORDER BY created_at
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.rewarded_ssv r
     SET claimed = TRUE
    FROM next
   WHERE r.transaction_id = next.transaction_id
  RETURNING TRUE;
$$;

REVOKE ALL ON FUNCTION public.record_rewarded_ssv(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_rewarded_ssv(TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.record_rewarded_ssv(TEXT, UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_rewarded_ssv(UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_rewarded_ssv(UUID, TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION public.claim_rewarded_ssv(UUID, TIMESTAMPTZ) FROM authenticated;
