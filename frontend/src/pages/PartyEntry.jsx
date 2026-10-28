import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { organizerApi } from '../services/api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';

export default function PartyEntry() {
  const [searchParams] = useSearchParams();
  // `pass`: firmato e a scadenza (backend lib/entryPass.js). `user_id` è il QR
  // permanente di prima: non vale più, l'utente deve aggiornare l'app.
  const pass = searchParams.get('pass');
  const legacy = !pass && !!searchParams.get('user_id');
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate, pass]);

  if (!pass) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-ember-bg p-4 text-center">
        <h1 className="font-display text-2xl font-bold text-ember-danger">Errore</h1>
        <p className="mt-2 text-ember-muted">
          {legacy
            ? "QR non più valido: chiedi all'utente di aggiornare l'app e rimostrarlo."
            : 'Pass di ingresso mancante.'}
        </p>
      </div>
    );
  }

  if (loading || !isAuthenticated) return null;

  async function handleVerify() {
    setBusy(true);
    setError(null);
    try {
      const res = await organizerApi.verifyPartyEntry(pass);
      setSuccess(true);
      setTargetUser(res.user);
    } catch (err) {
      setError(err.response?.data?.error || "Errore durante la verifica dell'ingresso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ember-bg p-4">
      <div className="w-full max-w-sm rounded-2xl bg-ember-card p-6 shadow-xl text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>
        
        {success ? (
          <>
            <div className="relative mx-auto mb-4 w-fit">
              <Avatar url={targetUser?.avatar_url} size={96} className="mx-auto" />
              <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white">
                <Icon name="check" size={20} />
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Ingresso Valido!</h2>
            <p className="mt-2 text-sm text-ember-muted">L'utente <strong className="text-ember-cream">@{targetUser?.username}</strong> è autorizzato all'ingresso.</p>
            <p className="mt-1 text-xs text-ember-muted">Controlla che la foto corrisponda a chi hai davanti.</p>
            <button onClick={() => navigate('/')} className="mt-6 btn-primary w-full py-2">
              Torna alla mappa
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ember-primary/20 text-ember-primary">
              <Icon name="event" size={32} />
            </div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Verifica Ingresso</h2>
            <p className="mt-2 text-sm text-ember-muted">
              Stai per verificare il pass di ingresso per un utente. Assicurati che non abbia ban o sospensioni attive.
            </p>
            
            {error && (
              <div className="mt-4 rounded bg-ember-danger/10 p-3">
                <p className="text-sm font-semibold text-ember-danger">{error}</p>
              </div>
            )}
            
            <button 
              onClick={handleVerify} 
              disabled={busy}
              className="mt-6 btn-primary w-full py-3 text-lg font-bold"
            >
              {busy ? 'Verifica in corso...' : 'Verifica Ora'}
            </button>
            <button onClick={() => navigate('/')} className="mt-3 w-full py-2 text-sm text-ember-muted hover:text-ember-cream">
              Annulla
            </button>
          </>
        )}
      </div>
    </div>
  );
}
