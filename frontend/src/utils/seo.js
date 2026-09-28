// SEO rules shared by the React app and the build-time prerender
// (scripts/prerender.mjs). Plain ESM, no Vite-only imports: Node loads this
// file directly at build time.

export const SITE_URL = 'https://www.rabar.it';

export const DEFAULT_TITLE = 'rabar — mappa dei bar valutati dalla community';
export const DEFAULT_DESCRIPTION =
  'rabar è la mappa dei bar valutati dalla community su cinque assi: prezzo, qualità dei drink, socialità, varietà e orari. Trova il bar giusto vicino a te.';

// A city page is worth indexing only once it lists enough reviewed bars to be
// more than an empty directory.
export const CITY_MIN_BARS = 3;
export const CITY_MIN_RATED = 3;

export function slugify(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SMALL_WORDS = new Set(['di', 'del', 'della', 'dei', 'delle', 'da', 'in', 'al', 'sul', 'sulla', 'e']);

/** OSM city tags come in any case: "rovereto" → "Rovereto", "Riva del Garda" kept. */
export function cityName(s) {
  const v = String(s ?? '').trim();
  if (v !== v.toLowerCase()) return v;
  return v
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.replace(/(^|['-])\p{L}/gu, (m) => m.toUpperCase())))
    .join(' ');
}

/** "Name, City" for titles; just the name when the city is unknown. */
export const barPlace = (bar) => (hasCity(bar) ? `${bar.name}, ${cityName(bar.city)}` : bar.name);

const hasCity = (bar) => !!bar?.city && bar.city !== 'N/D';

const totalRatings = (bar) =>
  Number(bar?.total_ratings ?? bar?.bar_ratings_summary?.total_ratings) || 0;

/** A bar page goes in the index only with at least one review and a real city. */
export function barIndexable(bar) {
  return totalRatings(bar) > 0 && hasCity(bar);
}

/**
 * Groups bars by city slug: [{ slug, name, bars, rated }], biggest first.
 * `rated` counts bars with at least one review.
 */
export function groupByCity(bars) {
  const map = new Map();
  for (const b of bars ?? []) {
    if (!hasCity(b)) continue;
    const slug = slugify(b.city);
    if (!slug) continue;
    if (!map.has(slug)) map.set(slug, { slug, name: cityName(b.city), bars: [], rated: 0 });
    const c = map.get(slug);
    c.bars.push(b);
    if (totalRatings(b) > 0) c.rated += 1;
  }
  return [...map.values()]
    .filter((c) => c.bars.length >= CITY_MIN_BARS)
    .sort((a, b) => b.rated - a.rated || b.bars.length - a.bars.length);
}

export const cityIndexable = (city) => city.rated >= CITY_MIN_RATED;

/** Best first: overall score, then number of reviews. Unrated bars last. */
export function byScore(a, b) {
  return (
    (Number(b.avg_overall) || 0) - (Number(a.avg_overall) || 0) ||
    totalRatings(b) - totalRatings(a)
  );
}
