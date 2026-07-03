-- =============================================
-- drinks — catalogo drink + voti per bar + proposte moderate.
-- Run in the Supabase SQL Editor on an existing deploy. Idempotent.
-- Catalogo pubblico in lettura; scritture solo via backend (service-role).
-- Le proposte utente finiscono in drink_suggestions e vengono materializzate
-- in drinks solo all'approvazione staff (PATCH status=done).
-- =============================================

-- ---------------------------------------------
-- drinks — approved catalog (seeded + staff-approved proposals)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.drinks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description TEXT CHECK (char_length(description) <= 300),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedupe: "Mojito" == " mojito " — normalized-name uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_drinks_name_lower
  ON public.drinks (lower(trim(name)));

-- ---------------------------------------------
-- drink_suggestions — moderation queue ("proponi un drink")
-- Separate from drinks so rejected proposals never occupy the unique
-- name index and the catalog needs no status filter anywhere.
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.drink_suggestions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  note        TEXT CHECK (char_length(note) <= 300),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'done', 'rejected')),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drink_suggestions_status ON public.drink_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_drink_suggestions_created_at ON public.drink_suggestions(created_at DESC);

-- ---------------------------------------------
-- drink_ratings — one 1–5 vote per (drink, bar, user)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.drink_ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drink_id    UUID NOT NULL REFERENCES public.drinks(id) ON DELETE CASCADE,
  bar_id      UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT drink_ratings_unique UNIQUE (drink_id, bar_id, user_id)
);

-- (drink_id, bar_id) lookups are covered by the UNIQUE's leading columns.
CREATE INDEX IF NOT EXISTS idx_drink_ratings_bar_id ON public.drink_ratings(bar_id);
CREATE INDEX IF NOT EXISTS idx_drink_ratings_user_id ON public.drink_ratings(user_id);

-- ---------------------------------------------
-- drink_bar_summary — pre-aggregated, trigger-maintained.
-- Both rankings ("top bars for drink X", "top drinks at bar Y") are plain
-- ORDER BY queries on this table. Never compute averages in JS.
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.drink_bar_summary (
  drink_id      UUID NOT NULL REFERENCES public.drinks(id) ON DELETE CASCADE,
  bar_id        UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  avg_rating    NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_ratings INTEGER NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (drink_id, bar_id)
);

CREATE INDEX IF NOT EXISTS idx_drink_bar_summary_bar_id ON public.drink_bar_summary(bar_id);

-- Recompute the (drink, bar) pair on every vote mutation. The API never
-- changes drink_id/bar_id on UPDATE (votes are upserted on the full key),
-- so recomputing the NEW pair only is sufficient. Unlike the bar summary
-- (1:1 with bars, zeroed on last delete), here the pair row is DELETEd when
-- the last vote goes away — a 0/0 row would be noise in the rankings.
CREATE OR REPLACE FUNCTION update_drink_bar_summary()
RETURNS TRIGGER AS $$
DECLARE
  target_drink_id UUID;
  target_bar_id   UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_drink_id := OLD.drink_id;
    target_bar_id   := OLD.bar_id;
  ELSE
    target_drink_id := NEW.drink_id;
    target_bar_id   := NEW.bar_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.drink_ratings
    WHERE drink_id = target_drink_id AND bar_id = target_bar_id
  ) THEN
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
  ELSE
    DELETE FROM public.drink_bar_summary
    WHERE drink_id = target_drink_id AND bar_id = target_bar_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_drink_bar_summary ON public.drink_ratings;
CREATE TRIGGER trigger_update_drink_bar_summary
AFTER INSERT OR UPDATE OR DELETE ON public.drink_ratings
FOR EACH ROW EXECUTE FUNCTION update_drink_bar_summary();

