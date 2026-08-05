-- =============================================
-- rabar — Complete Supabase/PostgreSQL schema
-- Auth is handled by Supabase Auth (email/password + Google OAuth). `profiles`
-- extends auth.users 1:1 and is auto-populated by the handle_new_user trigger.
-- The backend verifies the Supabase access token (auth.getUser) and uses the
-- service-role key for writes (bypasses RLS). RLS is enabled for direct
-- frontend access via the anon key.
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";   -- geospatial queries

-- =============================================
-- profiles — 1:1 extension of auth.users
-- =============================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 30),
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'betatester', 'moderator', 'admin')),
  -- Moderation state (managed from the admin panel):
  banned          BOOLEAN NOT NULL DEFAULT FALSE,
  suspended_until TIMESTAMPTZ,
  moderation_note TEXT,
  moderated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderated_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile whenever a Supabase auth user is created (email or OAuth).
-- Username: from sign-up metadata if present, else derived from email local part,
-- with a short uid suffix to guarantee uniqueness.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  -- sanitize + clamp to 3..30 chars
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF char_length(base_username) < 3 THEN
    base_username := 'user_' || substr(NEW.id::text, 1, 6);
  END IF;
  base_username := substr(base_username, 1, 24);

  final_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := base_username || '_' || substr(NEW.id::text, 1, 5);
  END IF;

  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- bars — venue records
-- =============================================
CREATE TABLE public.bars (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  address           TEXT NOT NULL,
  city              TEXT NOT NULL,
  country           TEXT NOT NULL DEFAULT 'IT',
  lat               DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng               DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  google_place_id   TEXT UNIQUE,
  osm_node_id       BIGINT UNIQUE,
  phone             TEXT,
  website           TEXT,
  opening_hours     JSONB,
  cover_image_url   TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bars_location ON public.bars USING GIST (
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);
CREATE INDEX idx_bars_city ON public.bars(city);
CREATE INDEX idx_bars_google_place_id ON public.bars(google_place_id);

-- =============================================
-- ratings — community votes
-- =============================================
CREATE TABLE public.ratings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id          UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prezzo          SMALLINT NOT NULL CHECK (prezzo BETWEEN 1 AND 5),
  qualita_drinks  SMALLINT NOT NULL CHECK (qualita_drinks BETWEEN 1 AND 5),
  socialita       SMALLINT NOT NULL CHECK (socialita BETWEEN 1 AND 5),
  varieta         SMALLINT NOT NULL CHECK (varieta BETWEEN 1 AND 5),
  orari           SMALLINT NOT NULL CHECK (orari BETWEEN 1 AND 5),
  commento        TEXT CHECK (char_length(commento) <= 500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratings_unique_user_bar UNIQUE (bar_id, user_id)
);

CREATE INDEX idx_ratings_bar_id ON public.ratings(bar_id);
CREATE INDEX idx_ratings_user_id ON public.ratings(user_id);

-- =============================================
-- bar_ratings_summary — pre-aggregated, trigger-maintained
-- =============================================
CREATE TABLE public.bar_ratings_summary (
  bar_id              UUID PRIMARY KEY REFERENCES public.bars(id) ON DELETE CASCADE,
  avg_prezzo          NUMERIC(3,2) DEFAULT 0,
  avg_qualita_drinks  NUMERIC(3,2) DEFAULT 0,
  avg_socialita       NUMERIC(3,2) DEFAULT 0,
  avg_varieta         NUMERIC(3,2) DEFAULT 0,
  avg_orari           NUMERIC(3,2) DEFAULT 0,
  avg_overall         NUMERIC(3,2) DEFAULT 0,
  total_ratings       INTEGER DEFAULT 0,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recompute summary on every rating mutation.
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
    -- Average only the axes that have votes: rows migrated from the 3-axis
    -- era have NULL varieta/orari and must not drag the overall down.
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

CREATE TRIGGER trigger_update_ratings_summary
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION update_bar_ratings_summary();

-- =============================================
-- bar_images — image gallery per bar
-- =============================================
CREATE TABLE public.bar_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id      UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'google', 'osm')),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bar_images_bar_id ON public.bar_images(bar_id);

-- =============================================
-- Row Level Security — public read, no public writes.
-- The backend uses the service-role key and bypasses these entirely.
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_ratings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_images ENABLE ROW LEVEL SECURITY;

-- Public reads.
CREATE POLICY "bars_select_all" ON public.bars FOR SELECT USING (is_active = TRUE);
CREATE POLICY "ratings_select_all" ON public.ratings FOR SELECT USING (TRUE);
CREATE POLICY "summary_select_all" ON public.bar_ratings_summary FOR SELECT USING (TRUE);
CREATE POLICY "images_select_all" ON public.bar_images FOR SELECT USING (TRUE);
-- A user may read/update only their own profile. No public SELECT: profiles
-- hold email + moderation fields and RLS is row-level, not column-level.
-- Public profile data (usernames on reviews, leaderboard) is served by the
-- backend via the service-role key, which selects only safe columns.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- A user may write their own ratings (the backend still mediates via service role).
CREATE POLICY "ratings_insert_own" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_update_own" ON public.ratings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ratings_delete_own" ON public.ratings
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- get_nearby_bars — bars within radius_km of a point, with summary + distance
-- =============================================
CREATE OR REPLACE FUNCTION get_nearby_bars(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  id UUID, name TEXT, address TEXT, city TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  avg_overall NUMERIC, total_ratings INTEGER,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.city, b.lat, b.lng,
    COALESCE(s.avg_overall, 0),
    COALESCE(s.total_ratings, 0),
    ROUND((ST_Distance(
      ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::NUMERIC, 2)::DOUBLE PRECISION AS distance_km
  FROM public.bars b
  LEFT JOIN public.bar_ratings_summary s ON s.bar_id = b.id
  WHERE b.is_active = TRUE
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- get_leaderboard — all users ranked by ice cubes (10 per rating)
-- =============================================
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID, username TEXT, avatar_url TEXT, ice_cubes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.avatar_url, (COUNT(r.id) * 10)::BIGINT AS ice_cubes
  FROM public.profiles p
  LEFT JOIN public.ratings r ON r.user_id = p.id
  GROUP BY p.id, p.username, p.avatar_url
  ORDER BY ice_cubes DESC, p.username ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- bookmarks — account-scoped saved bars ("Salvati")
-- =============================================
CREATE TABLE public.bookmarks (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bar_id     UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, bar_id)
);
CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- A user may read/create/delete only their own bookmarks (backend uses the
-- service-role key and bypasses these).
CREATE POLICY "bookmarks_select_own" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- app_settings — singleton (id = 1) global switches for the admin panel
-- (security settings + emergency read-only kill switch).
-- =============================================
CREATE TABLE public.app_settings (
  id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,   -- allow new sign-ups
  ratings_enabled   BOOLEAN NOT NULL DEFAULT TRUE,   -- allow new/updated ratings
  maintenance_mode  BOOLEAN NOT NULL DEFAULT FALSE,  -- read-only kill switch (blocks non-admin writes)
  maintenance_reason TEXT,                            -- why the site is down (shown to users)
  maintenance_eta   TIMESTAMPTZ,                      -- estimated back-online time
  beta_mode         BOOLEAN NOT NULL DEFAULT FALSE,  -- private beta: only admin/moderator/betatester get in
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Public read so the frontend can gate registration / show a maintenance banner
-- with the anon key. Writes go through the backend service-role key only.
CREATE POLICY "app_settings_select_all" ON public.app_settings FOR SELECT USING (TRUE);
