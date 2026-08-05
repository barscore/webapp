-- =============================================
-- Organizer/PR accounts, bar claims, follows, notifications,
-- push subscriptions, Stripe boosts.
-- Run this in the Supabase SQL Editor on an existing deploy.
-- =============================================

-- 1) Role: add 'organizer' + its type.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'betatester', 'moderator', 'admin', 'organizer'));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organizer_type TEXT
  CHECK (organizer_type IN ('pr', 'organizzatore', 'proprietario'));

-- 2) Bars: verified owner (set by claim approval) + lazy boost expiry.
ALTER TABLE public.bars
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bars ADD COLUMN IF NOT EXISTS boost_until TIMESTAMPTZ;

-- 3) Events: organizer "delete" is a cancellation (row stays, followers get
--    notified); reminder goes out once per event; lazy boost expiry.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS boost_until TIMESTAMPTZ;

-- 4) organizer_requests — upgrade-to-organizer form (3 questions).
CREATE TABLE IF NOT EXISTS public.organizer_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_type TEXT NOT NULL CHECK (requested_type IN ('pr', 'organizzatore', 'proprietario')),
  proof          TEXT NOT NULL CHECK (char_length(proof) BETWEEN 10 AND 1000),
  channels       TEXT[] NOT NULL CHECK (array_length(channels, 1) >= 1),
  channels_other TEXT CHECK (char_length(channels_other) <= 200),
  collaborations TEXT NOT NULL CHECK (char_length(collaborations) BETWEEN 5 AND 1000),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note     TEXT CHECK (char_length(admin_note) <= 500),
  reviewed_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizer_requests_one_pending
  ON public.organizer_requests(user_id) WHERE status = 'pending';

-- 5) bar_claims — "sono il proprietario di questo bar".
CREATE TABLE IF NOT EXISTS public.bar_claims (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bar_id      UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  proof       TEXT NOT NULL CHECK (char_length(proof) BETWEEN 10 AND 1000),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note  TEXT CHECK (char_length(admin_note) <= 500),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bar_claims_one_pending
  ON public.bar_claims(user_id, bar_id) WHERE status = 'pending';

-- 6) follows — event XOR organizer target. Plain UNIQUE works: the "other"
--    column is NULL and Postgres treats NULLs as distinct, while duplicates on
--    the real target collide on the non-null pair.
CREATE TABLE IF NOT EXISTS public.follows (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id     UUID REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_one_target CHECK ((event_id IS NULL) <> (organizer_id IS NULL)),
  CONSTRAINT follows_unique_event UNIQUE (user_id, event_id),
  CONSTRAINT follows_unique_organizer UNIQUE (user_id, organizer_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_event ON public.follows(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_follows_organizer ON public.follows(organizer_id) WHERE organizer_id IS NOT NULL;

-- 7) notifications — in-app inbox (push delivery is layered on top).
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
    'new_event', 'event_reminder', 'event_updated', 'event_cancelled',
    'request_approved', 'request_rejected', 'claim_approved', 'claim_rejected')),
  title      TEXT NOT NULL CHECK (char_length(title) <= 140),
  body       TEXT CHECK (char_length(body) <= 500),
  link       TEXT CHECK (char_length(link) <= 300),
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id, created_at DESC);

-- 8) push_subscriptions — Web Push endpoints per user/device.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

-- 9) boost_orders — one row per Stripe Checkout; pending→paid via webhook.
CREATE TABLE IF NOT EXISTS public.boost_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES public.events(id) ON DELETE SET NULL,
  bar_id            UUID REFERENCES public.bars(id) ON DELETE SET NULL,
  tier              TEXT NOT NULL CHECK (tier IN ('3d', '7d', '30d')),
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  stripe_session_id TEXT UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ,
  CONSTRAINT boost_orders_one_target CHECK ((event_id IS NULL) <> (bar_id IS NULL))
);

-- 10) RPC updates. RETURNS TABLE changes ⇒ CREATE OR REPLACE would fail,
--     DROP first. Sponsored (= boost attivo) first, then the old ordering.
DROP FUNCTION IF EXISTS get_nearby_events(double precision, double precision, double precision);
CREATE FUNCTION get_nearby_events(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  id UUID, bar_id UUID, bar_name TEXT,
  title TEXT, description TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  organizer_id UUID, organizer_username TEXT,
  sponsored BOOLEAN,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.bar_id, b.name AS bar_name,
    e.title, e.description, e.lat, e.lng, e.starts_at, e.ends_at,
    CASE WHEN p.role = 'organizer' THEN e.created_by END AS organizer_id,
    CASE WHEN p.role = 'organizer' THEN p.username END AS organizer_username,
    COALESCE(e.boost_until > NOW(), FALSE) AS sponsored,
    ROUND((ST_Distance(
      ST_SetSRID(ST_MakePoint(e.lng, e.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::NUMERIC, 2)::DOUBLE PRECISION AS distance_km
  FROM public.events e
  LEFT JOIN public.bars b ON b.id = e.bar_id
  LEFT JOIN public.profiles p ON p.id = e.created_by
  WHERE e.cancelled_at IS NULL
    AND COALESCE(e.ends_at, e.starts_at) >= NOW()
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(e.lng, e.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY COALESCE(e.boost_until > NOW(), FALSE) DESC, e.starts_at ASC;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_nearby_bars(double precision, double precision, double precision);
CREATE FUNCTION get_nearby_bars(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  id UUID, name TEXT, address TEXT, city TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  avg_overall NUMERIC, total_ratings INTEGER,
  sponsored BOOLEAN,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.city, b.lat, b.lng,
    COALESCE(s.avg_overall, 0),
    COALESCE(s.total_ratings, 0),
    COALESCE(b.boost_until > NOW(), FALSE) AS sponsored,
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
  ORDER BY COALESCE(b.boost_until > NOW(), FALSE) DESC, distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- 11) RLS — writes only via backend service-role; own-row reads for anon key.
ALTER TABLE public.organizer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizer_requests_select_own" ON public.organizer_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bar_claims_select_own" ON public.bar_claims
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "follows_select_own" ON public.follows
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "boost_orders_select_own" ON public.boost_orders
  FOR SELECT USING (auth.uid() = user_id);
