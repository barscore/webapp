import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

// Inject the AdSense loader once, only when a client id is configured. Keeps the
// script out of index.html so an empty env var never fires a broken request.
function ensureAdsenseLoaded() {
  if (!CLIENT_ID || typeof document === 'undefined') return;
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = 'true';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
  document.head.appendChild(s);
}

// Reusable AdSense slot. Pass a `slot` id from your AdSense dashboard.
export default function AdBanner({ slot = '0000000000', className = '' }) {
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current || !CLIENT_ID) return;
    try {
      ensureAdsenseLoaded();
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      ref.current = true;
    } catch {
      /* AdSense not loaded (e.g. blocked) — fail silently */
    }
  }, []);

  if (!CLIENT_ID) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-800/50 py-6 text-xs text-slate-500 ${className}`}
      >
        Spazio pubblicitario (configura VITE_ADSENSE_CLIENT_ID)
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block' }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
