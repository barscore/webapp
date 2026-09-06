-- =========================================================================
-- FIX CASCADE DELETES V3 (Correzione Errore 500)
-- Esegui questo file nel tuo database Supabase (nella sezione SQL Editor).
-- =========================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- 1. Trova e rimuovi TUTTI i vincoli correnti che puntano da public.profiles a auth.users
  FOR rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND confrelid = 'auth.users'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', rec.conname);
  END LOOP;
  
  -- 2. Ricrea il vincolo su profiles con ON DELETE CASCADE
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

  -- 3. Trova TUTTI i vincoli in TUTTE le tabelle che puntano a public.profiles
  FOR rec IN
    SELECT 
      c.conname, 
      t.relname AS tablename,
      a.attname AS colname,
      a.attnotnull AS is_not_null
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.confrelid = 'public.profiles'::regclass
  LOOP
    -- Rimuoviamo il vincolo esistente
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', rec.tablename, rec.conname);
    
    -- Se la colonna è obbligatoria (NOT NULL) nel database, o è una colonna proprietaria
    -- (come pr_id, user_id, organizer_id), dobbiamo usare CASCADE per forza, altrimenti 
    -- PostgreSQL bloccherà la cancellazione con un errore 500 quando tenta di inserire un NULL non permesso.
    IF rec.is_not_null OR rec.colname IN ('user_id', 'organizer_id', 'pr_id') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE CASCADE', rec.tablename, rec.conname, rec.colname);
    ELSE
      -- Per tutte le altre colonne opzionali (created_by, uploaded_by, moderated_by, ecc.)
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL', rec.tablename, rec.conname, rec.colname);
    END IF;
  END LOOP;
END $$;
