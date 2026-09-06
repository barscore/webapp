-- =============================================
-- PR Features: contact info on profiles, event presales,
-- event photos, free drink, and event PRs junction.
-- =============================================

-- Add contact info to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add new options to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_presales BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS free_drink BOOLEAN NOT NULL DEFAULT FALSE;

-- Create junction table for PRs joining events
CREATE TABLE IF NOT EXISTS public.event_prs (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  pr_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, pr_id)
);
CREATE INDEX IF NOT EXISTS idx_event_prs_event_id ON public.event_prs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_prs_pr_id ON public.event_prs(pr_id);

ALTER TABLE public.event_prs ENABLE ROW LEVEL SECURITY;
-- Le scritture passano dal backend

-- Drop and recreate get_nearby_events to include new fields
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
  has_presales BOOLEAN, photo_url TEXT, free_drink BOOLEAN,
  organizer_id UUID, organizer_username TEXT,
  sponsored BOOLEAN,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.bar_id, b.name AS bar_name,
    e.title, e.description, e.lat, e.lng, e.starts_at, e.ends_at,
    e.has_presales, e.photo_url, e.free_drink,
    CASE WHEN p.role = 'organizer' THEN e.created_by END AS organizer_id,
    CASE WHEN p.role = 'organizer' THEN p.username END AS organizer_username,
    (e.boost_until IS NOT NULL AND e.boost_until > NOW()) AS sponsored,
    (ST_DistanceSphere(
      ST_SetSRID(ST_MakePoint(e.lng, e.lat), 4326),
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
    ) / 1000.0) AS distance_km
  FROM public.events e
  LEFT JOIN public.bars b ON e.bar_id = b.id
  LEFT JOIN public.profiles p ON e.created_by = p.id
  WHERE e.cancelled_at IS NULL
    AND e.starts_at >= NOW()
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(e.lng, e.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY sponsored DESC, e.starts_at ASC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
