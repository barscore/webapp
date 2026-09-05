import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { useI18n } from '../i18n/index.js';

// Email/password sign-in + Google OAuth. Auth is Supabase end to end (no
// custom backend endpoint) — see hooks/useAuth.js.
export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo') || '/';
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.error || t('auth.loginFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t('auth.loginTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('auth.email')} type="email" value={email} onChange={setEmail} />
        <Field label={t('auth.password')} type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-ember-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full py-2"
        >
          {busy ? t('auth.signingIn') : t('common.login')}
        </button>
      </form>
      <GoogleButton />
      <p className="mt-4 text-center text-sm text-ember-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-ember-ink underline">
          {t('auth.register')}
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, children }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-full items-center justify-center bg-ember-bg p-4">
      <div className="glass-flat fade-in w-full max-w-sm rounded-sheet p-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
          <Icon name="arrow-left" size={15} /> {t('common.map')}
        </Link>
        <div className="mb-5">
          <Logo size="sm" />
        </div>
        <h1 className="mb-4 font-display text-2xl font-bold text-ember-cream">{title}</h1>
        {children}
        <div className="mt-6 flex items-center justify-center gap-3 border-t border-ember-line/5 pt-4 text-xs text-ember-muted">
          <Link to="/privacy" className="hover:text-ember-ink">{t('common.privacy')}</Link>
          <span className="text-ember-line/15">·</span>
          <Link to="/tos" className="hover:text-ember-ink">{t('common.terms')}</Link>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = 'text', value, onChange }) {
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
