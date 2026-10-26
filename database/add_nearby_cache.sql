-- =============================================
-- add_nearby_cache.sql — cache condivisa dei risultati di Overpass (13/10/2026)
-- Da eseguire nel SQL Editor di Supabase. Idempotente.
--
-- /places/nearby tiene i luoghi di OpenStreetMap in una cache che vive nella
-- memoria di UNA istanza del backend. Su Vercel le istanze nascono e muoiono
-- di continuo, e ognuna nuova ripartiva da zero: chi le capitava per primo
-- aspettava Overpass — 10-20 secondi, a volte un 502 — per una zona che
-- un'altra istanza aveva già scaricato. Questa tabella è la stessa cache, ma
-- di tutte: l'istanza fredda legge da qui e chiama Overpass solo per le zone
-- che non ha ancora chiesto nessuno.
--
-- ORDINE: nessuno. Il backend funziona anche senza (lib/nearbyStore.js tratta
-- la tabella mancante come una cache vuota): eseguirla prima o dopo il deploy
-- cambia solo quando la cache condivisa comincia a servire.
-- =============================================

CREATE TABLE IF NOT EXISTS public.nearby_cache (
  -- t<versione>:<riga>:<colonna> di un tassello da 0,05° (backend/src/lib/
  -- nearbyTiles.js), oppure lock:<riquadro> per una query a Overpass in corso.
  -- Fino al 26/10/2026 era v<schema>:<lat>,<lng>,<raggio>: la pulizia del cron
  -- toglie quelle righe.
  key        TEXT PRIMARY KEY,
  places     JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- La pulizia periodica (POST /cron/reminders → pruneShared) cancella per età.
CREATE INDEX IF NOT EXISTS idx_nearby_cache_fetched_at
  ON public.nearby_cache (fetched_at);

-- RLS on, nessuna policy: la tocca solo il backend (service-role). Sono dati
-- pubblici di OpenStreetMap, ma un client non ha motivo di leggerli da qui né,
-- soprattutto, di scriverci.
ALTER TABLE public.nearby_cache ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Già che si è qui: indice per i filtri a riquadro su `bars`.
-- /places/nearby non scarica più tutta la tabella, chiede solo i bar dentro un
-- intervallo di lat/lng (lib/bbox.js). A 150 righe Postgres le scorre tutte
-- comunque; l'indice serve quando saranno migliaia.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bars_lat_lng
  ON public.bars (lat, lng);
