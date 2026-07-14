import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hasChosen, setConsent, onConsentChange } from '../services/consent.js';

// Cookie consent banner. Shows until the user accepts or rejects advertising
// cookies — nothing ad-related loads before "Accetta" (prior-blocking, see
// adsense.js). Reappears when Settings resets the choice.
export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !hasChosen());
  useEffect(() => onConsentChange(() => setVisible(!hasChosen())), []);
  if (!visible) return null;

  function choose(granted) {
    setConsent(granted);
    setVisible(false);
  }

  return (
    <div className="glass fixed inset-x-0 bottom-0 z-[1000] rounded-none border-x-0 border-b-0 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-ember-muted">
          Usiamo solo cookie tecnici. Con il tuo consenso carichiamo la pubblicità di
          Google (con i relativi cookie); se rifiuti, nessun annuncio e nessun cookie
          pubblicitario. Puoi cambiare idea da Impostazioni. Vedi la{' '}
          <Link to="/privacy" className="text-ember-ink underline">Privacy</Link>.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="flex-1 whitespace-nowrap rounded-lg border border-ember-line/10 px-4 py-2 text-sm font-semibold text-ember-cream sm:flex-none"
          >
            Rifiuta
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="btn-primary flex-1 whitespace-nowrap px-4 py-2 text-sm sm:flex-none"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
