import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import GoogleButton from '../components/GoogleButton.jsx';

export default function Login() {
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
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login fallito');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Accedi a rabar">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-ember-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-ember-primary py-2 font-semibold text-ember-bg disabled:opacity-50"
        >
          {busy ? 'Accesso…' : 'Accedi'}
        </button>
      </form>
      <GoogleButton />
      <p className="mt-4 text-center text-sm text-ember-muted">
        Non hai un account?{' '}
        <Link to="/register" className="text-ember-primary underline">
          Registrati
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, children }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-ember-bg p-4">
      <div className="w-full max-w-sm rounded-card border border-white/5 bg-ember-card p-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
          <Icon name="arrow-left" size={15} /> Mappa
        </Link>
        <div className="mb-5">
          <Logo size="sm" />
        </div>
        <h1 className="mb-4 font-display text-2xl font-bold text-ember-cream">{title}</h1>
        {children}
        <div className="mt-6 flex items-center justify-center gap-3 border-t border-white/5 pt-4 text-xs text-ember-muted">
          <Link to="/privacy" className="hover:text-ember-primary">Privacy</Link>
          <span className="text-white/15">·</span>
          <Link to="/tos" className="hover:text-ember-primary">Termini</Link>
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
        className="w-full rounded-lg bg-ember-bg p-2 text-ember-cream outline-none ring-ember-primary focus:ring-2"
      />
    </div>
  );
}
