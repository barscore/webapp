-- Sponsor radius — a bar owner can pay to be visible (and ranked first) beyond
-- the viewer's own search radius, up to a distance chosen at checkout.
--
-- `sponsor_radius_km` is picked in the boost modal (1..50 km), stored on the
-- order, and copied onto the bar by lib/boostFulfillment.js#applyBoost when the
-- payment settles. It is only meaningful while `boost_until > NOW()` — every
-- query below gates on that, so an expired boost needs no cleanup (same lazy
-- model as `boost_until` itself).
--
-- Run after add_organizers.sql and add_drinks.sql.

ALTER TABLE public.boost_orders ADD COLUMN IF NOT EXISTS sponsor_radius_km INTEGER
  CHECK (sponsor_radius_km IS NULL OR (sponsor_radius_km BETWEEN 1 AND 50));
ALTER TABLE public.bars ADD COLUMN IF NOT EXISTS sponsor_radius_km INTEGER
  CHECK (sponsor_radius_km IS NULL OR (sponsor_radius_km BETWEEN 1 AND 50));

-- /places/nearby hits this on every call to pull in out-of-radius sponsored
-- bars; the partial index keeps it to the handful of currently-boosted rows.
CREATE INDEX IF NOT EXISTS idx_bars_active_sponsored
  ON public.bars (boost_until)
  WHERE sponsor_radius_km IS NOT NULL;

-- Hard ceiling shared by both RPCs: a sponsored bar is never pulled in from
-- further than this, whatever the stored radius says.
-- (kept inline as 50 to avoid a settings table for one constant)

-- ---------------------------------------------------------------------------
-- get_nearby_bars — now also returns sponsored bars that sit outside
-- radius_km, as long as the viewer is within that bar's sponsor_radius_km.
-- ---------------------------------------------------------------------------
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
    AND (
      ST_DWithin(
        ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000
      )
      OR (
        b.boost_until > NOW()
        AND b.sponsor_radius_km IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
          LEAST(b.sponsor_radius_km, 50) * 1000
        )
      )
    )
  ORDER BY COALESCE(b.boost_until > NOW(), FALSE) DESC, distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- get_drink_top_bars — sponsored bars first, and pulled in from beyond
-- radius_km up to their sponsor_radius_km (still only if they have votes for
-- this drink). Adds a `sponsored` column; the client shows those rows on top
-- with no rank number.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_drink_top_bars(uuid, double precision, double precision, double precision, integer, integer);
CREATE FUNCTION get_drink_top_bars(
  target_drink_id UUID,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 30.0,
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, name TEXT, address TEXT, city TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  cover_image_url TEXT,
  avg_rating NUMERIC, total_ratings INTEGER,
  sponsored BOOLEAN,
  distance_km DOUBLE PRECISION,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.city, b.lat, b.lng, b.cover_image_url,
    s.avg_rating, s.total_ratings,
    COALESCE(b.boost_until > NOW(), FALSE) AS sponsored,
    ROUND((ST_Distance(
      ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::NUMERIC, 2)::DOUBLE PRECISION AS distance_km,
    COUNT(*) OVER () AS total_count
  FROM public.drink_bar_summary s
  JOIN public.bars b ON b.id = s.bar_id
  WHERE s.drink_id = target_drink_id
    AND s.total_ratings > 0
    AND b.is_active = TRUE
    AND (
      ST_DWithin(
        ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000
      )
      OR (
        b.boost_until > NOW()
        AND b.sponsor_radius_km IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
          LEAST(b.sponsor_radius_km, 50) * 1000
        )
      )
    )
  ORDER BY COALESCE(b.boost_until > NOW(), FALSE) DESC, s.avg_rating DESC, s.total_ratings DESC
  LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;
