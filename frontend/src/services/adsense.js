// Google AdSense. Two layers, one script:
//   * Auto Ads — the loader alone is enough, Google picks the placements from
//     the dashboard;
//   * fixed display units — <ins data-ad-slot> rendered by AdSlot.jsx where we
//     want an ad for sure (bar list, bar detail, leaderboard).
// Both are skipped when no client id is configured, so an empty env var never
// fires a broken request. Prior-blocking: App calls loadAdsense() ONLY after
// the user grants consent (see consent.js) — the script, its ad requests and
// its cookies simply never exist for users who declined or haven't chosen yet.
export const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

// Ad unit ids from the AdSense dashboard (Annunci → Per unità pubblicitaria).
// An empty slot id renders nothing: the app works with none, some or all set.
export const SLOTS = {
  list: import.meta.env.VITE_ADSENSE_SLOT_LIST,
  bar: import.meta.env.VITE_ADSENSE_SLOT_BAR,
  board: import.meta.env.VITE_ADSENSE_SLOT_BOARD,
};

// How many bar rows between two in-list ads.
export const LIST_AD_EVERY = 6;

export function loadAdsense() {
  if (!CLIENT_ID || typeof document === 'undefined') return;
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = 'true';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
  document.head.appendChild(s);
}

// The script can't be un-executed once in the page; dropping ads after a
// consent revoke needs a reload (App handles that).
export function adsenseLoaded() {
  return typeof document !== 'undefined' && !!document.querySelector('script[data-adsense]');
}
