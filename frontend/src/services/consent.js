// Ad consent, prior-blocking model (ePrivacy/GDPR + CPRA):
//   - no consent (null) or denied → the AdSense script is NEVER loaded, so no
//     ad requests and no ad cookies at all;
//   - granted → App loads the script (see adsense.js).
// The choice persists in localStorage; a window event lets App react without a
// reload. Settings can reset the choice to reopen the banner (withdrawing
// consent must be as easy as giving it).
const KEY = 'rabar_ad_consent'; // 'granted' | 'denied'
const EVENT = 'rabar-consent';

// CPRA: a Global Privacy Control signal is a binding opt-out of "sharing"
// personal data for targeted ads. Treat it as a standing "denied" that the
// banner/Settings cannot override — getConsent() short-circuits, so the banner
// never shows and a stored "granted" stops counting.
function gpcDenied() {
  return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
}

export function getConsent() {
  if (gpcDenied()) return 'denied';
  try {
    return localStorage.getItem(KEY); // null until the user chooses
  } catch {
    return null;
  }
}

export function hasChosen() {
  return getConsent() !== null;
}

// True → the ad script may load.
export function consentGranted() {
  return getConsent() === 'granted';
}

export function setConsent(granted) {
  const value = granted ? 'granted' : 'denied';
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage blocked — treat as session-only choice */
  }
  emit(value);
}

// Forget the choice and reopen the banner (Settings → "Preferenze cookie").
export function resetConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
  emit(null);
}

function emit(value) {
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
