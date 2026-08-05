-- =============================================
-- Migration: rename qualita_alcol → qualita_drinks and add the two new
-- rating axes "varieta" and "orari".
--
-- Run this in the Supabase SQL Editor on an EXISTING deploy.
-- Fresh installs should use schema.sql (already updated) and skip this file.
-- =============================================

BEGIN;

-- 1. Rename the drinks-quality axis.
ALTER TABLE public.ratings
  RENAME COLUMN qualita_alcol TO qualita_drinks;
ALTER TABLE public.bar_ratings_summary
  RENAME COLUMN avg_qualita_alcol TO avg_qualita_drinks;

-- 2. New axes. Nullable on purpose: legacy votes never expressed them and
--    AVG() ignores NULLs, so old ratings keep counting on the other axes.
ALTER TABLE public.ratings
  ADD COLUMN varieta SMALLINT CHECK (varieta BETWEEN 1 AND 5),
  ADD COLUMN orari   SMALLINT CHECK (orari BETWEEN 1 AND 5);

ALTER TABLE public.bar_ratings_summary
  ADD COLUMN avg_varieta NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN avg_orari   NUMERIC(3,2) DEFAULT 0;

-- 3. Recreate the summary trigger function for the 5 axes. avg_overall
--    averages only the axes that actually have votes, so bars with only
--    legacy 3-axis ratings are not dragged down by the new axes.
CREATE OR REPLACE FUNCTION update_bar_ratings_summary()
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
    avg_prezzo         = EXCLUDED.avg_prezzo,
    avg_qualita_drinks = EXCLUDED.avg_qualita_drinks,
    avg_socialita      = EXCLUDED.avg_socialita,
    avg_varieta        = EXCLUDED.avg_varieta,
    avg_orari          = EXCLUDED.avg_orari,
    avg_overall        = EXCLUDED.avg_overall,
    total_ratings      = EXCLUDED.total_ratings,
    last_updated       = EXCLUDED.last_updated;

  -- If the last rating was deleted, zero the summary.
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
$$ LANGUAGE plpgsql;

-- 4. Recompute every existing summary with the new formula/columns.
INSERT INTO public.bar_ratings_summary (
  bar_id, avg_prezzo, avg_qualita_drinks, avg_socialita,
  avg_varieta, avg_orari, avg_overall, total_ratings, last_updated
)
SELECT
  bar_id,
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
GROUP BY bar_id
ON CONFLICT (bar_id) DO UPDATE SET
  avg_prezzo         = EXCLUDED.avg_prezzo,
  avg_qualita_drinks = EXCLUDED.avg_qualita_drinks,
  avg_socialita      = EXCLUDED.avg_socialita,
  avg_varieta        = EXCLUDED.avg_varieta,
  avg_orari          = EXCLUDED.avg_orari,
  avg_overall        = EXCLUDED.avg_overall,
  total_ratings      = EXCLUDED.total_ratings,
  last_updated       = EXCLUDED.last_updated;

COMMIT;