-- ---------------------------------------------
-- Row Level Security — public read, no public writes (backend service-role
-- bypasses RLS). drink_suggestions has RLS on and NO policies on purpose:
-- only the backend can touch it, nothing is exposed to the client.
-- ---------------------------------------------
ALTER TABLE public.drinks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_ratings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_bar_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drinks_select_all" ON public.drinks;
CREATE POLICY "drinks_select_all" ON public.drinks FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "drink_ratings_select_all" ON public.drink_ratings;
CREATE POLICY "drink_ratings_select_all" ON public.drink_ratings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "drink_summary_select_all" ON public.drink_bar_summary;
CREATE POLICY "drink_summary_select_all" ON public.drink_bar_summary FOR SELECT USING (TRUE);

-- ---------------------------------------------
-- Seed — i classici. ON CONFLICT DO NOTHING (bare) also catches the
-- expression unique index on lower(trim(name)), keeping the seed idempotent.
-- ---------------------------------------------
INSERT INTO public.drinks (name, description) VALUES
  ('Aperol Spritz',        'Aperol, prosecco, soda'),
  ('Campari Spritz',       'Campari, prosecco, soda'),
  ('Hugo',                 'Prosecco, sciroppo di sambuco, menta, soda'),
  ('Negroni',              'Gin, vermouth rosso, bitter Campari'),
  ('Negroni Sbagliato',    'Prosecco, vermouth rosso, bitter Campari'),
  ('Americano',            'Bitter Campari, vermouth rosso, soda'),
  ('Boulevardier',         'Bourbon, vermouth rosso, bitter Campari'),
  ('Mojito',               'Rum bianco, lime, menta, zucchero, soda'),
  ('Caipirinha',           'Cachaça, lime, zucchero di canna'),
  ('Caipiroska',           'Vodka, lime, zucchero di canna'),
  ('Margarita',            'Tequila, triple sec, lime'),
  ('Daiquiri',             'Rum bianco, lime, zucchero'),
  ('Gin Tonic',            'Gin, acqua tonica'),
  ('Gin Lemon',            'Gin, lemonsoda'),
  ('Vodka Tonic',          'Vodka, acqua tonica'),
  ('Vodka Lemon',          'Vodka, lemonsoda'),
  ('Moscow Mule',          'Vodka, ginger beer, lime'),
  ('London Mule',          'Gin, ginger beer, lime'),
  ('Dark ''n'' Stormy',    'Rum scuro, ginger beer, lime'),
  ('Old Fashioned',        'Bourbon, zucchero, angostura'),
  ('Manhattan',            'Whiskey, vermouth rosso, angostura'),
  ('Martini Dry',          'Gin, vermouth dry'),
  ('Espresso Martini',     'Vodka, liquore al caffè, espresso'),
  ('White Russian',        'Vodka, liquore al caffè, panna'),
  ('Black Russian',        'Vodka, liquore al caffè'),
  ('Long Island Iced Tea', 'Vodka, gin, rum, tequila, triple sec, cola'),
  ('Sex on the Beach',     'Vodka, liquore alla pesca, succo di arancia e mirtillo'),
  ('Tequila Sunrise',      'Tequila, succo di arancia, granatina'),
  ('Piña Colada',          'Rum bianco, cocco, ananas'),
  ('Bloody Mary',          'Vodka, succo di pomodoro, spezie'),
  ('Mimosa',               'Prosecco, succo di arancia'),
  ('Bellini',              'Prosecco, purea di pesca bianca'),
  ('Rossini',              'Prosecco, purea di fragola'),
  ('Paloma',               'Tequila, soda al pompelmo, lime'),
  ('Whiskey Sour',         'Whiskey, lime, zucchero'),
  ('Amaretto Sour',        'Amaretto, limone, zucchero'),
  ('Gimlet',               'Gin, cordiale al lime'),
  ('Cosmopolitan',         'Vodka, triple sec, mirtillo rosso, lime'),
  ('Cuba Libre',           'Rum, cola, lime'),
  ('Mai Tai',              'Rum, orzata, curaçao, lime'),
  ('Jägerbomb',            'Jägermeister, energy drink')
ON CONFLICT DO NOTHING;
