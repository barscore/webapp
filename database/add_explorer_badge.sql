-- Esegui questo script in Supabase SQL Editor
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_explorer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_drink_token UUID;

DROP FUNCTION IF EXISTS get_leaderboard(INTEGER);

CREATE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID, username TEXT, avatar_url TEXT, ice_cubes BIGINT, plus BOOLEAN, is_explorer BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    (COUNT(r.id) * 10)::BIGINT AS ice_cubes,
    (p.plus_until IS NOT NULL AND p.plus_until > NOW()) AS plus,
    p.is_explorer
  FROM public.profiles p
  LEFT JOIN public.ratings r ON r.user_id = p.id
  GROUP BY p.id, p.username, p.avatar_url, p.plus_until, p.is_explorer
  ORDER BY ice_cubes DESC, p.username ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
