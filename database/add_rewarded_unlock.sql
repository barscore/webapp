-- rabar — sblocco del tema «mar7yyy» guardando i rewarded AdMob.
--
-- Il contatore stava nelle preferenze locali dei due client (DataStore su
-- Android, UserDefaults su iOS): reinstallare l'app, cambiare telefono o
-- svuotare i dati azzerava i 10 annunci già guardati. Da qui vive su
-- `profiles`, quindi segue l'account.
--
-- Solo la service-role key (il backend) tocca la colonna: l'incremento passa
-- da POST /me/rewarded → add_rewarded_view(), che è l'unico modo di scriverla
-- e alza il conteggio di uno alla volta fino al tetto. Con la sola anon key un
-- client non può regalarsi il tema con un UPDATE.
--
-- Idempotente: si può rieseguire.

-- 1) Il conteggio -------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rewarded_count SMALLINT NOT NULL DEFAULT 0;

-- 2) L'unico modo di incrementarlo --------------------------------------------
-- Il tetto (10) è lo stesso numero di AdsManager.REWARDS_FOR_THEME (Android) e
-- Config.rewardsForTheme (iOS): oltre lo sblocco non c'è niente da contare, e
-- un contatore che non cresce all'infinito è anche il limite naturale a un
-- client che ripete la chiamata.
CREATE OR REPLACE FUNCTION public.add_rewarded_view(p_user UUID)
RETURNS SMALLINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET rewarded_count = LEAST(rewarded_count + 1, 10)
   WHERE id = p_user
  RETURNING rewarded_count;
$$;

-- SECURITY DEFINER senza REVOKE sarebbe una scorciatoia per chiunque abbia la
-- anon key: la funzione la chiama solo il backend.
REVOKE ALL ON FUNCTION public.add_rewarded_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_rewarded_view(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.add_rewarded_view(UUID) FROM authenticated;
