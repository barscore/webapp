-- Prove allegate: file di verifica per le rivendicazioni bar e per le richieste
-- di account PR / organizzatore.
--
-- I file vivono nel bucket privato `proofs`, sotto `proofs/<user_id>/<uuid>.<ext>`.
-- Il client non parla mai con lo storage a mani nude: il backend firma un upload
-- URL (`lib/proofs.js`), il client fa il PUT dei byte, e la riga tiene solo i path.
-- L'admin li legge da signed URL a scadenza, mai da URL pubblici.
--
-- Cambia anche il modello dei ruoli: "proprietario" non si chiede più dalle
-- impostazioni, si ottiene rivendicando un bar dalla sua pagina. Il tipo resta
-- valido su `profiles.organizer_type` (lo scrive l'approvazione della claim),
-- ma sparisce dai tipi richiedibili.
--
-- Run after add_organizers.sql.

-- ---------------------------------------------------------------------------
-- 1) Bucket privato per i file di prova.
--    Limiti anche qui, non solo nello zod: lo storage è l'ultima linea.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proofs',
  'proofs',
  FALSE,
  8388608, -- 8 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = FALSE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) organizer_requests — il form diventa: tipo, allegati, nota facoltativa,
--    e (solo PR) con chi hai collaborato. Canali e prova testuale spariscono.
-- ---------------------------------------------------------------------------

-- Le richieste "proprietario" non hanno più un posto: quel percorso ora passa
-- dalla rivendicazione del bar. Si tolgono prima di stringere il CHECK.
DELETE FROM public.organizer_requests WHERE requested_type = 'proprietario';

ALTER TABLE public.organizer_requests DROP CONSTRAINT IF EXISTS organizer_requests_requested_type_check;
ALTER TABLE public.organizer_requests
  ADD CONSTRAINT organizer_requests_requested_type_check
  CHECK (requested_type IN ('pr', 'organizzatore'));

ALTER TABLE public.organizer_requests
  ADD COLUMN IF NOT EXISTS note TEXT CHECK (char_length(note) <= 1000);

-- Il testo libero già inviato diventa la nota: nessuna richiesta in attesa
-- perde quello che l'utente aveva scritto.
UPDATE public.organizer_requests
   SET note = left(proof, 1000)
 WHERE note IS NULL AND proof IS NOT NULL;

ALTER TABLE public.organizer_requests DROP COLUMN IF EXISTS proof;
ALTER TABLE public.organizer_requests DROP COLUMN IF EXISTS channels;
ALTER TABLE public.organizer_requests DROP COLUMN IF EXISTS channels_other;

-- Solo il PR dichiara le collaborazioni.
ALTER TABLE public.organizer_requests ALTER COLUMN collaborations DROP NOT NULL;

-- Massimo 3 allegati. Il minimo (1) lo impone lo zod: le righe già esistenti
-- hanno l'array vuoto, e `array_length('{}', 1)` è NULL, quindi il CHECK passa.
ALTER TABLE public.organizer_requests
  ADD COLUMN IF NOT EXISTS proof_files TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.organizer_requests DROP CONSTRAINT IF EXISTS organizer_requests_proof_files_max;
ALTER TABLE public.organizer_requests
  ADD CONSTRAINT organizer_requests_proof_files_max
  CHECK (array_length(proof_files, 1) <= 3);

-- ---------------------------------------------------------------------------
-- 3) bar_claims — stessa forma: allegati obbligatori, nota facoltativa.
-- ---------------------------------------------------------------------------
ALTER TABLE public.bar_claims
  ADD COLUMN IF NOT EXISTS note TEXT CHECK (char_length(note) <= 1000);

UPDATE public.bar_claims
   SET note = left(proof, 1000)
 WHERE note IS NULL AND proof IS NOT NULL;

ALTER TABLE public.bar_claims DROP COLUMN IF EXISTS proof;

ALTER TABLE public.bar_claims
  ADD COLUMN IF NOT EXISTS proof_files TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.bar_claims DROP CONSTRAINT IF EXISTS bar_claims_proof_files_max;
ALTER TABLE public.bar_claims
  ADD CONSTRAINT bar_claims_proof_files_max
  CHECK (array_length(proof_files, 1) <= 3);
