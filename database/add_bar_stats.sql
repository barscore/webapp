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
--                            review     dal sito, appena il dispositivo pubblica
--                                       una recensione nuova a quel bar
--                            signup     dal sito, quando dal dispositivo nasce un
--                                       account (senza bar)
--   bar_impressions_daily  quante volte un bar è uscito in /places/nearby, per
--                          giorno: un contatore, nessun dato personale.
--   profiles.last_seen_at  ultimo ping di attività (POST /stats/ping), per gli
--                          utenti attivi del pannello admin.
--
-- Il dispositivo è un UUID casuale che il client tiene in locale e che NON
-- viene mai legato all'account: il backend su /stats/events non legge il
-- token, ne guarda solo la presenza (signed_in), e il ping non manda il
-- dispositivo. Così l'identificativo resta uno strumento di statistica
-- aggregata, assimilabile ai cookie tecnici secondo le linee guida del Garante
-- del 10 giugno 2021, e non chiede consenso. Il percorso «ha scansionato da
-- anonimo, poi si è registrato, poi ha recensito» si conta per dispositivo,
-- con gli eventi review e signup. La prima versione di questo file legava il
-- dispositivo all'account (visitor_users): mai eseguita in produzione, e
-- dove è passata la parte qui sotto la smonta.
--
-- Il proprietario vede SOLO numeri aggregati, mai chi. Le tabelle hanno RLS
-- attiva e nessuna policy, le funzioni sono revocate a anon e authenticated:
-- le tocca solo il backend con la service-role key.
--
-- Conservazione: gli eventi si cancellano dopo 13 mesi (prune_bar_stats,
-- chiamata dal cron dei promemoria). I contatori giornalieri restano.
-- =============================================

