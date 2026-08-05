-- ============================================================================
-- add_betatester.sql — migration for deploys created before the beta program.
-- (Fresh installs get all of this from schema.sql.)
--
-- Adds:
--   1. the "betatester" app role (profiles.role)
--   2. the beta_mode emergency switch (app_settings), toggled from the admin
--      panel (Emergenza → Beta test). While ON the app is locked for everyone
--      except admin / moderator / betatester: the frontend shows the lock
--      screen and the backend rejects writes from other callers (503 BETA).
--
-- Run in the Supabase SQL Editor.
-- ============================================================================

-- 1) Allow the new role value. The CHECK in schema.sql is inline and unnamed,
--    so Postgres auto-named it profiles_role_check.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'moderator', 'admin', 'betatester'));

-- 2) Global beta switch (singleton row id = 1).
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS beta_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- Launch locked: the app goes live already in beta. Turn it off from the admin
-- panel (Emergenza → Termina beta test) when ready for the public.
UPDATE public.app_settings SET beta_mode = TRUE WHERE id = 1;
