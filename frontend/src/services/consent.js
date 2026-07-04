// Ad consent (ePrivacy + GDPR + Garante). Ads ALWAYS show — consent only
// decides personalized vs non-personalized (NPA). GDPR forbids *profiling*
// cookies without consent, not advertising itself: Google AdSense serves NPA to
// non-consented users, so revenue is preserved (lower, not zero). The choice
// persists in localStorage; a window event lets adsense.js react without reload.
const KEY = 'rabar_ad_consent'; // 'granted' (personalized) | 'denied' (NPA)
const EVENT = 'rabar-consent';

export function getConsent() {
  try {
    return localStorage.getItem(KEY); // null until the user chooses → treated as NPA
  } catch {
    return null;
  }
}

export function hasChosen() {
  return getConsent() !== null;
}

// True → personalized ads allowed. Null/denied → non-personalized only.
export function personalizedAds() {
  return getConsent() === 'granted';
}

export function setConsent(granted) {
  const value = granted ? 'granted' : 'denied';
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage blocked — treat as session-only NPA */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
  }
}

export function onConsentChange(cb) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => cb(e.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
