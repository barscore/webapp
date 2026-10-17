// Google AdSense. Two layers, one script:
//   * Auto Ads — the loader alone is enough, Google picks the placements from
//     the dashboard;
//   * fixed display units — <ins data-ad-slot> rendered by AdSlot.jsx where we
//     want an ad for sure (bar list, bar detail, leaderboard).
// Both are skipped when no client id is configured, so an empty env var never
// fires a broken request. Consent is Google's job: the same script carries the
// certified consent message and waits for the answer before requesting any ad
// (see consent.js). App decides who gets the script at all.
export const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

// Ad unit ids from the AdSense dashboard (Annunci → Per unità pubblicitaria).
// An empty slot id renders nothing: the app works with none, some or all set.
export const SLOTS = {
  list: import.meta.env.VITE_ADSENSE_SLOT_LIST,
  bar: import.meta.env.VITE_ADSENSE_SLOT_BAR,
  board: import.meta.env.VITE_ADSENSE_SLOT_BOARD,
};

// Ogni unità vuole il SUO markup: una In-feed senza `data-ad-layout-key` e una
// In-article senza `data-ad-layout` non sono l'unità che hai creato, e Google
// non riempie il posto. Le chiavi le dà AdSense insieme allo slot id.
//   list  — In-feed, riga dentro l'elenco bar
//   bar   — In-article, in fondo alla scheda del bar
//   board — Display responsive, sotto il podio della classifica
export const AD_UNITS = {
  list: {
    'data-ad-format': 'fluid',
    'data-ad-layout-key': import.meta.env.VITE_ADSENSE_LAYOUT_KEY_LIST,
  },
  bar: {
    'data-ad-format': 'fluid',
    'data-ad-layout': 'in-article',
  },
  board: {
    'data-ad-format': 'auto',
    'data-full-width-responsive': 'true',
  },
};

// How many bar rows between two in-list ads.
export const LIST_AD_EVERY = 6;

// An id, not a data attribute: AdSense reads every data-* on its own tag as
// configuration and warns about the ones it does not know.
const SCRIPT_ID = 'rabar-adsense';

export function loadAdsense() {
  if (!CLIENT_ID || typeof document === 'undefined') return;
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
  document.head.appendChild(s);
}

/** True once loadAdsense() has put the script on this page. */
export function adsenseLoaded() {
  return typeof document !== 'undefined' && !!document.getElementById(SCRIPT_ID);
}
