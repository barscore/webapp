import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Basemap from './Basemap.jsx';
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

// How far past the screen edge markers are kept, as a fraction of the screen:
// half a screen on every side, so a short pan finds them already there.
const VIEW_PAD = 0.5;

// Reports the live zoom level and the area on screen up to Map, so the marker
// set can thin out and skip what nobody can see. It speaks up only when the
// zoom changes or the view leaves the padded box it reported last: panning
// around inside it re-renders nothing.
function ViewWatcher({ onView }) {
  const last = useRef(null);
  const report = useCallback(
    (map) => {
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      const prev = last.current;
      if (prev && prev.zoom === zoom && prev.box.contains(bounds)) return;
      last.current = { zoom, box: bounds.pad(VIEW_PAD) };
      onView(last.current);
    },
    [onView],
  );
  // moveend also closes every zoom; resize covers the container settling
  // after mount (see ResizeFix), when the first bounds were those of a
  // zero-sized map.
  const map = useMapEvents({ moveend: () => report(map), resize: () => report(map) });
  useEffect(() => {
    report(map);
  }, [map, report]);
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
  // `box` is null until the map reports in (one effect after mount).
  const [view, setView] = useState({ zoom, box: null });

  // Only the bars on screen (plus a margin) become markers: every Marker is a
  // DOM node Leaflet repositions on each zoom, and a 25 km radius over a big
  // city loads a thousand of them.
  // Zoomed out the map also thins to the best-rated bars:
  //   ≥ 14  → everything
  //   12–13 → only bars with reviews
  //   < 12  → only "verde" bars (score ≥ 7)
  // The selected bar always stays visible.
  const visibleBars = useMemo(() => {
    const { zoom: zoomLevel, box } = view;
    return bars.filter((bar) => {
      if (barKey(bar) === selectedKey) return true;
      if (box && !box.contains([bar.lat, bar.lng])) return false;
      if (zoomLevel >= 14) return true;
      const meta = scoreMeta(bar);
      if (!meta.hasReviews) return false;
      return zoomLevel >= 12 || meta.variant === 'verde';
    });
  }, [bars, view, selectedKey]);

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
      maxZoom={19}
      className="h-full w-full"
      scrollWheelZoom
      zoomControl={false}
    >
      {/* The basemap is light — the .leaflet-tile-pane filter in index.css
          turns it into the active theme's map (see --map-filter). */}
      <Basemap />
      <ResizeFix />
      <Recenter center={center} zoom={zoom} />
      <FlyTo pos={focus} />
      <ViewWatcher onView={setView} />

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
