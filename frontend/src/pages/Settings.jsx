import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useTheme } from '../hooks/useTheme.js';
import { useGraphics } from '../hooks/useGraphics.js';
import { supabase } from '../services/supabase.js';
import { meApi, organizerApi } from '../services/api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import PlusBadge from '../components/PlusBadge.jsx';
import Toast from '../components/Toast.jsx';
import OrganizerRequestForm from '../components/OrganizerRequestForm.jsx';
import { LanguageSection } from '../components/LanguagePicker.jsx';
import { pushSupported, getPushSubscription, enablePush, disablePush } from '../services/push.js';
import { getConsent, resetConsent, onConsentChange } from '../services/consent.js';
import { isAndroid, getProvider, setProvider } from '../utils/directions.js';
import { useI18n } from '../i18n/index.js';

// Group label — same typographic voice as the Home sheet section headers, so
// Impostazioni reads as part of the same system.
function GroupLabel({ icon, children }) {
  return (
    <h2 className="flex items-center gap-2 px-1 pt-2 font-display text-xs font-extrabold uppercase tracking-[0.12em] text-ember-muted">
      <Icon name={icon} size={14} className="text-ember-ink" />
      {children}
    </h2>
  );
}

// Selectable option tile shared by theme / graphics / maps pickers, so the
// three sections stop drifting apart visually.
function OptionTile({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`press rounded-lg border p-3 text-left transition-colors ${
        active
          ? 'border-ember-primary bg-ember-primary/10'
          : 'border-ember-line/10 hover:border-ember-line/25'
      } ${className}`}
    >
      {children}
    </button>
  );
}

