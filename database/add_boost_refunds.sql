-- =============================================
-- add_boost_refunds.sql — stati di rimborso per gli ordini di boost.
-- Da eseguire nel SQL Editor di Supabase su un deploy esistente. Idempotente.
--
-- Il webhook Stripe ascolta `charge.refunded` e `charge.dispute.created` e
-- revoca i giorni già concessi (routes/stripeWebhook.js → revokeBoost). Per
-- farlo scrive `boost_orders.status = 'refunded'` o `'disputed'`, ma il CHECK
-- inline della CREATE TABLE (add_organizers.sql:113) ammette solo
-- ('pending', 'paid'): senza questa migrazione l'UPDATE viola il vincolo
-- (Postgres 23514), il webhook risponde 500, Stripe ritenta all'infinito e il
-- boost rimborsato resta in evidenza fino alla scadenza naturale.
--
-- Riusare 'pending' non era un'opzione: riaprirebbe la strada a un secondo
-- fulfilment sulla redelivery di checkout.session.completed, che filtra proprio
-- su quello stato.
--
-- ORDINE: eseguire PRIMA di deployare il backend con la gestione dei rimborsi.
-- =============================================

-- Il CHECK è inline sulla colonna, quindi Postgres lo ha chiamato
-- `boost_orders_status_check`. Un CHECK non si estende sul posto: si droppa e
-- si riscrive per intero.
ALTER TABLE public.boost_orders DROP CONSTRAINT IF EXISTS boost_orders_status_check;
ALTER TABLE public.boost_orders
  ADD CONSTRAINT boost_orders_status_check
  CHECK (status IN ('pending', 'paid', 'refunded', 'disputed'));
