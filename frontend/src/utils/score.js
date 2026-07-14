// Shared rating helpers. DB averages are on a 1–5 scale; the UI shows a 0–10
// score (value * 2). Pin variant + score color follow the same bands used by
// the map markers so a bar looks identical in the list and on the map.
//
//   verde     (green)  score ≥ 7   — ben valutato
//   arancione (orange) score < 7   — valutato sotto la soglia
//   grigio    (grey)   no reviews yet → shown as "—"

export function scoreMeta(bar) {
  const overall =
    Number(bar?.avg_overall ?? bar?.bar_ratings_summary?.avg_overall) || 0;
  const total =
    Number(bar?.total_ratings ?? bar?.bar_ratings_summary?.total_ratings) || 0;
  const s = overall * 2; // 0–10
  const hasReviews = total > 0 && s > 0;

  if (!hasReviews) {
    return { score: '—', variant: 'grigio', color: 'text-ember-muted', hasReviews: false };
  }
  if (s >= 7) {
    // `variant` keys the pin art (utils/pins.js, Map.jsx) — do not rename it.
    // The color is a token because the old hardcoded #57C08A sat at 1.6:1 on
    // the light theme's card.
    return { score: s.toFixed(1), variant: 'verde', color: 'text-ember-good', hasReviews: true };
  }
  // `ink`, not `primary`: these scores render at 16–18px bold, which is below
  // the "large text" threshold, so they need the full 4.5:1.
  return { score: s.toFixed(1), variant: 'arancione', color: 'text-ember-ink', hasReviews: true };
}

// Discoteche (OSM amenity=nightclub) share the map with bars but use their own
// pin art. Same score bands as bars: verde/arancione/grigio → alto/medio/
// nonvalutato.
export function isDisco(bar) {
  return bar?.amenity === 'nightclub';
}

export const DISCO_ICON_URL = {
  verde: '/icons/disco-alto.png',
  arancione: '/icons/disco-medio.png',
  grigio: '/icons/disco-nonvalutato.png',
};

// Stable client-side identity for a bar. Persisted bars have a DB uuid; OSM-only
// bars (not yet rated) are addressed by their OpenStreetMap type + id until the
// first visit materializes them (see BarDetail + POST /bars/resolve).
export function barKey(bar) {
  if (bar?.id) return bar.id;
  return `osm_${bar?.osm_type || 'node'}_${bar?.osm_node_id}`;
}

// Inverse of barKey for OSM-only bars: "osm_<type>_<id>" → { osm_type,
// osm_node_id }, or null when the key is a plain DB uuid.
export function parseOsmToken(id) {
  if (!id?.startsWith('osm_')) return null;
  const [, osm_type, osm_node_id] = id.split('_');
  return { osm_type, osm_node_id: Number(osm_node_id) };
}

// Subtitle line for a list row: "0.3 km · Aperto" / "1.1 km · Nessuna recensione".
export function barSubtitle(bar, hasReviews) {
  const dist = bar?.distance_km != null ? `${bar.distance_km} km` : bar?.city;
  const status = bar?.is_active === false ? 'Chiuso' : hasReviews ? 'Aperto' : 'Nessuna recensione';
  return [dist, status].filter(Boolean).join(' · ');
}