// Account settings: read-only account details + credential changes (email /
// password) via supabase-js. Credential updates never go through the backend.
export default function Settings() {
  const { t, dateLocale } = useI18n();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);

  const [email, setEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailErr, setEmailErr] = useState('');

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState('');

  const [delConfirm, setDelConfirm] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    meApi
      .profile()
      .then((p) => {
        setProfile(p);
        setEmail(p.email || '');
      })
      .catch(() => setToast({ msg: t('settings.errLoad'), icon: 'info' }));
  }, [isAuthenticated]);

  async function changeEmail(e) {
    e.preventDefault();
    setEmailBusy(true);
    setEmailErr('');
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setToast({ msg: t('settings.checkEmail'), icon: 'check' });
    } catch (err) {
      setEmailErr(err.message || t('settings.updateErr'));
    } finally {
      setEmailBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (password.length < 6) return setPwErr(t('settings.pwMin'));
    if (password !== password2) return setPwErr(t('settings.pwMismatch'));
    setPwBusy(true);
    setPwErr('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setPassword2('');
      setToast({ msg: t('settings.pwUpdated'), icon: 'check' });
    } catch (err) {
      setPwErr(err.message || t('settings.updateErr'));
    } finally {
      setPwBusy(false);
    }
  }

  async function deleteAccount() {
    setDelBusy(true);
    setDelErr('');
    try {
      await meApi.deleteAccount();
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      setDelErr(err.response?.data?.error || t('settings.deleteFailed'));
      setDelBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
            <Icon name="arrow-left" size={15} /> {t('common.map')}
          </Link>
          <div className="mb-5">
            <Logo size="sm" />
          </div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ember-cream">
            <Icon name="filters" size={22} className="text-ember-ink" /> {t('settings.title')}
          </h1>
        </div>

        {/* ---- Profilo ---- */}
        <GroupLabel icon="user">{t('settings.groupProfile')}</GroupLabel>
        <section className="card p-4">
          <dl className="space-y-2.5 text-sm">
            <Detail icon="user" label={t('settings.username')} value={profile ? `@${profile.username}` : '…'} />
            <Detail icon="link" label={t('settings.email')} value={profile?.email || '…'} />
            <Detail
              icon="review"
              label={t('settings.ratings')}
              value={profile ? String(profile.ratings_count) : '…'}
            />
            <Detail
              icon="info"
              label={t('settings.since')}
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString(dateLocale) : '…'}
            />
          </dl>
        </section>

        {/* ---- Preferenze ---- */}
        <GroupLabel icon="filters">{t('settings.groupPrefs')}</GroupLabel>
        <PlusSection />
        <ThemeSection />
        <GraphicsSection />
        <LanguageSection />
        {/* Maps app for directions — hidden on Android (always Google Maps) */}
        {!isAndroid() && <MapsSection />}
        {/* Notifiche push — opt-in esplicito, mai prompt a freddo */}
        <PushSection />

        {/* ---- Organizzatore ---- */}
        <GroupLabel icon="event">{t('settings.groupOrganizer')}</GroupLabel>
        <OrganizerSection />

        {/* ---- Privacy ---- */}
        <GroupLabel icon="info">{t('settings.groupPrivacy')}</GroupLabel>
        {/* Ad-consent management — GDPR: withdrawing must be as easy as giving */}
        <CookieSection />
        <section className="card flex items-center justify-center gap-3 p-3.5 text-sm text-ember-muted">
          <Link to="/privacy" className="hover:text-ember-ink">{t('common.privacy')}</Link>
          <span className="text-ember-line/15">·</span>
          <Link to="/tos" className="hover:text-ember-ink">{t('common.terms')}</Link>
          <span className="text-ember-line/15">·</span>
          <Link to="/riconoscimenti" className="hover:text-ember-ink">{t('common.credits')}</Link>
        </section>

        {/* ---- Sicurezza ---- */}
        <GroupLabel icon="check">{t('settings.groupSecurity')}</GroupLabel>
        <form onSubmit={changeEmail} className="card space-y-3 p-4">
          <h3 className="font-display font-bold text-ember-cream">{t('settings.changeEmail')}</h3>
          <SettingsField label={t('settings.newEmail')} type="email" value={email} onChange={setEmail} />
          {emailErr && <p className="text-sm text-ember-danger">{emailErr}</p>}
          <button type="submit" disabled={emailBusy} className="btn-primary w-full py-2">
            {emailBusy ? t('common.saving') : t('settings.updateEmail')}
          </button>
        </form>

        <form onSubmit={changePassword} className="card space-y-3 p-4">
          <h3 className="font-display font-bold text-ember-cream">{t('settings.changePw')}</h3>
          <SettingsField label={t('settings.newPw')} type="password" value={password} onChange={setPassword} />
          <SettingsField label={t('settings.confirmPw')} type="password" value={password2} onChange={setPassword2} />
          {pwErr && <p className="text-sm text-ember-danger">{pwErr}</p>}
          <button type="submit" disabled={pwBusy} className="btn-primary w-full py-2">
            {pwBusy ? t('common.saving') : t('settings.updatePw')}
          </button>
        </form>

        {/* Danger zone — GDPR art. 17 self-service erasure */}
        <section className="space-y-3 rounded-card border border-ember-danger/40 bg-ember-card p-4">
          <h3 className="font-display font-bold text-ember-danger">{t('settings.deleteTitle')}</h3>
          <p className="text-sm text-ember-muted">{t('settings.deleteWarning')}</p>
          {delErr && <p className="text-sm text-ember-danger">{delErr}</p>}
          {!delConfirm ? (
            <button
              type="button"
              onClick={() => setDelConfirm(true)}
              className="w-full rounded-lg border border-ember-danger py-2 font-semibold text-ember-danger"
            >
              {t('settings.deleteTitle')}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ember-cream">{t('settings.sure')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDelConfirm(false)}
                  disabled={delBusy}
                  className="flex-1 rounded-lg border border-ember-line/10 py-2 font-semibold text-ember-cream disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={delBusy}
                  className="btn flex-1 bg-ember-accent py-2 text-black"
                >
                  {delBusy ? t('settings.deleting') : t('settings.confirmDelete')}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}

// Portale clienti Stripe, pagina di accesso pubblica: si entra con l'email
// dell'abbonamento e Stripe manda un link di verifica. È l'alternativa senza
// backend a POST /plus/portal, che dalla pagina /plus apre lo stesso portale
// con un click solo. Sta qui perché è la via che funziona anche da un altro
// dispositivo, o quando l'account dell'app e quello del pagamento non
// coincidono. URL fisso dell'account: pubblico, non è un segreto.
const STRIPE_PORTAL_LOGIN_URL = 'https://billing.stripe.com/p/login/9B6cMYgEw3LH1zBe0t1ck00';

// Riquadro rabar+: stato dell'abbonamento e ingresso alla pagina /plus.
function PlusSection() {
  const { t } = useI18n();
  const { isPlus } = useAuth();
  return (
    <>
      <Link to="/plus" className="press card flex items-center gap-3 p-4">
        <PlusBadge plus size="md" />
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-ember-cream">rabar+</span>
          <span className="block text-xs text-ember-muted">
            {isPlus ? t('plus.settingsActive') : t('plus.settingsPitch')}
          </span>
        </span>
        <Icon name="arrow-right" size={15} className="shrink-0 text-ember-muted" />
      </Link>

      {/* Solo a chi ha davvero un abbonamento: senza, il portale risponde che
          non c'è niente da gestire. */}
      {isPlus && (
        <a
          href={STRIPE_PORTAL_LOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="press card flex items-center gap-3 p-4"
        >
          <Icon name="euro" size={18} className="shrink-0 text-ember-ink" />
          <span className="min-w-0 flex-1">
            <span className="block font-display font-bold text-ember-cream">
              {t('plus.portalTitle')}
            </span>
            <span className="block text-xs text-ember-muted">{t('plus.portalBody')}</span>
          </span>
          <Icon name="link" size={15} className="shrink-0 text-ember-muted" />
        </a>
      )}
    </>
  );
}

function ThemeSection() {
  const { t } = useI18n();
  const { theme, setTheme, themes } = useTheme();
  const { isPlus } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-ember-cream">
        {t('settings.theme')}
        {!isPlus && (
          <span className="text-[11px] font-semibold normal-case text-ember-muted">
            {t('plus.themesLocked')}
          </span>
        )}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((th) => {
          const active = th.id === theme;
          // Palette bloccata: il tocco porta alla pagina rabar+ invece di
          // applicare un tema che l'utente non ha.
          const locked = th.plus && !isPlus;
          return (
            <OptionTile
              key={th.id}
              active={active}
              onClick={() => (locked ? navigate('/plus') : setTheme(th.id))}
              className="relative flex flex-col items-center gap-2"
            >
              {locked && (
                <PlusBadge plus className="absolute right-1.5 top-1.5 opacity-80" />
              )}
              <span className={`flex -space-x-1.5 ${locked ? 'opacity-45' : ''}`}>
                {th.swatch.map((c) => (
                  <span
                    key={c}
                    className="h-5 w-5 rounded-full border border-ember-line/20"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-ember-ink' : 'text-ember-cream'}`}>
                {th.label}
              </span>
            </OptionTile>
          );
        })}
      </div>
    </section>
  );
}

// Graphics quality: "simple" (default) turns off blur, the map filter and all
// animations for old / low-end devices; "rich" restores the full look.
function GraphicsSection() {
  const { t } = useI18n();
  const { graphics, setGraphics } = useGraphics();
  const options = [
    { id: 'simple', label: t('settings.gSimple'), hint: t('settings.gSimpleHint') },
    { id: 'rich', label: t('settings.gRich'), hint: t('settings.gRichHint') },
  ];
  return (
    <section className="card p-4">
      <h3 className="mb-3 font-display font-bold text-ember-cream">{t('settings.graphics')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = o.id === graphics;
          return (
            <OptionTile key={o.id} active={active} onClick={() => setGraphics(o.id)} className="flex flex-col gap-1">
              <span className={`text-sm font-semibold ${active ? 'text-ember-ink' : 'text-ember-cream'}`}>
                {o.label}
              </span>
              <span className="text-xs text-ember-muted">{o.hint}</span>
            </OptionTile>
          );
        })}
      </div>
    </section>
  );
}

// Maps-app preference for the "Indicazioni" button. Saved in localStorage
// (shared with DirectionsButton via utils/directions.js). Not shown on Android.
function MapsSection() {
  const { t } = useI18n();
  const [provider, setP] = useState(getProvider);
  const options = [
    { id: 'google', label: 'Google Maps' },
    { id: 'apple', label: 'Apple Maps' },
  ];
  function choose(id) {
    setProvider(id);
    setP(id);
  }
  return (
    <section className="card p-4">
      <h3 className="mb-1 font-display font-bold text-ember-cream">{t('settings.maps')}</h3>
      <p className="mb-3 text-sm text-ember-muted">{t('settings.mapsHint')}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = o.id === provider;
          return (
            <OptionTile key={o.id} active={active} onClick={() => choose(o.id)} className="text-center">
              <span className={`text-sm font-semibold ${active ? 'text-ember-ink' : 'text-ember-cream'}`}>
                {o.label}
              </span>
            </OptionTile>
          );
        })}
      </div>
    </section>
  );
}

