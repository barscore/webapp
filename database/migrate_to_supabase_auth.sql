-- =============================================
-- Migration: custom JWT auth  ->  Supabase Auth (email/password + Google)
-- Run this ONLY if you already applied the original schema.sql.
-- WARNING: existing custom-auth users in `profiles` cannot log in anymore —
-- they must re-register through Supabase Auth. If you have no real users yet,
-- the cleanest path is to drop & recreate from the updated schema.sql instead.
-- =============================================

-- 1. Drop the old stateful refresh token table (Supabase manages sessions).
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;

-- 2. profiles must reference auth.users. Old rows have no matching auth.users id,
--    so we clear profiles (and dependent ratings) before re-keying.
--    Skip this block if you intend to migrate users manually.
TRUNCATE public.ratings CASCADE;
TRUNCATE public.bar_ratings_summary CASCADE;
DELETE FROM public.profiles;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;

-- Re-point the PK at auth.users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Auto-create profiles on sign-up (email + OAuth).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF char_length(base_username) < 3 THEN
    base_username := 'user_' || substr(NEW.id::text, 1, 6);
  END IF;
  base_username := substr(base_username, 1, 24);

  final_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := base_username || '_' || substr(NEW.id::text, 1, 5);
  END IF;

  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (NEW.id, NEW.email, final_username, NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS policies for direct frontend access.
--
-- ATTENZIONE — questa sezione è stata SVUOTATA, non dimenticata. Com'era, una
-- riesecuzione di questo file riapriva due buchi già chiusi altrove:
--   * `profiles_select_all` con USING (TRUE) lasciava leggere l'email di OGNI
--     utente a chiunque avesse la anon key, che è pubblica (→ fix_security.sql);
--   * `profiles_update_own` lasciava a un utente loggato l'UPDATE su qualunque
--     colonna della propria riga, `role` compresa: escalation ad admin con una
--     riga di JavaScript (→ fix_rls_hardening.sql). Stesso discorso per le tre
--     policy di scrittura su `ratings`, che aggiravano ban, kill switch e rate
--     limit andando dritte a PostgREST.
-- Lo stato corretto delle policy vive in schema.sql (installazioni nuove) e
-- nelle due migrazioni citate qui sopra (deploy esistenti). Qui non si ricrea
-- più niente: i DROP restano perché rendono il file sicuro da rieseguire.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "ratings_insert_own"  ON public.ratings;
DROP POLICY IF EXISTS "ratings_update_own"  ON public.ratings;
DROP POLICY IF EXISTS "ratings_delete_own"  ON public.ratings;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 5. Backfill profiles for any auth.users that signed up before the trigger
--    existed. Without this, those users hit a foreign-key violation
--    (ratings_user_id_fkey) the moment they try to save a rating. Mirrors the
--    username-derivation logic in handle_new_user; unique suffix avoids clashes.
INSERT INTO public.profiles (id, email, username, avatar_url)
SELECT
  u.id,
  u.email,
  CASE
    WHEN char_length(regexp_replace(COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g')) < 3
      THEN 'user_' || substr(u.id::text, 1, 6)
    ELSE substr(regexp_replace(COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g'), 1, 24)
  END || '_' || substr(u.id::text, 1, 5),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
