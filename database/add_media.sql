-- Immagini pubbliche caricate dagli utenti: foto profilo e copertine degli eventi.
--
-- Bucket `media`, PUBBLICO in lettura (le immagini compaiono accanto a recensioni
-- ed eventi, un signed URL a scadenza non si può salvare in una riga), ma nessun
-- client ci scrive con la anon key: come per `proofs`, il backend firma un upload
-- URL per un path che sceglie lui (`backend/src/lib/media.js`), il client fa il
-- PUT dei byte e poi conferma il path con `PUT /me/avatar` o dentro l'evento.
--
-- Path: `avatars/<user_id>/<uuid>.<ext>` e `events/<user_id>/<uuid>.<ext>`.
-- I client ridimensionano e mandano JPEG: 5 MB bastano largamente.
--
-- Nessuna policy su storage.objects: senza policy la anon key non può scrivere
-- né elencare, e i signed upload URL del service role passano comunque. La
-- lettura dei file di un bucket pubblico non passa dalle policy.
--
-- Da eseguire una volta nel SQL Editor di Supabase prima del deploy del backend:
-- senza bucket, `POST /me/uploads/image` risponde 500.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
