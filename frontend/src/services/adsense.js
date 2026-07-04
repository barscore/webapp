import { personalizedAds } from './consent.js';

// Google AdSense Auto Ads: the loader script alone is enough — Google decides
// placement from the dashboard config, no manual <ins> slots needed. We inject
// it once, globally (see App), so ads can appear on every route. Skipped when no
// client id is configured, so an empty env var never fires a broken request.
const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

export function loadAdsense() {
  if (!CLIENT_ID || typeof document === 'undefined') return;
  // No consent (null) or denied → non-personalized ads (GDPR-safe, still shown,
  // still paid). Must be set before the loader runs. Granted → personalized.
  const ads = (window.adsbygoogle = window.adsbygoogle || []);
  if (!personalizedAds()) ads.requestNonPersonalizedAds = 1;
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = 'true';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
  document.head.appendChild(s);
}
