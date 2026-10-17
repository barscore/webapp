-- =============================================
-- add_bar_stats.sql — statistiche dei bar (proprietari) e crescita (admin).
-- Da eseguire nel SQL Editor di Supabase su un deploy esistente. Idempotente.
-- ORDINE: PRIMA di deployare il backend che chiama queste funzioni. Senza la
-- migrazione il backend non si rompe: /stats/events scarta, la scheda
-- statistiche risponde 503 STATS_UNAVAILABLE e /admin/stats torna growth: null.
--
-- Cosa misura e da dove arriva:
--   bar_events             un evento per interazione con un bar, scritto da
--                          POST /stats/events (web, Android, iOS):
--                            scan       scheda aperta dal QR (?src=qr) o dal
--                                       tag NFC (?src=nfc) esposti nel locale
--                            view       scheda aperta, con da dove (mappa,
--                                       lista, ricerca, link, qr, nfc)
--                            directions «Indicazioni»
--                            call       «Chiama»
--                            website    «Sito»
--   visitor_users          quale account sta dietro a un dispositivo. Il
--                          visitor_id è un UUID casuale che il client genera e
--                          tiene in locale; si lega all'account quando chi è
--                          loggato manda un evento o il ping di attività. È il
--                          ponte che fa contare «ha scansionato da anonimo, poi
--                          si è registrato, poi ha recensito».
--   bar_impressions_daily  quante volte un bar è uscito in /places/nearby, per
--                          giorno: un contatore, nessun dato personale.
--   profiles.last_seen_at  ultimo ping di attività (POST /stats/ping), per gli
--                          utenti attivi del pannello admin.
--
-- Il proprietario vede SOLO numeri aggregati, mai chi. Le tabelle hanno RLS
-- attiva e nessuna policy, le funzioni sono revocate a anon e authenticated:
-- le tocca solo il backend con la service-role key.
--
-- Conservazione: gli eventi e i legami dispositivo-account si cancellano dopo
-- 13 mesi (prune_bar_stats, chiamata dal cron dei promemoria). I contatori
-- giornalieri restano.
-- =============================================

-- --- Tabelle -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bar_events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bar_id     UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('scan', 'view', 'directions', 'call', 'website')),
  source     TEXT CHECK (source IN ('qr', 'nfc', 'map', 'list', 'search', 'link')),
  visitor_id UUID NOT NULL,
  -- SET NULL e non CASCADE: chi cancella l'account esce dalle statistiche come
  -- persona (il legame in visitor_users va via con lui), ma il conteggio del bar
  -- non cambia all'indietro.
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bar_events_bar_kind_time
  ON public.bar_events (bar_id, kind, created_at);
