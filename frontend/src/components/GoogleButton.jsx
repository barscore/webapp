import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

// "Continua con Google" — triggers Supabase OAuth redirect.
export default function GoogleButton({ label = 'Continua con Google', disabled = false }) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handle() {
    setBusy(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (e) {
      setError(e.message || 'Errore Google');
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="my-4 flex items-center gap-3 text-xs text-ember-muted">
        <span className="h-px flex-1 bg-ember-line/10" />
        oppure
        <span className="h-px flex-1 bg-ember-line/10" />
      </div>
      <button
        type="button"
        onClick={handle}
        disabled={busy || disabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-ember-line/10 bg-ember-cream py-2 font-medium text-ember-bg disabled:opacity-50"
      >
        <GoogleIcon />
        {busy ? 'Reindirizzamento…' : label}
      </button>
      {error && <p className="mt-2 text-sm text-ember-accent">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7C43.9 37.9 46.5 31.8 46.5 24.5z" />
      <path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.3-5.7c-2 1.4-4.6 2.2-7.7 2.2-6.4 0-11.8-3.7-13.7-9.8l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}
