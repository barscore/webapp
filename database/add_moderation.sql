-- =============================================
-- rabar — moderation + admin panel migration
-- Run in the Supabase SQL Editor on an existing deploy. Idempotent.
-- Adds: user ban/suspension fields, a singleton app_settings row (security /
-- emergency switches), RLS so the frontend can read settings with the anon key.
-- =============================================

-- --- Ban / suspension on profiles ---------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_note TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at    TIMESTAMPTZ;

-- --- app_settings — singleton (id = 1) global switches -------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,   -- allow new sign-ups
  ratings_enabled   BOOLEAN NOT NULL DEFAULT TRUE,   -- allow new/updated ratings
  maintenance_mode  BOOLEAN NOT NULL DEFAULT FALSE,  -- read-only kill switch (blocks non-admin writes)
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Maintenance detail shown to non-admin users (added later):
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS maintenance_reason TEXT,         -- why the site is down
  ADD COLUMN IF NOT EXISTS maintenance_eta    TIMESTAMPTZ;  -- estimated back-online time

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public read so the frontend can gate registration / show a maintenance banner
-- with the anon key. Writes go through the backend service-role key only.
DROP POLICY IF EXISTS "app_settings_select_all" ON public.app_settings;
CREATE POLICY "app_settings_select_all" ON public.app_settings FOR SELECT USING (TRUE);
