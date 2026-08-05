-- Migration: ice-cube leaderboard RPC.
-- Ice cubes = 10 per rating, derived from the ratings table (never stored).
-- Paste into the Supabase SQL Editor on an existing deploy.

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
