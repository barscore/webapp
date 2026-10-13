// Ad consent. It is collected by Google's own consent message (AdSense →
// Privacy & messaging → European regulations), not by a banner of ours:
//   - in the EEA/UK/CH Google serves personalised ads only to traffic coming
//     from a CMP it has certified against the IAB TCF, and a home-made banner
//     is not one — it also produced a second prompt on top of Google's;
//   - the message ships inside adsbygoogle.js, so the script has to load for
//     the user to be asked at all. It holds every ad request until the choice
//     is made and stores it in its own first-party cookies (FCCDCF/FCNEC).
// What stays ours: the opt-outs that must work before any Google code runs
// (rabar+ in App, GPC here) and the way back to the message from Settings.

// The banner we used to show kept its answer here. Nothing reads it any more.
try {
  localStorage.removeItem('rabar_ad_consent');
} catch {
  /* storage blocked */
}

// CPRA: a Global Privacy Control signal is a binding opt-out of "sharing"
// personal data for targeted ads. We honour it the strict way — the ad script
// is never loaded, so there is nothing to personalise and no message to show.
export function gpcOptOut() {
  return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
}

// Reopens Google's consent message so the choice can be changed or withdrawn
// (GDPR art. 7(3): withdrawing must be as easy as giving). Returns false when
// there is no message to reopen — the ad script is not in the page (rabar+,
// GPC, an ad blocker) or has not finished loading yet.
export function openConsentMessage() {
  const fc = typeof window !== 'undefined' ? window.googlefc : null;
  if (typeof fc?.showRevocationMessage !== 'function') return false;
  // The queue is the only supported way to call into googlefc.
  (fc.callbackQueue = fc.callbackQueue || []).push(fc.showRevocationMessage);
  return true;
}
