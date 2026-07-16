import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { boostsApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

const euros = (cents) => `€${(cents / 100).toFixed(2).replace('.', ',')}`;

// Scelta durata boost → redirect a Stripe Checkout. `target` è
// { event_id } oppure { bar_id }; `label` è il nome di ciò che si booststa.
export default function BoostModal({ target, label, onClose }) {
  const { t } = useI18n();
  const [tiers, setTiers] = useState([]);
  const [tier, setTier] = useState('7d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    boostsApi
      .tiers()
      .then(setTiers)
      .catch(() => setError(t('boost.errPrices')));
  }, []);

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const url = await boostsApi.checkout({ tier, ...target });
      window.location.assign(url); // Stripe Checkout
    } catch (err) {
      setError(err?.response?.data?.error || t('boost.errCheckout'));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in w-full max-w-md rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="euro" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">{t('ot.boost')}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="ml-auto text-ember-muted hover:text-ember-cream"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          "{label}" — {t('boost.intro')} <b>{t('ev.sponsored')}</b>.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {tiers.map((tr) => {
            const active = tr.tier === tier;
            return (
              <button
                key={tr.tier}
                type="button"
                onClick={() => setTier(tr.tier)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                  active
                    ? 'border-ember-primary bg-ember-primary/10'
                    : 'border-ember-line/10 hover:border-ember-line/25'
                }`}
              >
                <span className={`font-display text-lg font-bold ${active ? 'text-ember-ink' : 'text-ember-cream'}`}>
                  {tr.days}{t('boost.daysShort')}
                </span>
                <span className="text-xs font-semibold tabular-nums text-ember-muted">
                  {euros(tr.amount_cents)}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button
          type="button"
          onClick={checkout}
          disabled={busy || tiers.length === 0}
          className="btn-primary mt-4 w-full py-3"
        >
          <Icon name={busy ? 'reload' : 'euro'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? t('auth.redirecting') : t('boost.pay')}
        </button>
        <p className="mt-2 text-center text-[11px] text-ember-muted">{t('boost.secure')}</p>
      </div>
    </div>
  );
}
