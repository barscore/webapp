-- =============================================
-- user_reports — generic "segnala" reports from the account/profile menu
-- (bug, contenuto inappropriato, account, suggerimento, altro).
-- Run in the Supabase SQL Editor on an existing deploy. Idempotent.
-- Create goes through the backend (service-role, auth required); reads and
-- moderation are staff-only. No anon RLS policy on purpose — nothing is
-- exposed to the client.
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT NOT NULL CHECK (type IN ('bug', 'contenuto', 'account', 'suggerimento', 'altro')),
  message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 1000),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'done', 'rejected')),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON public.user_reports(created_at DESC);

-- RLS on, no policies: only the service-role key (backend) can touch this table.
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
