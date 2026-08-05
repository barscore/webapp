-- Apple in-app purchases for boosts (iOS client).
--
-- The web app sends people to Stripe Checkout, but App Store rule 3.1.1 does
-- not allow that for something consumed inside the app, so the iOS build buys
-- the same boost as a consumable IAP. Both providers write to the same
-- boost_orders table; `provider` says which one settled a row.
--
-- Idempotency comes from the unique index: Apple can deliver the same signed
-- transaction more than once (retries, Transaction.updates on another device),
-- and the second insert of the same transaction id simply loses.

ALTER TABLE public.boost_orders
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (provider IN ('stripe', 'apple')),
  ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS boost_orders_apple_transaction_id_key
  ON public.boost_orders (apple_transaction_id)
  WHERE apple_transaction_id IS NOT NULL;

-- The Stripe path always filled stripe_session_id; the Apple path never will.
ALTER TABLE public.boost_orders
  ALTER COLUMN stripe_session_id DROP NOT NULL;
