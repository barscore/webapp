-- =========================================================================
-- FIX DEFINITIVO PERMESSI TRIGGERS (Correzione Errore 500 su DELETE /me)
-- Esegui questo file nel tuo database Supabase (nella sezione SQL Editor).
-- =========================================================================

-- Il sistema interno di Supabase (supabase_auth_admin) cancella l'utente.
-- Questo scatena la cancellazione a cascata del profilo e delle recensioni.
-- Ma le recensioni scatenano i trigger per ricalcolare le medie.
-- Senza "SECURITY DEFINER", il sistema di autenticazione fallisce perché non 
-- ha i privilegi per modificare le tabelle riepilogative pubbliche, e va in errore 500.

CREATE OR REPLACE FUNCTION public.update_bar_ratings_summary()
RETURNS TRIGGER AS $$
DECLARE
  target_bar_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_bar_id := OLD.bar_id;
  ELSE
    target_bar_id := NEW.bar_id;
  END IF;

  INSERT INTO public.bar_ratings_summary (
    bar_id, avg_prezzo, avg_qualita_drinks, avg_socialita,
    avg_varieta, avg_orari, avg_overall, total_ratings, last_updated
  )
  SELECT
    target_bar_id,
    ROUND(AVG(prezzo)::NUMERIC, 2),
    ROUND(AVG(qualita_drinks)::NUMERIC, 2),
    ROUND(AVG(socialita)::NUMERIC, 2),
    COALESCE(ROUND(AVG(varieta)::NUMERIC, 2), 0),
    COALESCE(ROUND(AVG(orari)::NUMERIC, 2), 0),
    ROUND((
      (AVG(prezzo) + AVG(qualita_drinks) + AVG(socialita)
        + COALESCE(AVG(varieta), 0) + COALESCE(AVG(orari), 0))
      / (3 + CASE WHEN COUNT(varieta) > 0 THEN 1 ELSE 0 END
           + CASE WHEN COUNT(orari) > 0 THEN 1 ELSE 0 END)
    )::NUMERIC, 2),
    COUNT(*),
    NOW()
  FROM public.ratings
  WHERE bar_id = target_bar_id
  ON CONFLICT (bar_id) DO UPDATE SET
    avg_prezzo          = EXCLUDED.avg_prezzo,
    avg_qualita_drinks  = EXCLUDED.avg_qualita_drinks,
    avg_socialita       = EXCLUDED.avg_socialita,
    avg_varieta         = EXCLUDED.avg_varieta,
    avg_orari           = EXCLUDED.avg_orari,
    avg_overall         = EXCLUDED.avg_overall,
    total_ratings       = EXCLUDED.total_ratings,
    last_updated        = EXCLUDED.last_updated;

  IF TG_OP = 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM public.ratings WHERE bar_id = target_bar_id
  ) THEN
    UPDATE public.bar_ratings_summary
    SET avg_prezzo = 0, avg_qualita_drinks = 0, avg_socialita = 0,
        avg_varieta = 0, avg_orari = 0,
        avg_overall = 0, total_ratings = 0, last_updated = NOW()
    WHERE bar_id = target_bar_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.update_drink_bar_summary()
RETURNS TRIGGER AS $$
DECLARE
  target_drink_id UUID;
  target_bar_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_drink_id := OLD.drink_id;
    target_bar_id := OLD.bar_id;
  ELSE
    target_drink_id := NEW.drink_id;
    target_bar_id := NEW.bar_id;
  END IF;

  INSERT INTO public.drink_bar_summary (
    drink_id, bar_id, avg_rating, total_ratings, last_updated
  )
  SELECT
    target_drink_id,
    target_bar_id,
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*),
    NOW()
  FROM public.drink_ratings
  WHERE drink_id = target_drink_id AND bar_id = target_bar_id
  ON CONFLICT (drink_id, bar_id) DO UPDATE SET
    avg_rating    = EXCLUDED.avg_rating,
    total_ratings = EXCLUDED.total_ratings,
    last_updated  = EXCLUDED.last_updated;

  IF TG_OP = 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM public.drink_ratings 
    WHERE drink_id = target_drink_id AND bar_id = target_bar_id
  ) THEN
    UPDATE public.drink_bar_summary
    SET avg_rating = 0, total_ratings = 0, last_updated = NOW()
    WHERE drink_id = target_drink_id AND bar_id = target_bar_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
