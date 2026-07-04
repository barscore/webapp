import { useState } from 'react';
import { Link } from 'react-router-dom';
import { hasChosen, setConsent } from '../services/consent.js';

// Cookie consent banner. Shows once until the user accepts or rejects
// advertising cookies. AdSense loads globally; consent only toggles NPA (see adsense.js).
export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !hasChosen());
  if (!visible) return null;

  function choose(granted) {
    setConsent(granted);
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] border-t border-white/10 bg-ember-card/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-ember-muted">
          Usiamo cookie tecnici e mostriamo pubblicità di Google. Con il tuo consenso gli
          annunci sono personalizzati; altrimenti restano non personalizzati. Vedi la{' '}
          <Link to="/privacy" className="text-ember-primary underline">Privacy</Link>.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="flex-1 whitespace-nowrap rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-ember-cream sm:flex-none"
          >
            Rifiuta
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="flex-1 whitespace-nowrap rounded-lg bg-ember-primary px-4 py-2 text-sm font-semibold text-ember-bg sm:flex-none"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
