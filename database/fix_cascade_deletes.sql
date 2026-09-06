-- =========================================================================
-- FIX CASCADE DELETES
-- Esegui questo file nel tuo database Supabase (nella sezione SQL Editor).
-- Risolve un possibile disallineamento (schema drift) in cui le regole di 
-- "ON DELETE CASCADE" per le recensioni e i profili si sono perse o non 
-- sono state create correttamente, lasciando le recensioni "orfane".
-- =========================================================================

-- 1. Pulizia preventiva: eliminiamo eventuali recensioni orfane rimaste nel DB
-- (recensioni di utenti che non esistono più in auth.users)
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.ratings WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.drink_ratings WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.bookmarks WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- 2. Sistemiamo il collegamento da profiles a auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Sistemiamo il collegamento da ratings a profiles
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;
ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Sistemiamo il collegamento da drink_ratings a profiles
ALTER TABLE public.drink_ratings DROP CONSTRAINT IF EXISTS drink_ratings_user_id_fkey;
ALTER TABLE public.drink_ratings
  ADD CONSTRAINT drink_ratings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Sistemiamo il collegamento da bookmarks a profiles
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. Infine, per evitare vecchie medie sballate dai dati orfani appena rimossi,
-- ricalcoliamo a zero le somme per i bar che sono stati affetti
UPDATE public.bar_ratings_summary s
SET 
  avg_prezzo = COALESCE((SELECT ROUND(AVG(prezzo)::NUMERIC, 2) FROM public.ratings r WHERE r.bar_id = s.bar_id), 0),
  avg_qualita_drinks = COALESCE((SELECT ROUND(AVG(qualita_drinks)::NUMERIC, 2) FROM public.ratings r WHERE r.bar_id = s.bar_id), 0),
  avg_socialita = COALESCE((SELECT ROUND(AVG(socialita)::NUMERIC, 2) FROM public.ratings r WHERE r.bar_id = s.bar_id), 0),
  avg_varieta = COALESCE((SELECT ROUND(AVG(varieta)::NUMERIC, 2) FROM public.ratings r WHERE r.bar_id = s.bar_id), 0),
  avg_orari = COALESCE((SELECT ROUND(AVG(orari)::NUMERIC, 2) FROM public.ratings r WHERE r.bar_id = s.bar_id), 0),
  total_ratings = COALESCE((SELECT COUNT(*) FROM public.ratings r WHERE r.bar_id = s.bar_id), 0);

UPDATE public.bar_ratings_summary s
SET avg_overall = ROUND((
      (avg_prezzo + avg_qualita_drinks + avg_socialita 
        + CASE WHEN avg_varieta > 0 THEN avg_varieta ELSE 0 END 
        + CASE WHEN avg_orari > 0 THEN avg_orari ELSE 0 END)
      / (3 + CASE WHEN avg_varieta > 0 THEN 1 ELSE 0 END 
           + CASE WHEN avg_orari > 0 THEN 1 ELSE 0 END)
    )::NUMERIC, 2)
WHERE total_ratings > 0;

UPDATE public.bar_ratings_summary SET avg_overall = 0 WHERE total_ratings = 0;
