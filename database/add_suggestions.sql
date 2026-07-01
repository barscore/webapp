-- =============================================
-- bar_suggestions — "segnala il tuo bar" leads from the search empty state.
-- Run in the Supabase SQL Editor on an existing deploy. Idempotent.
-- Public create goes through the backend (service-role); reads/moderation are
-- staff-only. No anon RLS policy on purpose — nothing is exposed to the client.
-- =============================================
CREATE TABLE IF NOT EXISTS public.bar_suggestions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  city        TEXT CHECK (char_length(city) <= 120),
  note        TEXT CHECK (char_length(note) <= 500),
  contact     TEXT CHECK (char_length(contact) <= 160),
  lat         DOUBLE PRECISION CHECK (lat BETWEEN -90 AND 90),
  lng         DOUBLE PRECISION CHECK (lng BETWEEN -180 AND 180),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'done', 'rejected')),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bar_suggestions_status ON public.bar_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_bar_suggestions_created_at ON public.bar_suggestions(created_at DESC);

-- RLS on, no policies: only the service-role key (backend) can touch this table.
ALTER TABLE public.bar_suggestions ENABLE ROW LEVEL SECURITY;
