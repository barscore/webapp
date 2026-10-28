// Gli id nei path dell'API vengono anche dall'URL della pagina (`/bar/:id`,
// `/event/:id`, `/drink/:id`), e React Router li decodifica: il link
// `/bar/..%2F..%2Fme%2Fexport` diventava `/bars/../../me/export`, che il browser
// risolve in una GET su /me/export col token di chi lo apre. Nessuna rotta ha
// segmenti `.`/`..` (nemmeno codificati), spazi o controlli (il parser toglie
// TAB e a capo, `.\t.` diventa `..`), backslash o `#`: una richiesta così non
// parte proprio.
const DOT_SEGMENT = /^(\.|%2e){1,2}$/i;
const BAD_CHARS = /[\s\\#\u0000-\u001f\u007f]/;

export function assertSafeApiPath(url = '') {
  const path = String(url).split('?')[0];
  if (BAD_CHARS.test(path) || path.split('/').some((s) => DOT_SEGMENT.test(s))) {
    throw new Error(`Percorso API non valido: ${path}`);
  }
}
