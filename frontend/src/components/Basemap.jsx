import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// The basemap. Vector tiles from OpenFreeMap, drawn by MapLibre GL inside the
// Leaflet map, so markers, events and everything else stay Leaflet.
//
// Why not the tiles of openstreetmap.org, which this used until now: those
// servers are run by the OSM Foundation for the mapping community, not as a
// CDN for other people's products — they block heavy or commercial use by
// Referer, without notice, and the map is the first screen of the app.
// OpenFreeMap is built for exactly this: no key, no account, no request cap,
// commercial use allowed. A key was never an option here (it would sit in the
// bundle), which is what rules out every other free tier.
//
// The style is a light one on purpose: the GL canvas lives in Leaflet's tile
// pane, so the theme filter in index.css (--map-filter) tints it exactly as
// it tinted the raster tiles.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '&copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

// Last resort only — no WebGL, or OpenFreeMap unreachable: better a map from
// the OSM servers for the few who end up here than a blank screen.
const RASTER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const RASTER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

// How long the style may take before the raster fallback kicks in. It is one
// small JSON file: if it has not arrived by now the service is not answering.
const STYLE_TIMEOUT_MS = 10_000;

// The style is fetched here rather than handed to MapLibre as a URL: a failure
// is then ours to see (and to fall back from) before any map exists, and the
// layers this map does not want can be dropped on the way.
async function loadStyle() {
  const res = await fetch(STYLE_URL, { signal: AbortSignal.timeout(STYLE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`stile non disponibile (${res.status})`);
  const style = await res.json();
  // Road-number shields (A22, SS12…): under the dark themes' inversion they
  // turn into white boxes brighter than anything else on the map, pins
  // included, and their filter logs a warning for every tile.
  style.layers = style.layers.filter((layer) => !layer.id.includes('shield'));
  return style;
}

export default function Basemap() {
  const map = useMap();

  useEffect(() => {
    let dead = false;
    let layer = null;

    // MapLibre is ~300 kB gzipped and only the map needs it: it loads here, in
    // its own chunk, after the page is already on screen — and next to the
    // style, not after it.
    Promise.all([
      loadStyle(),
      import('maplibre-gl'),
      import('@maplibre/maplibre-gl-leaflet'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
      .then(([style, maplibre, { maplibreGL }, worker]) => {
        if (dead) return;
        // Once bundled, MapLibre can no longer find its worker next to itself.
        maplibre.setWorkerUrl(worker.default);
        layer = maplibreGL({
          style,
          attribution: ATTRIBUTION,
          interactive: false,
          // A 3x phone would draw nine times the pixels of the layout; past 2x
          // nobody can tell, and the GPU of a cheap phone can.
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        }).addTo(map);
      })
      // The style did not arrive, the chunk did not, or there is no WebGL
      // (addTo throws). Tiles that fail later are not a reason to switch:
      // MapLibre retries them on its own.
      .catch((err) => {
        if (dead) return;
        console.warn('[rabar] mappa vettoriale non disponibile, uso le tile raster:', err?.message || err);
        if (layer) map.removeLayer(layer);
        layer = L.tileLayer(RASTER_URL, { attribution: RASTER_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      });

    return () => {
      dead = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