-- --- Tabelle -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bar_events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- NULL solo per signup, che non riguarda un bar.
  bar_id     UUID REFERENCES public.bars(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  source     TEXT CHECK (source IN ('qr', 'nfc', 'map', 'list', 'search', 'link')),
  visitor_id UUID NOT NULL,
  -- Se la richiesta portava un token: «da loggato», mai chi.
  signed_in  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Smontaggio della prima versione, dove è passata (vedi in testa).
DROP TABLE IF EXISTS public.visitor_users;
DROP FUNCTION IF EXISTS public.touch_visitor(UUID, UUID);
DROP FUNCTION IF EXISTS public.record_bar_events(UUID, UUID, JSONB);
ALTER TABLE public.bar_events DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.bar_events ADD COLUMN IF NOT EXISTS signed_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.bar_events ALTER COLUMN bar_id DROP NOT NULL;

ALTER TABLE public.bar_events DROP CONSTRAINT IF EXISTS bar_events_kind_check;
ALTER TABLE public.bar_events ADD CONSTRAINT bar_events_kind_check
  CHECK (kind IN ('scan', 'view', 'directions', 'call', 'website', 'review', 'signup'));
ALTER TABLE public.bar_events DROP CONSTRAINT IF EXISTS bar_events_bar_kind_check;
ALTER TABLE public.bar_events ADD CONSTRAINT bar_events_bar_kind_check
  CHECK ((kind = 'signup') = (bar_id IS NULL));

CREATE INDEX IF NOT EXISTS idx_bar_events_bar_kind_time
  ON public.bar_events (bar_id, kind, created_at);
-- Dedup in record_bar_events («questo dispositivo ha già mandato lo stesso
-- evento da poco?») e il percorso per dispositivo in bar_stats.
CREATE INDEX IF NOT EXISTS idx_bar_events_visitor_time
  ON public.bar_events (visitor_id, created_at);
-- Pulizia per data (prune_bar_stats).
CREATE INDEX IF NOT EXISTS idx_bar_events_time
  ON public.bar_events (created_at);

ALTER TABLE public.bar_events ENABLE ROW LEVEL SECURITY;

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
-- visualizzazione, un giorno per recensione e registrazione, 1 minuto per i
-- pulsanti.
CREATE OR REPLACE FUNCTION public.record_bar_events(
  p_visitor   UUID,
  p_signed_in BOOLEAN,
  p_events    JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted INTEGER;
BEGIN
  WITH incoming AS (
    SELECT DISTINCT ON (bar_id, kind) bar_id, kind, source
    FROM (
      SELECT NULLIF(e->>'bar_id', '')::uuid AS bar_id,
             e->>'kind' AS kind,
             NULLIF(e->>'source', '') AS source
      FROM jsonb_array_elements(p_events) AS e
    ) raw
    ORDER BY bar_id, kind
  )
  INSERT INTO public.bar_events (bar_id, kind, source, visitor_id, signed_in)
  SELECT i.bar_id, i.kind, i.source, p_visitor, COALESCE(p_signed_in, FALSE)
  FROM incoming i
  WHERE (
      (i.kind = 'signup' AND i.bar_id IS NULL)
      OR (i.kind <> 'signup' AND EXISTS (SELECT 1 FROM public.bars b WHERE b.id = i.bar_id))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.bar_events x
      WHERE x.visitor_id = p_visitor
        AND x.bar_id IS NOT DISTINCT FROM i.bar_id
        AND x.kind = i.kind
        AND x.created_at > NOW() - CASE i.kind
          WHEN 'scan' THEN INTERVAL '30 minutes'
          WHEN 'view' THEN INTERVAL '10 minutes'
          WHEN 'review' THEN INTERVAL '1 day'
          WHEN 'signup' THEN INTERVAL '1 day'
          ELSE INTERVAL '1 minute'
        END
    );

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

-- Ping di attività di chi è loggato: segna l'ultimo accesso dell'account, e
-- nient'altro. Scrive al massimo ogni 10 minuti per utente.
CREATE OR REPLACE FUNCTION public.touch_user(p_user UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
  )
  SELECT COUNT(*) FROM ev;
$$;

-- --- Lettura: statistiche di un bar -------------------------------------------

-- Tutti i numeri della scheda statistiche per gli ultimi `p_days` giorni
-- (giorni di calendario italiani, oggi compreso). Restituisce sempre tutto:
-- quali parti mostrare (base o complete col boost) lo decide il backend.
--
-- «Persona» negli eventi = il dispositivo. Recensioni e free drink sono dati
-- dell'account (tabelle del servizio, non statistiche): nei ritorni del
-- weekend contano come persone a sé, senza unirli ai dispositivi.
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
  SELECT e.kind, e.source, e.visitor_id, e.signed_in, e.created_at,
         'v:' || e.visitor_id::text AS person
  FROM public.bar_events e CROSS JOIN params
  WHERE e.bar_id = p_bar AND e.created_at >= params.since
),
scans AS (SELECT * FROM ev WHERE kind = 'scan'),
views AS (SELECT * FROM ev WHERE kind = 'view'),
rev AS (
  SELECT r.user_id, r.created_at
  FROM public.ratings r CROSS JOIN params
  WHERE r.bar_id = p_bar AND r.created_at >= params.since
),
first_scan AS (
  SELECT visitor_id, MIN(created_at) AS at FROM scans GROUP BY visitor_id
),
-- Dispositivi che hanno aperto la scheda dal QR/NFC e poi hanno pubblicato una
-- recensione a questo bar.
scan_reviewers AS (
  SELECT s.visitor_id
  FROM first_scan s
  WHERE EXISTS (
    SELECT 1 FROM public.bar_events r
    WHERE r.bar_id = p_bar AND r.kind = 'review'
      AND r.visitor_id = s.visitor_id AND r.created_at >= s.at
  )
),
-- Dispositivi che hanno scansionato senza essere loggati, quelli da cui poi è
-- nato un account, e quelli che dopo hanno anche recensito.
anon_scanners AS (
  SELECT visitor_id, MIN(created_at) AS at FROM scans WHERE NOT signed_in GROUP BY visitor_id
),
signups AS (
  SELECT a.visitor_id, MIN(su.created_at) AS at
  FROM anon_scanners a
  JOIN public.bar_events su
    ON su.kind = 'signup' AND su.visitor_id = a.visitor_id AND su.created_at >= a.at
  GROUP BY a.visitor_id
),
signup_reviewers AS (
  SELECT su.visitor_id
  FROM signups su
  WHERE EXISTS (
    SELECT 1 FROM public.bar_events r
    WHERE r.bar_id = p_bar AND r.kind = 'review'
      AND r.visitor_id = su.visitor_id AND r.created_at >= su.at
  )
),
visits AS (
  SELECT person, created_at FROM scans
  UNION ALL
  SELECT 'u:' || user_id::text, created_at FROM rev
  UNION ALL
  SELECT 'u:' || f.user_id::text, f.redeemed_at
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
    'directions', (SELECT COUNT(*) FROM ev WHERE kind = 'directions'),
    'call',       (SELECT COUNT(*) FROM ev WHERE kind = 'call'),
    'website',    (SELECT COUNT(*) FROM ev WHERE kind = 'website')
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

REVOKE ALL ON FUNCTION public.record_bar_events(UUID, BOOLEAN, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_bar_impressions(UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_bar_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bar_stats(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_growth_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_bar_events(UUID, BOOLEAN, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_bar_impressions(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_bar_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.bar_stats(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_growth_stats() TO service_role;
