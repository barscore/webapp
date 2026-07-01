import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { AuthShell, Field } from './Login.jsx';
import GoogleButton from '../components/GoogleButton.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
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

  return (
    <AuthShell title="Crea account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password (min 8)" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-ember-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-ember-primary py-2 font-semibold text-ember-bg disabled:opacity-50"
        >
          {busy ? 'Creazione…' : 'Registrati'}
        </button>
      </form>
      <GoogleButton label="Registrati con Google" />
      <p className="mt-4 text-center text-sm text-ember-muted">
        Hai già un account?{' '}
        <Link to="/login" className="text-ember-primary underline">
          Accedi
        </Link>
      </p>
    </AuthShell>
  );
}