// Current ad-consent state + a reset that reopens the global CookieBanner so
// the user can pick again (a revoke after ads loaded triggers a reload in App).
function CookieSection() {
  const { t } = useI18n();
  const [choice, setChoice] = useState(getConsent);
  useEffect(() => onConsentChange(() => setChoice(getConsent())), []);
  const label =
    choice === 'granted'
      ? t('settings.cookieGranted')
      : choice === 'denied'
        ? t('settings.cookieDenied')
        : t('settings.cookieNone');
  return (
    <section className="card space-y-3 p-4">
      <h3 className="font-display font-bold text-ember-cream">{t('settings.cookie')}</h3>
      <p className="text-sm text-ember-muted">{label}</p>
      <button
        type="button"
        onClick={resetConsent}
        className="w-full rounded-lg border border-ember-line/10 py-2 font-semibold text-ember-cream"
      >
        {t('settings.cookieChange')}
      </button>
    </section>
  );
}

// Toggle Web Push: chiede il permesso browser solo qui, registra/rimuove la
// subscription sul backend. Nascosto se il browser non supporta il push.
function PushSection() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getPushSubscription().then((s) => setEnabled(!!s)).catch(() => {});
  }, []);

  if (!pushSupported()) return null;

  async function toggle() {
    setBusy(true);
    setErr('');
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        await enablePush();
        setEnabled(true);
      }
    } catch (e) {
      setErr(e?.message || t('settings.pushErr'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <h3 className="mb-1 font-display font-bold text-ember-cream">{t('settings.push')}</h3>
      <p className="mb-3 text-sm text-ember-muted">{t('settings.pushHint')}</p>
      {err && <p className="mb-2 text-sm text-ember-danger">{err}</p>}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={enabled}
        className={`w-full rounded-lg border py-2 font-semibold transition-colors ${
          enabled
            ? 'border-ember-primary bg-ember-primary/10 text-ember-ink'
            : 'border-ember-line/10 text-ember-cream'
        }`}
      >
        {busy ? t('settings.pushWait') : enabled ? t('settings.pushOn') : t('settings.pushOff')}
      </button>
    </section>
  );
}

// Stato richiesta organizzatore + form 3 domande. Un organizer approvato vede
// la conferma; una richiesta pendente lo stato; un rifiuto la nota + retry.
function OrganizerSection() {
  const { t, dateLocale } = useI18n();
  const { user } = useAuth();
  const role = user?.role;
  const [req, setReq] = useState(undefined); // undefined = loading
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    organizerApi
      .myRequest()
      .then(setReq)
      .catch(() => setReq(null));
  }, []);

  if (role === 'organizer') {
    return (
      <section className="card p-4">
        <h3 className="mb-1 font-display font-bold text-ember-cream">{t('org.verifiedTitle')}</h3>
        <p className="text-sm text-ember-muted">{t('org.verifiedBody')}</p>
      </section>
    );
  }
  if (req === undefined) return null;

  return (
    <section className="card p-4">
      <h3 className="mb-1 font-display font-bold text-ember-cream">{t('org.becomeTitle')}</h3>

      {req?.status === 'pending' && (
        <p className="text-sm text-ember-muted">
          {t('org.pending', { date: new Date(req.created_at).toLocaleDateString(dateLocale) })}
        </p>
      )}

      {req?.status === 'rejected' && !showForm && (
        <div className="space-y-3">
          <p className="text-sm text-ember-muted">
            {t('org.rejected')}
            {req.admin_note ? `: "${req.admin_note}"` : '.'}
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full rounded-lg border border-ember-line/10 py-2 font-semibold text-ember-cream"
          >
            {t('org.retry')}
          </button>
        </div>
      )}

      {(req === null || req?.status === 'approved' || showForm) && (
        <>
          <p className="mb-4 text-sm text-ember-muted">{t('org.intro')}</p>
          <OrganizerRequestForm
            onDone={(r) => {
              setReq(r);
              setShowForm(false);
            }}
          />
        </>
      )}
    </section>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-ember-muted">
        <Icon name={icon} size={15} className="text-ember-ink" />
        {label}
      </dt>
      <dd className="truncate text-ember-cream">{value}</dd>
    </div>
  );
}

function SettingsField({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-ember-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="field py-2"
      />
    </div>
  );
}
