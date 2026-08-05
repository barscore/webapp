// Google AdSense Auto Ads: the loader script alone is enough — Google decides
// placement from the dashboard config, no manual <ins> slots needed. Skipped
// when no client id is configured, so an empty env var never fires a broken
// request. Prior-blocking: App calls this ONLY after the user grants consent
// (see consent.js) — the script, its ad requests and its cookies simply never
// exist for users who declined or haven't chosen yet.
const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

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
