import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { meApi } from '../services/api.js';
import Logo from './Logo.jsx';
import { useI18n } from '../i18n/index.js';

// Ferma un account che non ha mai accettato Privacy e Termini né dichiarato la
// maggiore età. Succede a chi entra con Google dalla pagina di login: quel
// primo accesso crea l'account senza passare dalla spunta di Register.
// Non si chiude cliccando fuori e non ha una «x»: le uscite sono accettare,
// uscire dall'account o cancellarlo — chi rifiuta non deve restare con un
// profilo aperto a suo nome che non può più raggiungere.
export default function TermsGate() {
  const { t } = useI18n();
  const { acceptTerms, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [delConfirm, setDelConfirm] = useState(false);

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await acceptTerms();
    } catch {
      setError(t('terms.failed'));
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setError('');
    try {
      await meApi.deleteAccount();
      await logout();
    } catch (err) {
      setError(err.response?.data?.error || t('settings.deleteFailed'));
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-title"
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/60 p-4 backdrop-blur-[3px] sm:items-center"
    >
      <div className="glass-flat fade-in w-full max-w-md space-y-4 rounded-sheet p-5">
        <Logo size="sm" />
        <div>
          <h2 id="terms-gate-title" className="font-display text-lg font-bold text-ember-cream">
            {t('terms.title')}
          </h2>
          <p className="mt-1 text-sm text-ember-muted">{t('terms.text')}</p>
        </div>

        {/* I link aprono un'altra scheda: questa finestra copre l'app, e i due
            documenti vanno letti prima di accettarli. */}
        <label className="flex items-start gap-2 text-sm text-ember-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-ember-primary"
          />
          <span>
            {t('auth.accept1')}
            <a href="/privacy" target="_blank" rel="noopener" className="text-ember-ink underline">
              {t('common.privacy')}
            </a>
            {t('auth.accept2')}
            <a href="/tos" target="_blank" rel="noopener" className="text-ember-ink underline">
              {t('common.tos')}
            </a>
            {t('auth.accept3')}
          </span>
        </label>

        {error && <p className="text-sm text-ember-danger">{error}</p>}

        <button
          type="button"
          onClick={confirm}
          disabled={busy || !accepted}
          className="btn-primary w-full py-2"
        >
          {t('terms.continue')}
        </button>

        {!delConfirm ? (
          <div className="flex items-center justify-center gap-3 text-sm text-ember-muted">
            <button type="button" onClick={logout} disabled={busy} className="hover:text-ember-cream">
              {t('common.logout')}
            </button>
            <span className="text-ember-line/15">·</span>
            <button
              type="button"
              onClick={() => setDelConfirm(true)}
              disabled={busy}
              className="hover:text-ember-danger"
            >
              {t('settings.deleteTitle')}
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-card border border-ember-danger/40 p-3">
            <p className="text-sm text-ember-muted">{t('settings.deleteWarning')}</p>
            <p className="text-sm font-semibold text-ember-cream">{t('settings.sure')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDelConfirm(false)}
                disabled={busy}
                className="flex-1 rounded-lg border border-ember-line/10 py-2 font-semibold text-ember-cream disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={busy}
                className="btn flex-1 bg-ember-accent py-2 text-black"
              >
                {busy ? t('settings.deleting') : t('settings.confirmDelete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
