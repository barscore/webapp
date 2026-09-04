-- =============================================
-- admin_audit — traccia delle azioni di staff.
-- Da eseguire nel SQL Editor di Supabase su un deploy esistente. Idempotente.
--
-- Oggi l'unica traccia sono `profiles.moderated_by` / `moderated_at`, e coprono
-- solo ban e sospensione: chi ha cambiato un ruolo, cancellato un account o una
-- valutazione, fatto un purge, alzato un kill switch o approvato una claim non
-- lascia niente dietro. È il minimo per l'accountability dell'art. 5(2) GDPR
-- (dimostrare il trattamento, non solo farlo) e l'unico modo di ricostruire
-- un'escalation dopo il fatto — un ruolo che diventa admin da solo, oggi, è
-- indistinguibile da uno promosso legittimamente.
--
-- La scrive solo il backend con la service-role key: RLS attiva e ZERO policy,
-- stessa forma di `user_reports` in add_reports.sql. Niente è esposto al client.
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_audit (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ON DELETE SET NULL, non CASCADE: cancellare l'account di un admin non deve
  -- cancellare la traccia di quello che ha fatto — sarebbe esattamente la
  -- ripulita che questa tabella esiste per impedire. La riga resta, orfana.
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,   -- es. 'user.role_changed', 'rating.deleted', 'settings.updated'
  target_type TEXT,            -- 'user' | 'bar' | 'rating' | 'event' | 'claim' | …
  target_id   UUID,
  payload     JSONB,           -- prima/dopo, motivazione, parametri dell'azione
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Il pannello legge cronologicamente; il filtro «cosa ha fatto questo admin»
-- è la seconda lettura per frequenza.
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at
  ON public.admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor
  ON public.admin_audit(actor_id, created_at DESC);

-- RLS on, nessuna policy: solo la service-role key (backend) tocca la tabella.
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