-- Dedup in record_bar_events: «questo dispositivo ha già mandato lo stesso
-- evento da poco?».
CREATE INDEX IF NOT EXISTS idx_bar_events_visitor_time
  ON public.bar_events (visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bar_events_user
  ON public.bar_events (user_id) WHERE user_id IS NOT NULL;
-- Pulizia per data (prune_bar_stats).
CREATE INDEX IF NOT EXISTS idx_bar_events_time
  ON public.bar_events (created_at);

ALTER TABLE public.bar_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.visitor_users (
  visitor_id UUID NOT NULL,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (visitor_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_visitor_users_user ON public.visitor_users (user_id);

ALTER TABLE public.visitor_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bar_impressions_daily (
  bar_id      UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bar_id, day)
);

ALTER TABLE public.bar_impressions_daily ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- --- Scrittura ---------------------------------------------------------------

-- Un lotto di eventi da un dispositivo. Scarta in silenzio i bar che non
-- esistono e i doppioni recenti dello stesso dispositivo (stesso bar, stesso
-- tipo): un refresh della pagina o un secondo tocco sul tag non gonfiano i
-- numeri. Le finestre: 30 minuti per una scansione (è una visita), 10 per una
-- visualizzazione, 1 per i pulsanti.
CREATE OR REPLACE FUNCTION public.record_bar_events(
  p_visitor UUID,
  p_user    UUID,
  p_events  JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted INTEGER;
BEGIN
  IF p_user IS NOT NULL THEN
    INSERT INTO public.visitor_users (visitor_id, user_id)
    VALUES (p_visitor, p_user)
    ON CONFLICT DO NOTHING;
  END IF;

  WITH incoming AS (
    SELECT DISTINCT ON (bar_id, kind) bar_id, kind, source
    FROM (
      SELECT (e->>'bar_id')::uuid AS bar_id,
             e->>'kind' AS kind,
             NULLIF(e->>'source', '') AS source
      FROM jsonb_array_elements(p_events) AS e
    ) raw
    ORDER BY bar_id, kind
  )
  INSERT INTO public.bar_events (bar_id, kind, source, visitor_id, user_id)
  SELECT i.bar_id, i.kind, i.source, p_visitor, p_user
  FROM incoming i
  JOIN public.bars b ON b.id = i.bar_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.bar_events x
    WHERE x.visitor_id = p_visitor
      AND x.bar_id = i.bar_id
      AND x.kind = i.kind
      AND x.created_at > NOW() - CASE i.kind
        WHEN 'scan' THEN INTERVAL '30 minutes'
        WHEN 'view' THEN INTERVAL '10 minutes'
        ELSE INTERVAL '1 minute'
      END
  );

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

-- Ping di attività di chi è loggato: lega il dispositivo all'account e segna
-- l'ultimo accesso. Scrive al massimo ogni 10 minuti per utente.
CREATE OR REPLACE FUNCTION public.touch_visitor(p_visitor UUID, p_user UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.visitor_users (visitor_id, user_id)
  VALUES (p_visitor, p_user)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
     SET last_seen_at = NOW()
   WHERE id = p_user
     AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '10 minutes');
$$;

-- +1 comparsa di oggi (ora italiana) per ogni bar dell'elenco. Una sola
-- istruzione: l'elenco arriva da /places/nearby a ogni caricamento della mappa.
CREATE OR REPLACE FUNCTION public.bump_bar_impressions(p_bar_ids UUID[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.bar_impressions_daily AS d (bar_id, day, impressions)
  SELECT b.id, (NOW() AT TIME ZONE 'Europe/Rome')::date, 1
  FROM public.bars b
  WHERE b.id = ANY (p_bar_ids)
  ON CONFLICT (bar_id, day) DO UPDATE SET impressions = d.impressions + 1;
$$;

CREATE OR REPLACE FUNCTION public.prune_bar_stats()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH ev AS (
    DELETE FROM public.bar_events WHERE created_at < NOW() - INTERVAL '13 months'
    RETURNING 1
  ), links AS (
    DELETE FROM public.visitor_users WHERE linked_at < NOW() - INTERVAL '13 months'
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM ev) + (SELECT COUNT(*) FROM links);
$$;

-- --- Lettura: statistiche di un bar -------------------------------------------

-- Tutti i numeri della scheda statistiche per gli ultimi `p_days` giorni
-- (giorni di calendario italiani, oggi compreso). Restituisce sempre tutto:
-- quali parti mostrare (base o complete col boost) lo decide il backend.
--
-- «Persona» = l'account quando si conosce (loggato all'evento, o dispositivo
-- legato dopo), altrimenti il dispositivo.
--
-- Weekend = da venerdì alle 6 a lunedì alle 6, ora italiana: la sera di
-- domenica che sfora dopo mezzanotte resta nello stesso weekend. «Torna» chi
-- ha una visita in almeno due weekend diversi del periodo; visita = scansione,
-- recensione o free drink riscattato nel locale.
CREATE OR REPLACE FUNCTION public.bar_stats(p_bar UUID, p_days INTEGER)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH params AS (
  SELECT today,
         ((today - (p_days - 1))::timestamp AT TIME ZONE 'Europe/Rome') AS since
  FROM (SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date AS today) t
),
ev AS (
  SELECT e.kind, e.source, e.visitor_id, e.created_at,
         e.user_id IS NULL AS anonymous,
         COALESCE(e.user_id, l.user_id) AS uid
  FROM public.bar_events e
  CROSS JOIN params
  LEFT JOIN LATERAL (
    SELECT vu.user_id
    FROM public.visitor_users vu
    WHERE e.user_id IS NULL AND vu.visitor_id = e.visitor_id
    ORDER BY vu.linked_at
    LIMIT 1
  ) l ON TRUE
  WHERE e.bar_id = p_bar AND e.created_at >= params.since
),
ev_p AS (
  SELECT ev.*, COALESCE(uid::text, 'v:' || visitor_id::text) AS person FROM ev
),
scans AS (SELECT * FROM ev_p WHERE kind = 'scan'),
views AS (SELECT * FROM ev_p WHERE kind = 'view'),
rev AS (
  SELECT r.user_id, r.created_at
  FROM public.ratings r CROSS JOIN params
  WHERE r.bar_id = p_bar AND r.created_at >= params.since
),
-- Chi ha aperto la scheda dal QR/NFC e poi ha recensito questo bar.
scan_reviewers AS (
  SELECT s.uid
  FROM (SELECT uid, MIN(created_at) AS at FROM scans WHERE uid IS NOT NULL GROUP BY uid) s
  WHERE EXISTS (
    SELECT 1 FROM public.ratings r
    WHERE r.bar_id = p_bar AND r.user_id = s.uid AND r.created_at >= s.at
  )
),
-- Dispositivi che hanno scansionato senza essere loggati, e gli account nati
-- da lì: il profilo è stato creato dopo la prima scansione anonima.
anon_scanners AS (
  SELECT visitor_id, MIN(created_at) AS at FROM scans WHERE anonymous GROUP BY visitor_id
),
signups AS (
  SELECT DISTINCT p.id AS user_id, p.created_at
  FROM anon_scanners a
  JOIN public.visitor_users vu ON vu.visitor_id = a.visitor_id
  JOIN public.profiles p ON p.id = vu.user_id
  WHERE p.created_at >= a.at
),
signup_reviewers AS (
  SELECT su.user_id
  FROM signups su
  WHERE EXISTS (
    SELECT 1 FROM public.ratings r
    WHERE r.bar_id = p_bar AND r.user_id = su.user_id AND r.created_at >= su.created_at
  )
),
visits AS (
  SELECT person, created_at FROM scans
  UNION ALL
  SELECT user_id::text, created_at FROM rev
  UNION ALL
  SELECT f.user_id::text, f.redeemed_at
  FROM public.free_drink_redemptions f CROSS JOIN params
  WHERE f.bar_id = p_bar AND f.user_id IS NOT NULL AND f.redeemed_at >= params.since
),
weekend_people AS (
  SELECT person, COUNT(DISTINCT date_trunc('week', local)) AS weekends
  FROM (
    SELECT person, (created_at AT TIME ZONE 'Europe/Rome') - INTERVAL '6 hours' AS local
    FROM visits
  ) v
  WHERE EXTRACT(ISODOW FROM local) IN (5, 6, 7)
  GROUP BY person
),
days AS (
  SELECT (params.today - i) AS day
  FROM params, generate_series(0, p_days - 1) AS i
),
daily AS (
  SELECT d.day,
         (SELECT COUNT(*) FROM scans s WHERE (s.created_at AT TIME ZONE 'Europe/Rome')::date = d.day) AS scans,
         (SELECT COUNT(*) FROM views w WHERE (w.created_at AT TIME ZONE 'Europe/Rome')::date = d.day) AS views,
         (SELECT COUNT(*) FROM rev r WHERE (r.created_at AT TIME ZONE 'Europe/Rome')::date = d.day) AS reviews
  FROM days d
)
SELECT jsonb_build_object(
  'days', p_days,
  'since', (SELECT since FROM params),
  'scans', jsonb_build_object(
    'total',  (SELECT COUNT(*) FROM scans),
    'people', (SELECT COUNT(DISTINCT person) FROM scans),
    'qr',     (SELECT COUNT(*) FROM scans WHERE source = 'qr'),
    'nfc',    (SELECT COUNT(*) FROM scans WHERE source = 'nfc')
  ),
  'scan_reviews', (SELECT COUNT(*) FROM scan_reviewers),
  'reviews', (SELECT COUNT(*) FROM rev),
  'funnel', jsonb_build_object(
    'anonymous_scanners', (SELECT COUNT(*) FROM anon_scanners),
    'signups',            (SELECT COUNT(*) FROM signups),
    'signup_reviews',     (SELECT COUNT(*) FROM signup_reviewers)
  ),
  'returning', jsonb_build_object(
    'weekend_visitors', (SELECT COUNT(*) FROM weekend_people),
    'returning',        (SELECT COUNT(*) FROM weekend_people WHERE weekends >= 2)
  ),
  'views', jsonb_build_object(
    'total',  (SELECT COUNT(*) FROM views),
    'people', (SELECT COUNT(DISTINCT person) FROM views),
    'map',    (SELECT COUNT(*) FROM views WHERE source = 'map'),
    'list',   (SELECT COUNT(*) FROM views WHERE source = 'list'),
    'search', (SELECT COUNT(*) FROM views WHERE source = 'search'),
    'link',   (SELECT COUNT(*) FROM views WHERE source = 'link'),
    'qr_nfc', (SELECT COUNT(*) FROM views WHERE source IN ('qr', 'nfc'))
  ),
  'impressions', (
    SELECT COALESCE(SUM(impressions), 0)
    FROM public.bar_impressions_daily, params
    WHERE bar_id = p_bar AND day >= params.today - (p_days - 1)
  ),
  'actions', jsonb_build_object(
    'directions', (SELECT COUNT(*) FROM ev_p WHERE kind = 'directions'),
    'call',       (SELECT COUNT(*) FROM ev_p WHERE kind = 'call'),
    'website',    (SELECT COUNT(*) FROM ev_p WHERE kind = 'website')
  ),
  'daily', (
    SELECT jsonb_agg(jsonb_build_object('day', day, 'scans', scans, 'views', views, 'reviews', reviews) ORDER BY day)
    FROM daily
  )
);
$$;

-- --- Lettura: crescita per il pannello admin ----------------------------------

-- Nuovi iscritti (oggi / 7 / 30 giorni, più la serie dei 30 giorni) e utenti
-- attivi negli ultimi 7 e 30 giorni. Attivo = ultimo ping dell'app
-- (last_seen_at) o ultimo login di Supabase Auth, il più recente dei due: il
-- login da solo sottostima, la sessione resta aperta per settimane.
CREATE OR REPLACE FUNCTION public.admin_growth_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH params AS (
  SELECT today, (today::timestamp AT TIME ZONE 'Europe/Rome') AS today_start
  FROM (SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date AS today) t
),
people AS (
  SELECT p.created_at, GREATEST(p.last_seen_at, u.last_sign_in_at) AS seen
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
)
SELECT jsonb_build_object(
  'new_today',  (SELECT COUNT(*) FROM people, params WHERE created_at >= params.today_start),
  'new_7d',     (SELECT COUNT(*) FROM people WHERE created_at >= NOW() - INTERVAL '7 days'),
  'new_30d',    (SELECT COUNT(*) FROM people WHERE created_at >= NOW() - INTERVAL '30 days'),
  'active_7d',  (SELECT COUNT(*) FROM people WHERE seen >= NOW() - INTERVAL '7 days'),
  'active_30d', (SELECT COUNT(*) FROM people WHERE seen >= NOW() - INTERVAL '30 days'),
  'signups_daily', (
    SELECT jsonb_agg(jsonb_build_object('day', d.day, 'count', (
      SELECT COUNT(*) FROM people WHERE (created_at AT TIME ZONE 'Europe/Rome')::date = d.day
    )) ORDER BY d.day)
    FROM (SELECT params.today - i AS day FROM params, generate_series(0, 29) AS i) d
  )
);
$$;

-- --- Permessi ----------------------------------------------------------------
-- SECURITY DEFINER senza REVOKE vorrebbe dire: chiunque abbia la anon key
-- legge le statistiche di qualunque bar o scrive eventi a nome di un altro.

REVOKE ALL ON FUNCTION public.record_bar_events(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_visitor(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_bar_impressions(UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_bar_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bar_stats(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_growth_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_bar_events(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_visitor(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_bar_impressions(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_bar_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.bar_stats(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_growth_stats() TO service_role;
