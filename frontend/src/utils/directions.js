// Directions deep-links. The user picks Google or Apple Maps once (first tap on
// the "Indicazioni" chip); the choice persists in localStorage and is editable
// in Settings. Android users never see the choice — they always get Google Maps.

const KEY = 'rabar-maps';
export const PROVIDERS = ['google', 'apple'];

export function isAndroid() {
  return /android/i.test(navigator.userAgent || '');
}

export function getProvider() {
  try {
    const p = localStorage.getItem(KEY);
    return PROVIDERS.includes(p) ? p : null;
  } catch {
    return null;
  }
}

export function setProvider(p) {
  if (!PROVIDERS.includes(p)) return;
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* private mode: choice just won't persist */
  }
}

// Destination for the directions URL: coordinates when present, else the
// address string as a fallback so the link still resolves.
function destination(bar) {
  if (bar?.lat != null && bar?.lng != null) return `${bar.lat},${bar.lng}`;
  return [bar?.address, bar?.city].filter(Boolean).join(', ') || null;
}

export function hasDestination(bar) {
  return destination(bar) != null;
}

// Universal web URLs — both deep-link to the native app on mobile.
export function mapsUrl(provider, bar) {
  const dest = destination(bar);
  if (!dest) return null;
  const q = encodeURIComponent(dest);
  return provider === 'apple'
    ? `https://maps.apple.com/?daddr=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
