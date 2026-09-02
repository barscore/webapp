import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import PlusBadge from '../components/PlusBadge.jsx';
import { plusApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useI18n } from '../i18n/index.js';

const euros = (cents) => `€${(cents / 100).toFixed(2).replace('.', ',')}`;

// Quante settimane/mesi stanno in un anno — serve solo a mostrare il risparmio
// del piano annuale rispetto agli altri due.
const PER_YEAR = { week: 52, month: 12, year: 1 };

// rabar+ — pagina di sottoscrizione. Il pagamento è Stripe Checkout in
// modalità abbonamento: si esce dall'app e si torna su /plus?success=1. Lo
// stato non arriva mai dal query param, ma dal backend (webhook firmato).
export default function Plus() {
  const { t, dateLocale } = useI18n();
  const { isAuthenticated, isPlus, refreshPlus } = useAuth();

  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState('month');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Tornati dal checkout: il webhook può arrivare qualche secondo dopo il
  // redirect, quindi si aspetta lo stato invece di dichiarare vittoria subito.
  const [justPaid, setJustPaid] = useState(
    () => new URLSearchParams(window.location.search).get('success') === '1',
  );

  useEffect(() => {
    plusApi.plans().then(setPlans).catch(() => setError(t('plus.errPlans')));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return setStatus(null);
    let stop = false;
    let tries = 0;
    const poll = () =>
      plusApi
        .status()
        .then((s) => {
          if (stop) return;
          setStatus(s);
          if (s.plus) {
            refreshPlus();
            setJustPaid(false);
          } else if (justPaid && ++tries < 10) {
            setTimeout(poll, 2000);
          }
        })
        .catch(() => {});
    poll();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, justPaid]);

  async function subscribe() {
    setBusy(true);
    setError('');
    try {
      window.location.assign(await plusApi.checkout(plan)); // Stripe Checkout
    } catch (err) {
      setError(err?.response?.data?.error || t('plus.errCheckout'));
      setBusy(false);
    }
  }

  async function manage() {
    setBusy(true);
    setError('');
    try {
      window.location.assign(await plusApi.portal()); // portale clienti Stripe
    } catch (err) {
      setError(err?.response?.data?.error || t('plus.errPortal'));
      setBusy(false);
    }
  }

  const yearly = plans.find((p) => p.plan === 'year');
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(dateLocale) : '');

  const PERKS = [
    { icon: 'plus', title: t('plus.perkBadge'), body: t('plus.perkBadgeBody') },
    { icon: 'star', title: t('plus.perkThemes'), body: t('plus.perkThemesBody') },
    { icon: 'check', title: t('plus.perkNoAds'), body: t('plus.perkNoAdsBody') },
  ];

  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
            <Icon name="arrow-left" size={15} /> {t('common.map')}
          </Link>
          <div className="mb-5">
            <Logo size="sm" />
          </div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ember-cream">
            rabar
            <PlusBadge plus size="lg" />
          </h1>
          <p className="mt-1 text-sm text-ember-muted">{t('plus.subtitle')}</p>
        </div>

        <ul className="space-y-2">
          {PERKS.map((p) => (
            <li key={p.title} className="card flex items-start gap-3 p-3">
              <Icon name={p.icon} size={18} className="mt-0.5 text-ember-ink" />
              <div>
                <p className="text-sm font-semibold text-ember-cream">{p.title}</p>
                <p className="text-xs text-ember-muted">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Abbonamento già attivo: niente listino, solo stato e portale. */}
        {isPlus || status?.plus ? (
          <section className="card space-y-3 p-4">
            <p className="flex items-center gap-2 font-display font-bold text-ember-cream">
              <Icon name="check" size={18} className="text-ember-good" />
              {t('plus.active')}
            </p>
            {status?.plus_until && (
              <p className="text-sm text-ember-muted">
                {status.subscription?.cancel_at_period_end
                  ? t('plus.endsOn', { date: fmtDate(status.plus_until) })
                  : t('plus.renews', { date: fmtDate(status.plus_until) })}
              </p>
            )}
            <button type="button" onClick={manage} disabled={busy} className="btn-primary w-full py-3">
              <Icon name={busy ? 'reload' : 'euro'} size={18} className={busy ? 'animate-spin' : ''} />
              {t('plus.manage')}
            </button>
          </section>
        ) : (
          <section className="space-y-3">
            {justPaid && (
              <p className="card p-3 text-sm text-ember-muted">
                <Icon name="reload" size={15} className="mr-1.5 animate-spin text-ember-ink" />
                {t('plus.pendingBody')}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {plans.map((p) => {
                const active = p.plan === plan;
                // Risparmio rispetto allo stesso importo pagato su base annua.
                const save =
                  yearly && p.plan !== 'year'
                    ? Math.round((1 - yearly.amount_cents / (p.amount_cents * PER_YEAR[p.plan])) * 100)
                    : 0;
                return (
                  <button
                    key={p.plan}
                    type="button"
                    onClick={() => setPlan(p.plan)}
                    aria-pressed={active}
                    className={`press flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                      active
                        ? 'border-ember-primary bg-ember-primary/10'
                        : 'border-ember-line/10 hover:border-ember-line/25'
                    }`}
                  >
                    <span
                      className={`font-display text-sm font-bold ${active ? 'text-ember-ink' : 'text-ember-cream'}`}
                    >
                      {t(`plus.plan.${p.plan}`)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-ember-cream">
                      {euros(p.amount_cents)}
                    </span>
                    {p.plan === 'year' && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ember-ink">
                        {t('plus.best')}
                      </span>
                    )}
                    {save > 0 && (
                      <span className="text-[10px] text-ember-muted">
                        {t('plus.vsYear', { n: save })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-sm text-ember-danger">{error}</p>}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={subscribe}
                disabled={busy || plans.length === 0}
                className="btn-primary w-full py-3"
              >
                <Icon name={busy ? 'reload' : 'plus'} size={18} className={busy ? 'animate-spin' : ''} />
                {busy ? t('auth.redirecting') : t('plus.subscribe')}
              </button>
            ) : (
              <Link to="/login" className="btn-primary flex w-full justify-center py-3">
                <Icon name="user" size={18} /> {t('plus.loginFirst')}
              </Link>
            )}

            <p className="text-center text-[11px] leading-relaxed text-ember-muted">
              {t('plus.legal')}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
