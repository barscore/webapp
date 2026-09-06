ALTER TABLE public.bars
  ADD COLUMN IF NOT EXISTS accepts_free_drinks BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS free_drinks_hours TEXT;

DROP FUNCTION IF EXISTS get_nearby_bars(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
CREATE OR REPLACE FUNCTION get_nearby_bars(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  id UUID, name TEXT, address TEXT, city TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  avg_overall NUMERIC, total_ratings INTEGER,
  accepts_free_drinks BOOLEAN, free_drinks_hours TEXT,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.city, b.lat, b.lng,
    COALESCE(s.avg_overall, 0),
    COALESCE(s.total_ratings, 0),
    b.accepts_free_drinks,
    b.free_drinks_hours,
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
