-- =============================================
-- add_google_play_billing.sql — acquisti Google Play (app Android).
-- Da eseguire nel SQL Editor di Supabase. Idempotente.
--
-- Sul Play Store rabar+ e i boost non si possono pagare con Stripe (regole sui
-- pagamenti di Google Play): l'app Android li compra con Google Play Billing e
-- il backend verifica il token d'acquisto con la Developer API
-- (backend/src/lib/googlePlay.js). Stesse tabelle degli altri canali:
-- `provider` dice chi ha incassato.
--
-- Contiene anche la parte di add_apple_iap.sql (provider, apple_transaction_id)
-- perché in produzione quella non è ancora stata eseguita: le due si possono
-- eseguire in qualsiasi ordine.
--
-- ORDINE: eseguire PRIMA di deployare il backend con le rotte Google Play.
-- =============================================

-- 1) rabar+ — abbonamenti -----------------------------------------------------
-- Il CHECK inline della CREATE TABLE si chiama plus_subscriptions_provider_check
-- e ammette solo 'stripe': si riscrive per intero.
ALTER TABLE public.plus_subscriptions DROP CONSTRAINT IF EXISTS plus_subscriptions_provider_check;
ALTER TABLE public.plus_subscriptions
  ADD CONSTRAINT plus_subscriptions_provider_check CHECK (provider IN ('stripe', 'google'));

-- Il token d'acquisto Google identifica l'abbonamento (cambia a ogni cambio di
-- piano). Unico: lo stesso acquisto non può dare rabar+ a due account.
ALTER TABLE public.plus_subscriptions
  ADD COLUMN IF NOT EXISTS google_purchase_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS plus_subscriptions_google_purchase_token_key
  ON public.plus_subscriptions (google_purchase_token)
  WHERE google_purchase_token IS NOT NULL;

-- 2) Boost — ordini -------------------------------------------------------------
ALTER TABLE public.boost_orders
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS google_purchase_token TEXT,
  ADD COLUMN IF NOT EXISTS google_order_id TEXT;

-- Se add_apple_iap.sql è già passato il CHECK esiste con ('stripe', 'apple').
ALTER TABLE public.boost_orders DROP CONSTRAINT IF EXISTS boost_orders_provider_check;
ALTER TABLE public.boost_orders
  ADD CONSTRAINT boost_orders_provider_check CHECK (provider IN ('stripe', 'apple', 'google'));

CREATE UNIQUE INDEX IF NOT EXISTS boost_orders_apple_transaction_id_key
  ON public.boost_orders (apple_transaction_id)
  WHERE apple_transaction_id IS NOT NULL;

-- Idempotenza della verifica: l'app può presentare lo stesso acquisto più volte
-- (nuovo tentativo, riavvio prima del consumo), il secondo trova la riga pagata.
CREATE UNIQUE INDEX IF NOT EXISTS boost_orders_google_purchase_token_key
  ON public.boost_orders (google_purchase_token)
  WHERE google_purchase_token IS NOT NULL;

-- Il percorso Stripe riempiva sempre stripe_session_id; Apple e Google mai.
ALTER TABLE public.boost_orders
  ALTER COLUMN stripe_session_id DROP NOT NULL;
