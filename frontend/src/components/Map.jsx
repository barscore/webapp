import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { usePins } from '../utils/pins.js';
import { scoreMeta, barKey } from '../utils/score.js';

// Re-centers the map imperatively when center changes.
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center);
  }, [center, map]);
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

export default function Map({ bars = [], center, zoom = 14, userPos, selectedKey, focus, onSelect }) {
  const pins = usePins();

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
    return {
      verde: make(pins.verde),
      arancione: make(pins.arancione),
      grigio: make(pins.grigio),
      active: {
        verde: make(pins.verde, true),
        arancione: make(pins.arancione, true),
        grigio: make(pins.grigio, true),
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
      {/* Dark navy basemap (free CARTO tiles) — recolored to blue via CSS. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <Recenter center={center} />
      <FlyTo pos={focus} />

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
        bars.map((bar) => {
          const { variant } = scoreMeta(bar);
          const key = barKey(bar);
          const isActive = key === selectedKey;
          return (
            <Marker
              key={key}
              position={[bar.lat, bar.lng]}
              icon={isActive ? icons.active[variant] : icons[variant]}
              zIndexOffset={isActive ? 1000 : 0}
              eventHandlers={{ click: () => onSelect?.(bar) }}
            />
          );
        })}
    </MapContainer>
  );
}
