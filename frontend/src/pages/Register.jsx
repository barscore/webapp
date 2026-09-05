import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../services/supabase.js';
import { AuthShell, Field } from './Login.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { useI18n } from '../i18n/index.js';

// Account sign-up (email/password or Google). The username lands in user
// metadata; the DB trigger `handle_new_user` turns it into a profiles row.
export default function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Admin security switch: registrations can be closed from the admin panel.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('registration_open')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOpen(data.registration_open);
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!accepted) {
      setError(t('auth.mustAccept'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register(email, password, username);
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo') || '/';
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.error || t('auth.registerFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <AuthShell title={t('auth.regClosed')}>
        <p className="text-center text-sm text-ember-muted">{t('auth.regClosedMsg')}</p>
        <p className="mt-4 text-center text-sm text-ember-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-ember-ink underline">
            {t('common.login')}
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.createAccount')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('auth.username')} value={username} onChange={setUsername} />
        <Field label={t('auth.email')} type="email" value={email} onChange={setEmail} />
        <Field label={t('auth.passwordMin')} type="password" value={password} onChange={setPassword} />
        <label className="flex items-start gap-2 text-sm text-ember-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-ember-primary"
          />
          <span>
            {t('auth.accept1')}
            <Link to="/privacy" className="text-ember-ink underline">{t('common.privacy')}</Link>
            {t('auth.accept2')}
            <Link to="/tos" className="text-ember-ink underline">{t('common.tos')}</Link>
            {t('auth.accept3')}
          </span>
        </label>
        {error && <p className="text-sm text-ember-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy || !accepted}
          className="btn-primary w-full py-2"
        >
          {busy ? t('auth.creating') : t('auth.register')}
        </button>
      </form>
      <GoogleButton label={t('auth.googleRegister')} disabled={!accepted} />
      <p className="mt-4 text-center text-sm text-ember-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="text-ember-ink underline">
          {t('common.login')}
        </Link>
      </p>
    </AuthShell>
  );
}
