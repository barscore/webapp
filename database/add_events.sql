-- =============================================
-- events — venue events, added by hand by locale owners / staff.
-- Run this in the Supabase SQL Editor on an existing deploy.
-- Shown in the "Eventi" tab, ordered chronologically (soonest first).
-- =============================================
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_id       UUID REFERENCES public.bars(id) ON DELETE SET NULL,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  description  TEXT CHECK (char_length(description) <= 1000),
  -- Denormalized location so events can be queried by zone even when bar_id is
  -- null (standalone event) or the bar row is later removed.
  lat          DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng          DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_end_after_start CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_events_location ON public.events USING GIST (
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);

-- =============================================
-- get_nearby_events — upcoming events within radius_km of a point, soonest
-- first. "Upcoming" = not yet ended (ends_at, or starts_at when open-ended).
-- =============================================
CREATE OR REPLACE FUNCTION get_nearby_events(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  id UUID, bar_id UUID, bar_name TEXT,
  title TEXT, description TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.bar_id, b.name AS bar_name,
    e.title, e.description, e.lat, e.lng, e.starts_at, e.ends_at,
    ROUND((ST_Distance(
      ST_SetSRID(ST_MakePoint(e.lng, e.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::NUMERIC, 2)::DOUBLE PRECISION AS distance_km
  FROM public.events e
  LEFT JOIN public.bars b ON b.id = e.bar_id
  WHERE COALESCE(e.ends_at, e.starts_at) >= NOW()
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(e.lng, e.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY e.starts_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS — anyone can read events; writes go through the backend (service-role,
-- bypasses RLS). No anon write policy on purpose.
-- =============================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_all" ON public.events
  FOR SELECT USING (TRUE);
