-- =============================================
-- fix_security.sql — security hardening for existing deploys.
-- Run once in the Supabase SQL Editor. schema.sql carries the same fixes for
-- fresh installs.
--
-- 1) profiles SELECT policy: the old USING (TRUE) let anyone holding the
--    public anon key read EVERY user's email and moderation fields straight
--    from the browser. RLS is row-level, not column-level, so the only safe
--    policy is "own row only". Public profile data (username on reviews,
--    leaderboard, …) is served by the backend via the service-role key, which
--    bypasses RLS and already selects only safe columns — no app change needed.
--
-- 2) handle_new_user: SECURITY DEFINER without a pinned search_path is the
--    standard privilege-escalation foothold (a crafted object shadowing a
--    referenced name runs with the function's elevated rights). Pin it empty;
--    pg_catalog is always searched implicitly and every table reference in the
--    function is already schema-qualified.
-- =============================================

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

ALTER FUNCTION public.handle_new_user() SET search_path = '';
