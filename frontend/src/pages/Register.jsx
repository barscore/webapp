import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../services/supabase.js';
import { AuthShell, Field } from './Login.jsx';
import GoogleButton from '../components/GoogleButton.jsx';

// Account sign-up (email/password or Google). The username lands in user
// metadata; the DB trigger `handle_new_user` turns it into a profiles row.
export default function Register() {
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
      setError('Devi accettare Privacy e Termini e confermare di avere almeno 18 anni.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register(email, password, username);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registrazione fallita');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <AuthShell title="Registrazioni chiuse">
        <p className="text-center text-sm text-ember-muted">
          La creazione di nuovi account è momentaneamente disabilitata. Riprova più tardi.
        </p>
        <p className="mt-4 text-center text-sm text-ember-muted">
          Hai già un account?{' '}
          <Link to="/login" className="text-ember-primary underline">
            Accedi
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crea account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password (min 8)" type="password" value={password} onChange={setPassword} />
        <label className="flex items-start gap-2 text-sm text-ember-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-ember-primary"
          />
          <span>
            Ho almeno 18 anni e accetto la{' '}
            <Link to="/privacy" className="text-ember-primary underline">Privacy</Link> e i{' '}
            <Link to="/tos" className="text-ember-primary underline">Termini di servizio</Link>.
          </span>
        </label>
        {error && <p className="text-sm text-ember-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy || !accepted}
          className="w-full rounded-lg bg-ember-primary py-2 font-semibold text-ember-bg disabled:opacity-50"
        >
          {busy ? 'Creazione…' : 'Registrati'}
        </button>
      </form>
      <GoogleButton label="Registrati con Google" disabled={!accepted} />
      <p className="mt-4 text-center text-sm text-ember-muted">
        Hai già un account?{' '}
        <Link to="/login" className="text-ember-primary underline">
          Accedi
        </Link>
      </p>
    </AuthShell>
  );
}
