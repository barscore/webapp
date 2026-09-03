import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { boostsApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

const euros = (cents) => `€${(cents / 100).toFixed(2).replace('.', ',')}`;

// Scelta durata boost (+ raggio, per i bar) → redirect a Stripe Checkout.
// `target` è { event_id } oppure { bar_id }; `label` è il nome di ciò che si
// boostsa. Per i bar l'owner sceglie anche un raggio di visibilità 1..50 km:
// il bar comparirà in lista (e primo) per chi è entro quella distanza.
export default function BoostModal({ target, label, onClose }) {
  const { t } = useI18n();
  const isBar = !!target.bar_id;
  const [tiers, setTiers] = useState([]);
  const [radiusCfg, setRadiusCfg] = useState(null);
  const [tier, setTier] = useState('7d');
  const [radius, setRadius] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    boostsApi
      .tiers()
      .then(({ tiers, radius }) => {
        setTiers(tiers);
        setRadiusCfg(radius);
      })
      .catch(() => setError(t('boost.errPrices')));
  }, []);

  const selected = tiers.find((tr) => tr.tier === tier);

  const surcharge = useMemo(() => {
    if (!isBar || !radiusCfg || !selected) return 0;
    return Math.round(radiusCfg.cents_per_km_per_day * radius * selected.days);
  }, [isBar, radiusCfg, selected, radius]);

  const total = (selected?.amount_cents ?? 0) + surcharge;

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const url = await boostsApi.checkout({
        tier,
        ...target,
        ...(isBar ? { sponsor_radius_km: radius } : {}),
      });
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

        {isBar && radiusCfg && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <label htmlFor="boost-radius" className="text-sm font-semibold text-ember-cream">
                {t('boost.radiusLabel')}
              </label>
              <span className="font-display text-sm font-bold tabular-nums text-ember-ink">
                {t('boost.radiusValue', { n: radius })}
              </span>
            </div>
            <input
              id="boost-radius"
              type="range"
              min={radiusCfg.min_km}
              max={radiusCfg.max_km}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full accent-ember-primary"
            />
            <p className="mt-1 text-[11px] text-ember-muted">{t('boost.radiusHint')}</p>
          </div>
        )}

        {selected && (
          <div className="mt-4 flex items-baseline justify-between border-t border-ember-line/10 pt-3">
            <span className="text-sm text-ember-muted">{t('boost.total')}</span>
            <span className="font-display text-xl font-bold tabular-nums text-ember-cream">
              {euros(total)}
            </span>
          </div>
        )}

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
