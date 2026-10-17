import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import QrCode from './QrCode.jsx';
import DailyBars from './DailyBars.jsx';
import { statsApi } from '../services/api.js';
import { copyText } from '../utils/share.js';
import { useI18n } from '../i18n/index.js';

const PERIODS = [7, 30, 90];
const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '—');

// Statistiche del bar per il proprietario (e per l'admin). Le prime due cifre
// le vede ogni proprietario; il resto si sblocca col boost — il backend manda
// `advanced: null` finché non c'è, e qui al suo posto c'è l'invito a farlo.
// In fondo il QR e il link NFC da esporre nel locale: sono gli unici due
// indirizzi che contano come scansioni (?src=qr / ?src=nfc).
export default function BarStatsModal({ bar, canBoost, onBoost, onClose }) {
  const { t } = useI18n();
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [series, setSeries] = useState('scans');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setError('');
    statsApi
      .bar(bar.id, days)
      .then((s) => alive && setStats(s))
      .catch(() => alive && setError(t('stats.error')));
    return () => {
      alive = false;
    };
  }, [bar.id, days]);

  const qrUrl = `${window.location.origin}/bar/${bar.id}?src=qr`;
  const nfcUrl = `${window.location.origin}/bar/${bar.id}?src=nfc`;

  async function downloadQr() {
    const { default: QRCode } = await import('qrcode');
    const href = await QRCode.toDataURL(qrUrl, { width: 1024, margin: 2 });
    const a = document.createElement('a');
    a.href = href;
    a.download = `rabar-qr-${bar.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bar'}.png`;
    a.click();
  }

  async function copyNfc() {
    if (await copyText(nfcUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const adv = stats?.advanced;
  const scans = stats?.scans;

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bar-stats-title"
        className="glass-flat fade-in max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="funnel" size={20} className="text-ember-ink" />
          <h3 id="bar-stats-title" className="font-display text-lg font-bold text-ember-cream">
            {t('stats.title')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="ml-auto text-ember-muted hover:text-ember-cream"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-0.5 truncate text-sm text-ember-muted">{bar.name}</p>

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label={t('stats.period')}>
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`chip ${days === d ? 'chip-on' : ''}`}
            >
              {t('stats.lastDays', { n: d })}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-ember-danger">{error}</p>}

        {/* Base: per ogni proprietario. */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Tile
            label={t('stats.scanPeople')}
            value={scans?.people}
            hint={scans && t('stats.scanPeopleHint', { n: scans.total, qr: scans.qr, nfc: scans.nfc })}
          />
          <Tile
            label={t('stats.scanReviews')}
            value={stats?.scan_reviews}
            hint={stats && t('stats.scanReviewsHint', { p: pct(stats.scan_reviews, scans.people) })}
          />
        </div>

        {stats && !adv && (
          <div className="mt-4 rounded-card border border-ember-primary/40 bg-ember-primary/10 p-4">
            <h4 className="flex items-start gap-2 font-display text-base font-bold text-ember-cream">
              <Icon name="star" size={16} className="mt-0.5 text-ember-ink" /> {t('stats.lockedTitle')}
            </h4>
            <p className="mt-1 text-sm text-ember-muted">{t('stats.lockedBody')}</p>
            {canBoost && (
              <button type="button" onClick={onBoost} className="btn-primary mt-3 w-full py-2.5 text-sm">
                <Icon name="euro" size={15} /> {t('stats.lockedCta')}
              </button>
            )}
          </div>
        )}

        {adv && (
          <>
            <SectionTitle>
              {t('stats.advancedTitle')}
              {!stats.boosted && (
                <span className="ml-2 rounded bg-ember-line/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ember-muted">
                  {t('stats.staffView')}
                </span>
              )}
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <Tile
                label={t('stats.returning')}
                value={adv.returning.returning}
                hint={t('stats.returningHint', { total: adv.returning.weekend_visitors })}
              />
              <Tile label={t('stats.reviews')} value={adv.reviews} hint={t('stats.reviewsHint')} />
              <Tile
                label={t('stats.scans')}
                value={scans.total}
                hint={t('stats.scansHint', { qr: scans.qr, nfc: scans.nfc })}
              />
              <Tile
                label={t('stats.scanToSignup')}
                value={pct(adv.funnel.signups, adv.funnel.anonymous_scanners)}
                hint={t('stats.scanToSignupHint', { n: adv.funnel.signups, total: adv.funnel.anonymous_scanners })}
              />
              <Tile
                label={t('stats.signupToReview')}
                value={pct(adv.funnel.signup_reviews, adv.funnel.signups)}
                hint={t('stats.signupToReviewHint', { n: adv.funnel.signup_reviews, total: adv.funnel.signups })}
              />
              <Tile
                label={t('stats.views')}
                value={adv.views.total}
                hint={t('stats.viewsHint', { n: adv.views.people })}
              />
            </div>

            <SectionTitle>{t('stats.mapTitle')}</SectionTitle>
            <div className="card divide-y divide-ember-line/10 px-3">
              <Row label={t('stats.impressions')} value={adv.impressions} />
              <Row label={t('stats.pinTaps')} value={adv.views.map} />
              <Row label={t('stats.fromList')} value={adv.views.list} />
              <Row label={t('stats.fromSearch')} value={adv.views.search} />
              <Row label={t('stats.fromLink')} value={adv.views.link} />
              <Row label={t('stats.fromQrNfc')} value={adv.views.qr_nfc} />
              <Row label={t('stats.directions')} value={adv.actions.directions} />
              <Row label={t('stats.calls')} value={adv.actions.call} />
              <Row label={t('stats.website')} value={adv.actions.website} />
            </div>

            <SectionTitle>{t('stats.chartTitle')}</SectionTitle>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {['scans', 'views', 'reviews'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSeries(k)}
                  aria-pressed={series === k}
                  className={`chip ${series === k ? 'chip-on' : ''}`}
                >
                  {t(`stats.series.${k}`)}
                </button>
              ))}
            </div>
            <DailyBars
              data={adv.daily.map((d) => ({ day: d.day, value: d[series] }))}
              label={t(`stats.series.${series}`)}
            />
            <p className="mt-3 text-[11px] text-ember-muted">{t('stats.weekendNote')}</p>
          </>
        )}

        <SectionTitle>{t('stats.linksTitle')}</SectionTitle>
        <div className="flex gap-3">
          <QrCode value={qrUrl} alt={t('stats.qrAlt', { name: bar.name })} className="h-28 w-28 shrink-0 rounded-lg bg-white p-1" />
          <div className="min-w-0 space-y-2">
            <p className="text-xs text-ember-muted">{t('stats.linksBody')}</p>
            <button type="button" onClick={downloadQr} className="chip">
              <Icon name="arrow-right" size={14} className="rotate-90 text-ember-ink" /> {t('stats.downloadQr')}
            </button>
            <button type="button" onClick={copyNfc} className="chip">
              <Icon name={copied ? 'check' : 'link'} size={14} className="text-ember-ink" />
              {copied ? t('stats.copied') : t('stats.copyNfc')}
            </button>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-ember-muted">{t('stats.basicNote')}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h4 className="mb-2 mt-5 flex items-center text-xs font-semibold uppercase tracking-wide text-ember-muted">
      {children}
    </h4>
  );
}

function Tile({ label, value, hint }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-ember-muted">{label}</div>
      <div className="mt-0.5 font-display text-2xl font-bold tabular-nums text-ember-cream">{value ?? '…'}</div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-ember-muted">{hint}</div>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between py-2 text-sm">
      <span className="text-ember-muted">{label}</span>
      <span className="font-semibold tabular-nums text-ember-cream">{value}</span>
    </div>
  );
}
