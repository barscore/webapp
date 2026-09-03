import { useEffect, useRef, useState } from 'react';
import { AD_UNITS, CLIENT_ID, SLOTS } from '../services/adsense.js';
import { consentGranted, onConsentChange } from '../services/consent.js';
import { useAuth } from '../hooks/useAuth.js';

// One fixed AdSense unit. Renders nothing at all — no <ins>, no reserved space
// — unless a client id AND that slot id are configured and the user granted ad
// consent, so the layout of a consent-less page is untouched.
// `name` picks the unit from SLOTS/AD_UNITS ('list' | 'bar' | 'board'); each
// carries the attributes its own unit type needs (In-feed / In-article /
// Display), because the wrong ones leave the placement empty.
// rabar+ subscribers never see a unit — that's half of what they pay for.
export default function AdSlot({ name, className = '' }) {
  const slot = SLOTS[name];
  const unit = AD_UNITS[name];
  const { isPlus } = useAuth();
  const [granted, setGranted] = useState(consentGranted);
  const ref = useRef(null);

  useEffect(() => onConsentChange(() => setGranted(consentGranted())), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !granted || !CLIENT_ID || !slot || isPlus) return;
    // adsbygoogle stamps data-adsbygoogle-status on an <ins> it has filled;
    // pushing the same element twice (StrictMode double-mount) throws.
    if (el.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocker or script not loaded — the slot just stays empty */
    }
  }, [granted, slot, isPlus]);

  if (isPlus || !granted || !CLIENT_ID || !slot || !unit) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle ${className}`}
      // In-article arriva centrato dallo snippet di AdSense; le altre due no.
      style={{ display: 'block', ...(name === 'bar' ? { textAlign: 'center' } : null) }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slot}
      {...unit}
    />
  );
}
