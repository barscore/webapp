import { memo, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { usePins } from '../utils/pins.js';
import { scoreMeta, barKey, isDisco, DISCO_ICON_URL } from '../utils/score.js';

// Re-centers the map imperatively when center changes, restoring the default
// zoom (center only moves on geolocate / "la mia posizione").
function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Reports the live zoom level up to Map so the marker set can thin out.
function ZoomWatcher({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}

// Leaflet caches the container size at init; on iOS standalone the viewport
// (100dvh) settles after mount without firing window.resize, leaving tiles
// rendered only in the pre-settle area. Watch the container itself instead.
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// Smoothly pans to the focused bar without touching the query center.
function FlyTo({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [pos, map]);
  return null;
}

// Memoized: Home re-renders on every keystroke/toast/menu toggle — without
// memo each of those re-renders every Marker. Callers must pass stable
// (memoized) `bars` and `onSelect` for this to pay off.
function Map({ bars = [], center, zoom = 14, userPos, selectedKey, focus, onSelect }) {
  const pins = usePins();
  const [zoomLevel, setZoomLevel] = useState(zoom);

  // Zoomed out the map thins to the best-rated bars only:
  //   ≥ 14  → everything
  //   12–13 → only bars with reviews
  //   < 12  → only "verde" bars (score ≥ 7)
  // The selected bar always stays visible.
  const visibleBars = useMemo(() => {
    if (zoomLevel >= 14) return bars;
    return bars.filter((bar) => {
      if (barKey(bar) === selectedKey) return true;
      const meta = scoreMeta(bar);
      if (!meta.hasReviews) return false;
      return zoomLevel >= 12 || meta.variant === 'verde';
    });
  }, [bars, zoomLevel, selectedKey]);

  // Build one Leaflet icon per pin variant from the extracted sprite data URLs.
  // Two sizes: normal, and an enlarged animated variant for the selected pin.
  const icons = useMemo(() => {
    if (!pins) return null;
    const make = (url, active) =>
      L.icon({
        iconUrl: url,
        iconSize: active ? [58, 58] : [40, 40],
        iconAnchor: active ? [29, 55] : [20, 38],
        popupAnchor: [0, -34],
        className: active ? 'rabar-pin rabar-pin-active' : 'rabar-pin',
      });
    // Discoteche use dedicated pin art (41×52, tip at bottom) per score band.
    // Height matches the bar pins (40 / 58); width follows the 41:52 aspect so
    // disco markers read the same size as bars.
    const makeDisco = (url, active) =>
      L.icon({
        iconUrl: url,
        iconSize: active ? [46, 58] : [32, 40],
        iconAnchor: active ? [23, 55] : [16, 38],
        popupAnchor: [0, -34],
        className: active ? 'rabar-pin rabar-pin-active rabar-disco' : 'rabar-pin rabar-disco',
      });
    const disco = {
      verde: makeDisco(DISCO_ICON_URL.verde),
      arancione: makeDisco(DISCO_ICON_URL.arancione),
      grigio: makeDisco(DISCO_ICON_URL.grigio),
    };
    return {
      verde: make(pins.verde),
      arancione: make(pins.arancione),
      grigio: make(pins.grigio),
      disco,
      active: {
        verde: make(pins.verde, true),
        arancione: make(pins.arancione, true),
        grigio: make(pins.grigio, true),
        disco: {
          verde: makeDisco(DISCO_ICON_URL.verde, true),
          arancione: makeDisco(DISCO_ICON_URL.arancione, true),
          grigio: makeDisco(DISCO_ICON_URL.grigio, true),
        },
      },
    };
  }, [pins]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom
      zoomControl={false}
    >
      {/* Plain OpenStreetMap tiles: CARTO started watermarking its basemaps
          with "API key required", and a key is not an option here. The tiles
          are light — the .leaflet-tile-pane filter in index.css turns them
          into the active theme's map (see --map-filter). */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ResizeFix />
      <Recenter center={center} zoom={zoom} />
      <FlyTo pos={focus} />
      <ZoomWatcher onZoom={setZoomLevel} />

      {userPos && (
        <Marker
          position={userPos}
          icon={L.divIcon({
            className: 'rabar-user',
            html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:2px solid #fff"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })}
        />
      )}

      {icons &&
        visibleBars.map((bar) => {
          const { variant } = scoreMeta(bar);
          const key = barKey(bar);
          const isActive = key === selectedKey;
          const icon = isDisco(bar)
            ? (isActive ? icons.active.disco[variant] : icons.disco[variant])
            : (isActive ? icons.active[variant] : icons[variant]);
          return (
            <Marker
              key={key}
              position={[bar.lat, bar.lng]}
              icon={icon}
              zIndexOffset={isActive ? 1000 : 0}
              eventHandlers={{ click: () => onSelect?.(bar) }}
            />
          );
        })}
    </MapContainer>
  );
}

export default memo(Map);
