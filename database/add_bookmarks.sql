-- Migration: account-scoped saved bars ("Salvati").
-- Run in the Supabase SQL Editor on an existing deploy. Idempotent-ish:
-- safe to run once; re-running errors on the existing table (drop first if needed).

CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bar_id     UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, bar_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmarks_select_own" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_insert_own" ON public.bookmarks;
DROP POLICY IF EXISTS "bookmarks_delete_own" ON public.bookmarks;

CREATE POLICY "bookmarks_select_own" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);
