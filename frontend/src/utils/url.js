// Un URL che viene dai dati (OSM, proprietari, staff) e finisce in un href:
// solo http(s), o niente link. React 18 non blocca `javascript:` negli href, e
// un link così esegue codice sul sito di chi lo tocca.
export function httpHref(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
