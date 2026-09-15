-- =============================================
-- add_rating_replies.sql — risposta del proprietario alle recensioni
-- =============================================
-- Una recensione ha al massimo una risposta, e chi la scrive è sempre lo
-- stesso soggetto (bars.owner_id): due colonne sulla riga, non una tabella
-- a parte con una FK e una unique da mantenere.
--
-- Nessuna policy nuova: le scritture passano dal backend (service-role), come
-- tutto il resto (vedi fix_rls_hardening.sql).

ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS risposta    TEXT,
  ADD COLUMN IF NOT EXISTS risposta_at TIMESTAMPTZ;

-- Stesso tetto del commento utente.
ALTER TABLE public.ratings
  DROP CONSTRAINT IF EXISTS ratings_risposta_len;
ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_risposta_len CHECK (risposta IS NULL OR char_length(risposta) <= 500);

-- La campanella deve poter dire all'utente che il locale gli ha risposto.
-- Il CHECK dei tipi non si estende sul posto: si riscrive per intero, come in
-- fix_rls_hardening.sql (da eseguire prima di questa migrazione).
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'new_event', 'event_reminder', 'event_updated', 'event_cancelled',
    'request_approved', 'request_rejected', 'claim_approved', 'claim_rejected',
    'content_removed', 'account_restricted', 'rating_reply'));
