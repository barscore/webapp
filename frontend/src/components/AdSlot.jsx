import { useEffect, useRef, useState } from 'react';
import { AD_UNITS, CLIENT_ID, SLOTS } from '../services/adsense.js';
import { gpcOptOut } from '../services/consent.js';
import { useAuth } from '../hooks/useAuth.js';
import { useMonetization } from '../services/monetization.js';

// One fixed AdSense unit. Renders nothing at all unless a client id AND that
// slot id are configured. Consent is not checked here: Google's script asks
// for it and holds the request until the user answers (see consent.js).
// `name` picks the unit from SLOTS/AD_UNITS ('list' | 'bar' | 'board'); each
// carries the attributes its own unit type needs (In-feed / In-article /
// Display), because the wrong ones leave the placement empty.
// rabar+ subscribers never see a unit — that's half of what they pay for.
// Nobody does while monetization is switched off (admin panel → Emergenza).
//
// The <ins> is mounted only once its place is actually on screen. It is not
// just lazy loading: adsbygoogle.push({}) does not take an element, it fills
// the FIRST unprocessed <ins> in the document. Home renders its list twice
// (desktop panel + mobile sheet, one of them display:none), so pushing for
// every slot handed half the requests to hidden copies with no width —
// "Fluid responsive ads must be at least 250px wide: availableWidth=0" — and
// left the visible ones empty. A hidden holder never intersects, so its <ins>
// never exists.
export default function AdSlot({ name, className = '' }) {
  const slot = SLOTS[name];
  const unit = AD_UNITS[name];
  const { isPlus, profileReady } = useAuth();
  const monetization = useMonetization();
  const enabled = profileReady && !isPlus && monetization && !!CLIENT_ID && !!slot && !!unit && !gpcOptOut();
  const holder = useRef(null);
  const ins = useRef(null);
  const pushedFor = useRef(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = holder.current;
    if (!enabled || onScreen || !el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setOnScreen(true);
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, onScreen]);

  useEffect(() => {
    const el = ins.current;
    // One push per <ins>: a second one (StrictMode re-runs effects) would be
    // spent on some other slot, or throw when there is none left.
    if (!el || pushedFor.current === el || el.dataset.adsbygoogleStatus) return;
    pushedFor.current = el;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocker or script not loaded — the slot just stays empty */
    }
  }, [enabled, onScreen]);

  if (!enabled) return null;

  return (
    <div ref={holder}>
      {onScreen && (
        <ins
          ref={ins}
          className={`adsbygoogle ${className}`}
          // In-article arriva centrato dallo snippet di AdSense; le altre due no.
          style={{ display: 'block', ...(name === 'bar' ? { textAlign: 'center' } : null) }}
          data-ad-client={CLIENT_ID}
          data-ad-slot={slot}
          {...unit}
        />
      )}
    </div>
  );
}
