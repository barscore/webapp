#!/usr/bin/env bash
# rabar — backup notturno del database Supabase.
#
# Un pg_dump al giorno in ~/backups/rabar/, con rotazione. Pensato per girare
# sul VPS da un timer systemd (rabar-backup.timer), ma funziona ovunque ci
# siano bash e Docker: pg_dump gira in un container, così la versione è sempre
# quella giusta (deve essere >= quella del server, oggi Postgres 17) senza
# installare niente sulla macchina.
#
# Cosa c'è dentro: gli schemi `public` (tutti i dati dell'app), `auth` (gli
# account) e `storage` (l'elenco dei file caricati).
# Cosa NON c'è: i FILE del bucket `proofs` (visure e documenti delle
# rivendicazioni). Stanno nello storage a oggetti, non nel database: qui se ne
# salva solo l'indice.
#
# Configurazione, da ambiente (il timer la legge da ~/.config/rabar-backup.env):
#   SUPABASE_DB_URL  obbligatoria. La stringa «Session pooler» della dashboard
#                    (Connect → Session pooler), password compresa. NON quella
#                    «Direct connection»: è solo IPv6 e da un container non
#                    si raggiunge.
#   BACKUP_DIR       dove scrivere        (default ~/backups/rabar)
#   KEEP_DAYS        giorni da tenere     (default 30)
#   PG_IMAGE         immagine con pg_dump (default postgres:17-alpine)
#
# Ripristino di tutto in un database vuoto:
#   pg_restore --no-owner --no-privileges -d "<url>" rabar-AAAA-MM-GG.dump
# Solo i dati dell'app, su un progetto Supabase nuovo con lo schema già creato:
#   pg_restore --data-only --schema=public --disable-triggers -d "<url>" <file>
set -euo pipefail

: "${SUPABASE_DB_URL:?manca SUPABASE_DB_URL (vedi i commenti in testa al file)}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/rabar}"
KEEP_DAYS="${KEEP_DAYS:-30}"
PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"

# Il nome porta la data italiana: il timer scatta a mezzanotte di Roma, e il
# VPS ha l'orologio in UTC — senza TZ il file di stanotte porterebbe ieri.
out="$BACKUP_DIR/rabar-$(TZ=Europe/Rome date +%F).dump"
tmp="$out.partial"

umask 077 # i dump contengono email e hash delle password: leggibili solo da chi li fa
mkdir -p "$BACKUP_DIR"
trap 'rm -f "$tmp"' EXIT

# La URL passa come variabile d'ambiente del container (-e NOME, senza valore):
# scritta sulla riga di comando resterebbe, password compresa, in `ps`.
pg() {
  docker run --rm -i ${DOCKER_NET:+--network "$DOCKER_NET"} -e SUPABASE_DB_URL "$PG_IMAGE" "$@"
}

# Formato custom: compresso, e ripristinabile a pezzi (uno schema, una tabella).
# Le due tabelle escluse sono cache e contatori: si rigenerano da sole.
pg sh -c 'exec pg_dump "$SUPABASE_DB_URL" \
  --format=custom --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  --exclude-table-data=public.nearby_cache \
  --exclude-table-data=public.rate_limits' > "$tmp"

# Un dump troncato a metà è peggio di nessun dump: si crede di averlo. Prima di
# dargli il nome definitivo lo si fa rileggere a pg_restore, e si controlla che
# dentro ci siano davvero i dati degli utenti.
toc="$(pg pg_restore --list < "$tmp")"
grep -q 'TABLE DATA public profiles' <<< "$toc" || { echo "backup incompleto: mancano i dati di public.profiles" >&2; exit 1; }
grep -q 'TABLE DATA auth users' <<< "$toc" || { echo "backup incompleto: mancano i dati di auth.users" >&2; exit 1; }

mv "$tmp" "$out"
find "$BACKUP_DIR" -maxdepth 1 -name 'rabar-*.dump' -mtime +"$KEEP_DAYS" -delete

echo "backup ok: $out ($(du -h "$out" | cut -f1)), $(find "$BACKUP_DIR" -maxdepth 1 -name 'rabar-*.dump' | wc -l | tr -d ' ') in archivio"
