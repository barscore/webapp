-- ============================================================================
-- rabar — interruttore della monetizzazione
--
-- Adds app_settings.monetization_enabled, toggled from the admin panel
-- (Emergenza → Monetizzazione). While OFF nothing in the app can earn money:
--   * the backend refuses to open a payment (Stripe checkout for rabar+ and
--     boosts, the Apple / Google boost orders that come before the store
--     charges) with 503 MONETIZATION_OFF;
--   * web, Android and iOS hide every purchase (rabar+, boosts) and never load
--     an ad: no AdSense script, no AdMob SDK, no consent form, no rewarded.
-- Clients read the column with the anon key like the other switches and treat
-- anything but TRUE as OFF.
--
-- What it does NOT stop: subscriptions that already exist keep renewing on
-- Stripe / Google Play. The admin panel shows how many there are.
--
-- Default TRUE = today's behaviour; flip it from the panel.
-- Run in the Supabase SQL Editor, BEFORE deploying the code that reads it.
-- ============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS monetization_enabled BOOLEAN NOT NULL DEFAULT TRUE;
