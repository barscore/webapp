import { useState } from 'react';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.js';
import { isAndroid, getProvider, setProvider, mapsUrl, hasDestination } from '../utils/directions.js';

// "Indicazioni" chip shared by BarDetail and BarSheet. First tap (non-Android)
// asks which maps app to use, remembers it, then opens; later taps open the
// saved app directly. Android always uses Google Maps with no prompt.
export default function DirectionsButton({ bar }) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  if (!hasDestination(bar)) return null;

  function open(provider) {
    const url = mapsUrl(provider, bar);
    if (url) window.open(url, '_blank', 'noopener');
  }

  function onClick() {
    if (isAndroid()) return open('google');
    const saved = getProvider();
    if (saved) return open(saved);
    setAsking(true);
  }

  function pick(provider) {
    setProvider(provider);
    setAsking(false);
    open(provider);
  }

  return (
    <>
      <button onClick={onClick} className="chip">
        <Icon name="locate" size={15} className="text-ember-ink" /> {t('bar.directions')}
      </button>

      {asking && (
        <div
          className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center"
          onClick={() => setAsking(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-flat fade-in w-full max-w-xs rounded-sheet p-5"
          >
            <div className="flex items-center gap-2">
              <Icon name="locate" size={20} className="text-ember-ink" />
              <h3 className="font-display text-lg font-bold text-ember-cream">{t('directions.choose')}</h3>
              <button
                type="button"
                onClick={() => setAsking(false)}
                aria-label={t('common.close')}
                className="ml-auto text-ember-muted hover:text-ember-cream"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => pick('google')}
                className="rounded-lg border border-ember-line/10 p-3 text-sm font-semibold text-ember-cream transition-colors hover:border-ember-primary/60"
              >
                Google Maps
              </button>
              <button
                type="button"
                onClick={() => pick('apple')}
                className="rounded-lg border border-ember-line/10 p-3 text-sm font-semibold text-ember-cream transition-colors hover:border-ember-primary/60"
              >
                Apple Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
