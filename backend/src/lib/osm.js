// Free OpenStreetMap data sources — no API key required.
//   - Overpass API: query bars/pubs around a point
//   - Nominatim:     geocode a free-text place/address
// Both are free public endpoints; respect their usage policy by sending a
// descriptive User-Agent and not hammering them.

// Overpass public mirrors, RACED in parallel (not sequential). Each mirror has
// wildly variable latency (.de ~9s, others 406/504/hang), so we fire all at
// once and take the first HTTP 200 — bounding latency to the fastest healthy
// mirror instead of summing timeouts. Override with a comma-separated
// OVERPASS_URL.
const OVERPASS_URLS = (process.env.OVERPASS_URL
  ? process.env.OVERPASS_URL.split(',').map((s) => s.trim()).filter(Boolean)
  : [
      'https://overpass.private.coffee/api/interpreter',
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ]);
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const UA = process.env.OSM_USER_AGENT || 'rabar/1.0 (https://github.com/rabar; contact: admin@rabar.app)';
const OVERPASS_TIMEOUT_MS = Number(process.env.OVERPASS_TIMEOUT_MS) || 20000;

// Fire the query at every mirror simultaneously; resolve with the first 200.
// Each attempt aborts on timeout; losers are aborted once a winner is found so
// no hung connection (mail.ru-style 109s) leaks. Overpass accepts the raw
// query as the POST body.
async function overpassFetch(query, timeoutMs = OVERPASS_TIMEOUT_MS) {
  const controllers = OVERPASS_URLS.map(() => new AbortController());
  const timers = [];
  try {
    const attempts = OVERPASS_URLS.map((url, i) => {
      const ctrl = controllers[i];
      timers.push(setTimeout(() => ctrl.abort(), timeoutMs));
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'User-Agent': UA },
        body: query,
        signal: ctrl.signal,
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Overpass ${res.status} (${url})`);
        return res.json();
      });
    });
    // Promise.any → first fulfilled wins; rejects only if ALL fail.
    return await Promise.any(attempts);
  } catch (e) {
    // AggregateError when every mirror failed.
    const msg = e.errors?.map((x) => x.message).join('; ') || e.message;
    throw new Error(`Overpass unreachable: ${msg}`);
  } finally {
    controllers.forEach((c) => c.abort()); // cancel stragglers
    timers.forEach(clearTimeout);
  }
}

// Build a single-line street address from OSM address tags.
function formatAddress(tags = {}) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  return [street, tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(', ');
}

function mapElement(el) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  return {
    osm_node_id: el.id,
    osm_type: el.type, // node | way | relation
    name: tags.name || 'Senza nome',
    amenity: tags.amenity,
    address: formatAddress(tags),
    city: tags['addr:city'] || null,
    lat,
    lng,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    // OSM occasionally carries an `image` tag (often a Wikimedia/Commons URL).
    cover_image_url: tags.image || null,
  };
}

/**
 * Find bars/pubs/biergartens/nightclubs within `radiusKm` of (lat, lng) via
 * Overpass. Nightclubs (discoteche) come back tagged `amenity=nightclub` so the
 * client can distinguish them from bars. Returns normalized POIs (not persisted).
 */
export async function findNearbyBars(lat, lng, radiusKm = 2) {
  const radiusM = Math.round(radiusKm * 1000);
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"^(bar|pub|biergarten|nightclub)$"](around:${radiusM},${lat},${lng});
      way["amenity"~"^(bar|pub|biergarten|nightclub)$"](around:${radiusM},${lat},${lng});
    );
    out center tags;`;

  const data = await overpassFetch(query);
  return (data.elements || []).map(mapElement).filter(Boolean);
}

/**
 * Fetch a single OSM element (node/way/relation) by id via Overpass.
 * Used to backfill a bar's details when the client only knows its OSM id.
 * Returns a normalized POI, or null if not found.
 */
export async function fetchElement(osmType, osmId) {
  const type = ['node', 'way', 'relation'].includes(osmType) ? osmType : 'node';
  const query = `[out:json][timeout:25];${type}(${osmId});out center tags;`;

  const data = await overpassFetch(query);
  const el = (data.elements || [])[0];
  return el ? mapElement(el) : null;
}

/**
 * Geocode a free-text query (place name or address) via Nominatim.
 * Returns up to `limit` candidates with coordinates.
 */
export async function geocode(query, limit = 5) {
  const url = `${NOMINATIM_URL}/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);
  const data = await res.json();
  return (data || []).map((r) => ({
    display_name: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    type: r.type,
  }));
}
